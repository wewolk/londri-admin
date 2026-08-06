'use client';
import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { branchesApi, dashboardApi } from '@/lib/api';
import { fetchOrdersInPeriod, computeStats, periodFromPreset, PERIOD_LABEL } from '@/lib/reports';
import type { PeriodPreset, Period, ReportStats } from '@/lib/reports';
import type { ClosingReport } from '@/lib/types';
import { exportCsv, exportXlsx, type Sheet } from '@/lib/export';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import { STATUS_LABEL, PAYMENT_LABEL } from '@/lib/labels';
import PageHeader from '@/components/page-header';
import ClosingCard from '@/components/closing-card';
import { useTheme } from '@/lib/theme';
import { toast } from '@/hooks/useToast';
import {
  TrendUp, Receipt, Wallet, Users, ChartBar, DownloadSimple,
  FileCsv, FileXls, FilePdf, X, Funnel, Info, ArrowsClockwise, UserCircle, WarningCircle,
} from '@phosphor-icons/react';

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });

const PRESETS: PeriodPreset[] = ['today', '7d', '30d', 'month', 'custom'];

const CLOSING_KEY = 'londri_last_closing';

function fileStamp(p: Period) {
  return p.from === p.to ? p.from : `${p.from}_${p.to}`;
}

// Bangun sheet-sheet untuk ekspor multi-tab (dipakai XLSX; CSV pakai sheet ringkasan+transaksi digabung).
function buildSheets(s: ReportStats, closing?: ClosingReport): Sheet[] {
  const num = (v: string | number | null | undefined) => Number(v ?? 0);
  const ringkasan: Sheet = {
    name: 'Ringkasan',
    columns: ['Metrik', 'Nilai'],
    rows: [
      ['Periode', `${s.period.from} s/d ${s.period.to}`],
      ...(closing ? [
        ['— CLOSING —', ''],
        ['Nilai nota', num(closing.summary.newOrderValue)],
        ['Belum dibayar', num(closing.summary.outstanding)],
        ['Dibayar saldo member', num(closing.membershipUsed.amount)],
        ['Seharusnya diterima', num(closing.summary.newOrderValue) - num(closing.summary.outstanding) - num(closing.membershipUsed.amount)],
        ['Tercatat diterima', num(closing.reconciliation.paidOnNewOrders)],
        ['Selisih', num(closing.reconciliation.difference)],
        ['Status closing', closing.reconciliation.isBalanced ? 'COCOK' : 'SELISIH'],
        ['— UANG MASUK —', ''],
        ...closing.cashIn.byMethod.map((m) => [m.method, num(m.amount)] as (string | number)[]),
        ['Pelunasan nota lama', num(closing.cashIn.fromPreviousOrders)],
        ['Total kas masuk', num(closing.cashIn.total)],
        ['— NOTA —', ''],
      ] as (string | number)[][] : []),
      ['Total Order', s.totalOrders],
      ['Order Selesai', s.completedOrders],
      ['Order Dibatalkan', s.cancelledOrders],
      ['Total Diskon', s.totalDiscount],
      ['Pelanggan Unik', s.uniqueCustomers],
      ['Tingkat Penyelesaian (%)', Math.round(s.completionRate * 100)],
    ],
  };
  const perStatus: Sheet = {
    name: 'Per Status',
    columns: ['Status', 'Jumlah Order', 'Revenue'],
    rows: s.byStatus.map((b) => [b.label, b.count, b.revenue]),
  };
  const perPayment: Sheet = {
    name: 'Per Pembayaran',
    columns: ['Metode', 'Jumlah Order', 'Revenue'],
    rows: s.byPayment.map((b) => [b.label, b.count, b.revenue]),
  };
  const perCashier: Sheet = {
    name: 'Per Kasir',
    columns: ['Kasir', 'Jumlah Order', 'Revenue'],
    rows: s.byCashier.map((b) => [b.label, b.count, b.revenue]),
  };
  const perBranch: Sheet = {
    name: 'Per Cabang',
    columns: ['Cabang', 'Jumlah Order', 'Revenue'],
    rows: s.byBranch.map((b) => [b.label, b.count, b.revenue]),
  };
  const transaksi: Sheet = {
    name: 'Transaksi',
    columns: ['Invoice', 'Tanggal', 'Pelanggan', 'Telepon', 'Cabang', 'Kasir', 'Metode', 'Status', 'Subtotal', 'Diskon', 'Total'],
    rows: s.orders.map((o) => [
      o.invoiceNumber,
      formatTanggal(o.createdAt, true),
      o.customerName,
      o.phoneNumber,
      o.branch?.name ?? '',
      o.staff?.fullName ?? '',
      PAYMENT_LABEL[o.paymentMethod],
      STATUS_LABEL[o.status],
      Number(o.subtotal || 0),
      Number(o.discountAmount || 0),
      Number(o.totalAmount || 0),
    ]),
  };
  return [ringkasan, perStatus, perPayment, perCashier, perBranch, transaksi];
}

export default function ReportsPage() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const queryClient = useQueryClient();
  // Closing adalah workflow harian, jadi halaman dibuka langsung ke hari ini.
  const [preset, setPreset] = useState<PeriodPreset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [lastClosedAt, setLastClosedAt] = useState<string | null>(null);

  const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => branchesApi.list({ limit: 100 }) });

  const period: Period = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
    }
    return periodFromPreset(preset === 'custom' ? '30d' : preset);
  }, [preset, customFrom, customTo]);

  const customIncomplete = preset === 'custom' && (!customFrom || !customTo);
  // Stempel closing terpisah per tanggal/rentang + cabang. Tanpa scope ini,
  // closing cabang A bisa keliru terlihat sebagai closing cabang B.
  const closingStorageKey = `${CLOSING_KEY}:${period.from}:${period.to}:${branchId || 'all'}`;
  useEffect(() => {
    setLastClosedAt(localStorage.getItem(closingStorageKey));
  }, [closingStorageKey]);

  // Label periode untuk judul kartu closing. Huruf kecil karena diletakkan
  // setelah kata "Closing" (mis. "Closing hari ini" / "Closing 6 Agu 2026").
  const periodLabel = useMemo(() => {
    if (preset === 'today') return 'hari ini';
    if (period.from === period.to) return formatTanggal(period.from);
    return `${formatTanggal(period.from)} – ${formatTanggal(period.to)}`;
  }, [preset, period.from, period.to]);

  const statsQuery = useQuery({
    queryKey: ['report', period.from, period.to, branchId],
    queryFn: async () => {
      const orders = await fetchOrdersInPeriod(period, { branchId: branchId || undefined });
      return computeStats(orders, period);
    },
    enabled: !customIncomplete,
    // Sinkronisasi nota <-> laporan: data cepat dianggap basi + auto refresh berkala.
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const s = statsQuery.data;

  /* Angka uang (kas masuk, piutang, rekonsiliasi) diambil dari backend yang
     menghitungnya di PostgreSQL memakai amountPaid. Ini sengaja TIDAK dihitung
     ulang dari daftar order, karena totalAmount hanya mewakili nilai nota —
     bukan uang yang benar-benar diterima. */
  const closingQuery = useQuery({
    queryKey: ['report-closing', period.from, period.to, branchId],
    queryFn: () => dashboardApi.closingReport({
      dateFrom: period.from,
      dateTo: period.to,
      branchId: branchId || undefined,
    }),
    enabled: !customIncomplete,
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const closing = closingQuery.data;

  // "Sehari penuh" (00:00–23:59) dianggap satu hari kerja closing,
  // terlepas dari preset yang membuatnya.
  const isClosingFullDay = period.from === period.to;

  // Nilai periode ikut periode yang valid: tanggal+cabang+saldo stempel.
  // Ini mencegah pengguna mengira closing "hari ini" berlaku juga untuk cabang lain.
  const closingStampKey = `${CLOSING_KEY}|${period.from}|${period.to}|${branchId || 'all'}`;

  // Baca stempel closing untuk periode yang sedang dilihat.
  useEffect(() => {
    setLastClosedAt(localStorage.getItem(closingStampKey));
  }, [closingStampKey]);

  /* Recharts butuh nilai hex, tidak bisa memakai class Tailwind — jadi token
     dari tailwind.config.ts direplikasi manual di sini. */
  const tickColor = isDark ? '#bec8d2' : '#3e4850';        // outline-variant / on-surface-variant
  const gridColor = isDark ? '#3e4850' : '#f2f3ff';        // surface-container-low
  const tooltipStyle = { backgroundColor: isDark ? '#2a3040' : '#ffffff', border: `1px solid ${isDark ? '#3e4850' : '#e2e8f0'}`, borderRadius: 12, fontSize: 12 };
  const tooltipLabelStyle = { color: isDark ? '#eef0ff' : '#151b2b', fontWeight: 600 };

  const chartData = useMemo(() => {
    if (!s) return [];
    return s.byDay.map((d) => ({ name: d.date.slice(5), revenue: d.revenue }));
  }, [s]);

  /* Closing: buang cache order + laporan lalu tarik ulang, sehingga angka laporan
     dijamin memakai status nota terbaru (SELESAI/DIAMBIL yang baru saja diubah kasir). */
  async function doClosingSync() {
    const now = new Date().toISOString();
    try {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['report'] });
      await queryClient.invalidateQueries({ queryKey: ['report-closing'] });
      await Promise.all([statsQuery.refetch(), closingQuery.refetch()]);
      localStorage.setItem(closingStorageKey, now);
      setLastClosedAt(now);
      toast.success('Data laporan & nota tersinkron');
    } catch {
      toast.error('Gagal menyinkronkan data');
    }
  }

  function doExport(kind: 'csv' | 'xlsx' | 'pdf') {
    setExportOpen(false);
    if (!s) return;
    const stamp = fileStamp(s.period);
    try {
      if (kind === 'pdf') {
        window.print();
        return;
      }
      const sheets = buildSheets(s, closing);
      if (kind === 'xlsx') {
        exportXlsx(sheets, `laporan-londri-${stamp}`).then(() => toast.success('Excel diunduh')).catch(() => toast.error('Gagal ekspor Excel'));
        return;
      }
      // CSV: gabung ringkasan + transaksi jadi satu file (CSV tidak mendukung multi-sheet).
      const summary = sheets[0];
      const tx = sheets[sheets.length - 1];
      const combined: Sheet = {
        name: 'laporan',
        columns: tx.columns,
        rows: [
          [summary.columns[0], summary.columns[1]],
          ...summary.rows.map((r) => [r[0], r[1]] as (string | number)[]),
          [],
          tx.columns,
          ...tx.rows,
        ],
      };
      exportCsv(combined, `laporan-londri-${stamp}`);
      toast.success('CSV diunduh');
    } catch {
      toast.error('Gagal mengekspor');
    }
  }

  /* KPI memakai angka uang dari backend bila tersedia. "Uang Masuk" lebih
     jujur daripada "Total Revenue", yang dulu menjumlahkan nilai nota termasuk
     yang belum dibayar. */
  const kpis = s ? [
    closing
      ? { label: 'Uang Masuk', value: formatRupiah(Number(closing.cashIn.total)), Icon: Wallet, color: 'bg-primary-container text-on-primary-container' }
      : { label: 'Nilai Nota', value: formatRupiah(s.totalRevenue), Icon: TrendUp, color: 'bg-primary-container text-on-primary-container' },
    { label: 'Total Order', value: String(s.totalOrders), Icon: Receipt, color: 'bg-primary-container text-on-primary-container' },
    closing
      ? { label: 'belum dibayar', value: formatRupiah(Number(closing.summary.outstanding)), Icon: WarningCircle, color: Number(closing.summary.outstanding) > 0 ? 'bg-error-container text-on-error-container' : 'bg-primary-container text-on-primary-container' }
      : { label: 'Rata-rata Order', value: formatRupiah(s.avgOrderValue), Icon: Wallet, color: 'bg-primary-container text-on-primary-container' },
    { label: 'Pelanggan Unik', value: String(s.uniqueCustomers), Icon: Users, color: 'bg-primary-container text-on-primary-container' },
  ] : [];

  return (
    <>
      <PageHeader title="Laporan" right={
        <div className="flex items-center gap-2 print:hidden">
          <button onClick={doClosingSync} disabled={statsQuery.isFetching} aria-label="Sinkronkan data closing"
            className="flex min-h-[40px] items-center gap-1.5 rounded-md border border-border-subtle dark:border-outline-variant/25 px-3 font-body-md text-body-md font-semibold text-on-surface-variant dark:text-outline-variant transition-colors active:bg-surface-container dark:active:bg-white/10 disabled:opacity-40">
            <ArrowsClockwise size={18} weight="bold" className={statsQuery.isFetching ? 'animate-spin' : undefined} />
            {statsQuery.isFetching ? 'Sinkron…' : 'Closing'}
          </button>
          <div className="relative">
            <button onClick={() => setExportOpen((v) => !v)} disabled={!s || !s.totalOrders}
              className="flex min-h-[40px] items-center gap-1.5 rounded-md bg-primary px-3 font-body-md text-body-md font-semibold text-on-primary transition-colors active:bg-on-primary-container disabled:opacity-40">
              <DownloadSimple size={18} weight="bold" /> Ekspor
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="glass-strong absolute right-0 top-[46px] z-50 w-44 overflow-hidden rounded-md border border-border-subtle dark:border-outline-variant/25 shadow-card-hover">
                  <button onClick={() => doExport('csv')} className="flex w-full items-center gap-2.5 px-md py-3 font-body-md text-body-md active:bg-surface-container-low dark:active:bg-white/5">
                    <FileCsv size={18} className="text-success" /> CSV
                  </button>
                  <button onClick={() => doExport('xlsx')} className="flex w-full items-center gap-2.5 px-md py-3 font-body-md text-body-md active:bg-surface-container-low dark:active:bg-white/5">
                    <FileXls size={18} className="text-on-success-container" /> Excel (.xlsx)
                  </button>
                  <button onClick={() => doExport('pdf')} className="flex w-full items-center gap-2.5 px-md py-3 font-body-md text-body-md active:bg-surface-container-low dark:active:bg-white/5">
                    <FilePdf size={18} className="text-error" /> PDF / Cetak
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      } />

      <div className="space-y-5 p-4">
        {/* Filter periode */}
        <div className="print:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setPreset(p)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${preset === p ? 'bg-primary text-on-primary' : 'glass text-on-surface-variant dark:text-outline-variant'}`}>
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">Dari</span>
                <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)}
                  className="neuo-inset w-full min-h-[42px] rounded-md px-3 font-body-md text-body-md outline-none" />
              </label>
              <label className="block">
                <span className="mb-1 block font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">Sampai</span>
                <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)}
                  className="neuo-inset w-full min-h-[42px] rounded-md px-3 font-body-md text-body-md outline-none" />
              </label>
            </div>
          )}
          {/* Filter cabang */}
          <div className="mt-2 flex items-center gap-2">
            <Funnel size={16} className="shrink-0 text-outline dark:text-outline-variant" aria-hidden="true" />
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
              className="neuo-inset min-h-[42px] flex-1 rounded-md px-3 font-body-md text-body-md outline-none">
              <option value="">Semua cabang</option>
              {(branches?.items || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {branchId && (
              <button onClick={() => setBranchId('')} aria-label="Reset cabang"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-outline dark:text-outline-variant active:bg-surface-container dark:active:bg-white/10">
                <X size={16} weight="bold" />
              </button>
            )}
          </div>
          {/* Status sinkronisasi closing */}
          <p className="mt-2 px-1 font-label-md text-label-md text-outline dark:text-outline-variant">
            {statsQuery.isFetching
              ? 'Menyinkronkan data nota…'
              : lastClosedAt
                ? `Terakhir closing: ${new Date(lastClosedAt).toLocaleString('id-ID')}`
                : 'Belum pernah closing di perangkat ini'}
          </p>
        </div>

        {/* Judul cetak (hanya muncul saat print) */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">Laporan Londri POS</h1>
          <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">
            Periode {period.from} s/d {period.to}
            {branchId && branches?.items && ` — ${branches.items.find((b) => b.id === branchId)?.name ?? ''}`}
          </p>
        </div>

        {customIncomplete ? (
          <p className="py-16 text-center font-body-md text-body-md text-outline dark:text-outline-variant">Pilih tanggal dari &amp; sampai untuk menampilkan laporan.</p>
        ) : statsQuery.isLoading ? (
          <p className="py-16 text-center font-body-md text-body-md text-outline dark:text-outline-variant">Memuat data laporan…</p>
        ) : statsQuery.isError ? (
          <p role="alert" className="py-16 text-center font-body-md text-body-md text-error">Gagal memuat laporan. Coba lagi.</p>
        ) : s ? (
          <>
            {/* Closing: jembatan nota -> uang. Ditempatkan paling atas karena
                inilah yang dibuka pegawai saat menutup kasir. */}
            {closing && <ClosingCard report={closing} dateLabel={periodLabel} />}

            {/* Rekap per kasir: tiap kasir punya status cocok/selisih sendiri
                agar selisih bisa ditelusuri ke orangnya, bukan hanya total. */}
            {closing && closing.byCashier.length > 0 && (
              <section className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-md shadow-card">
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <UserCircle size={18} weight="duotone" className="text-primary dark:text-inverse-primary" />
                  Setoran per kasir
                </h2>
                <div className="space-y-2.5">
                  {closing.byCashier.map((c) => (
                    <div key={c.staffId} className="flex items-center justify-between gap-3 border-b border-dashed border-border-subtle dark:border-outline-variant/25 pb-2.5 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate font-body-md text-body-md font-semibold">{c.fullName}</p>
                        <p className="font-label-md text-label-md text-outline dark:text-outline-variant">
                          {c.orderCount} nota
                          {Number(c.outstanding) > 0 && ` · belum dibayar ${formatRupiah(Number(c.outstanding))}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular-nums font-data-tabular font-bold">{formatRupiah(Number(c.cashIn))}</p>
                        <p className={`font-label-md text-label-md ${c.isBalanced ? 'text-success' : 'text-error'}`}>
                          {c.isBalanced ? 'Cocok' : 'Selisih'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {s.totalOrders === 0 && Number(closing?.cashIn.total || 0) === 0 ? (
              <p className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass py-6 text-center font-body-md text-body-md text-outline dark:text-outline-variant">
                Tidak ada transaksi pada periode ini.
              </p>
            ) : (
              <>
                {/* KPI */}
                <div className="grid grid-cols-2 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-3.5 shadow-card">
                  <div className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${k.color}`}><k.Icon size={16} weight="duotone" /></div>
                  <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{k.label}</p>
                  <p className="mt-0.5 truncate text-base font-bold tabular-nums">{k.value}</p>
                </div>
              ))}
            </div>
            <p className="-mt-2 flex items-center gap-1.5 px-1 font-label-md text-label-md text-outline dark:text-outline-variant">
              <Info size={13} weight="duotone" className="shrink-0" />
              Revenue dihitung dari order berstatus <b className="font-semibold">Selesai</b>. Order yang masih diproses belum terhitung.
            </p>

            {/* Tren revenue harian */}
            <section className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-md shadow-card">
              <h2 className="mb-4 flex items-center gap-2 font-semibold"><ChartBar size={18} weight="duotone" className="text-primary dark:text-inverse-primary" /> Revenue harian</h2>
              {chartData.some((d) => d.revenue > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={gridColor} />
                    <XAxis dataKey="name" fontSize={10} tick={{ fill: tickColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis hide />
                    <Tooltip formatter={(v) => formatRupiah(Number(v))} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ fill: isDark ? '#3e4850' : '#f2f3ff' }} />
                    <Bar dataKey="revenue" fill="#006591" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-10 text-center font-body-md text-body-md text-outline dark:text-outline-variant">Belum ada revenue pada periode ini</p>}
            </section>

            {/* Breakdown metode pembayaran */}
            <BreakdownCard title="Per metode pembayaran" rows={s.byPayment} total={s.totalRevenue} />
            {/* Breakdown status */}
            <BreakdownCard title="Per status order" rows={s.byStatus} total={s.totalOrders} mode="count" />
            {/* Breakdown kasir */}
            <BreakdownCard title="Per kasir" rows={s.byCashier} total={s.totalRevenue} limit={5} />

            {/* Tabel transaksi */}
            <section className="glass overflow-hidden rounded-xl border border-border-subtle dark:border-outline-variant/20 shadow-card">
              <h2 className="card-head px-md py-3 font-headline-md text-headline-md">
                Transaksi <span className="font-label-md text-label-md font-normal text-outline dark:text-outline-variant">({s.orders.length})</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">
                      <th className="px-4 py-2 font-medium">Invoice</th>
                      <th className="px-4 py-2 font-medium">Pelanggan</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.orders.slice(0, 50).map((o) => (
                      <tr key={o.id} className="border-t border-border-subtle dark:border-outline-variant/20">
                        <td className="px-4 py-2.5 font-mono text-xs">{o.invoiceNumber}</td>
                        <td className="px-4 py-2.5"><span className="block max-w-[120px] truncate">{o.customerName}</span></td>
                        <td className="px-md py-2.5 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{STATUS_LABEL[o.status]}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(o.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {s.orders.length > 50 && (
                  <p className="px-md py-3 text-center font-label-md text-label-md text-outline dark:text-outline-variant">
                    Menampilkan 50 dari {s.orders.length} transaksi. Ekspor untuk data lengkap.
                  </p>
                )}
              </div>
            </section>
              </>
            )}
          </>
        ) : null}
      </div>
    </>
  );
}

function BreakdownCard({ title, rows, total, mode = 'revenue', limit }: {
  title: string;
  rows: { key: string; label: string; count: number; revenue: number }[];
  total: number;
  mode?: 'revenue' | 'count';
  limit?: number;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!shown.length) return null;
  return (
    <section className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-md shadow-card">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="space-y-3">
        {shown.map((r) => {
          const val = mode === 'revenue' ? r.revenue : r.count;
          const pct = total > 0 ? Math.round((val / total) * 100) : 0;
          return (
            <div key={r.key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.label}</span>
                <span className="shrink-0 tabular-nums font-semibold">
                  {mode === 'revenue' ? formatRupiah(r.revenue) : `${r.count}`}
                </span>
                <span className="w-9 shrink-0 text-right font-data-tabular text-data-tabular text-on-surface-variant dark:text-outline-variant tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-container dark:bg-white/10">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
