'use client';
import { useMemo, useState, useEffect } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { branchesApi, dashboardApi } from '@/lib/api';
import { fetchOrdersInPeriod, computeStats, periodFromPreset, PERIOD_LABEL } from '@/lib/reports';
import type { PeriodPreset, Period, ReportStats } from '@/lib/reports';
import type { ClosingReport } from '@/lib/types';
import { buildCashMethodRows, buildDailyCashRow, calendarDays } from '@/lib/cash-report.mjs';
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
  const [preset, setPreset] = useState<PeriodPreset>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [branchId, setBranchId] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [lastClosedAt, setLastClosedAt] = useState<string | null>(null);
  const [basis, setBasis] = useState<'cash' | 'accrual'>('cash');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');

  const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => branchesApi.list({ limit: 100 }) });

  const period: Period = useMemo(() => {
    if (preset === 'custom' && customFrom && customTo) {
      return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
    }
    return periodFromPreset(preset === 'custom' ? '30d' : preset);
  }, [preset, customFrom, customTo]);

  const customIncomplete = preset === 'custom' && (!customFrom || !customTo);
  const closingStorageKey = `${CLOSING_KEY}:${period.from}:${period.to}:${branchId || 'all'}`;
  useEffect(() => {
    setLastClosedAt(localStorage.getItem(closingStorageKey));
  }, [closingStorageKey]);

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
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const s = statsQuery.data;

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

  // Endpoint closing sudah menjadi sumber kebenaran kas. Untuk chart maksimal
  // 31 hari, ambil satu agregat closing per tanggal agar uang dicatat saat
  // diterima (bukan saat nota dibuat atau selesai).
  const cashChartCandidateDays = useMemo(
    () => calendarDays(period.from, period.to, 32),
    [period.from, period.to],
  );
  const cashChartTooLarge = cashChartCandidateDays.length > 31;
  const cashChartDays = cashChartTooLarge ? [] : cashChartCandidateDays;
  const dailyCashQueries = useQueries({
    queries: cashChartDays.map((date) => ({
      queryKey: ['report-closing-daily', date, branchId],
      queryFn: () => dashboardApi.closingReport({ dateFrom: date, dateTo: date, branchId: branchId || undefined }),
      enabled: basis === 'cash' && !customIncomplete,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    })),
  });
  const cashChartLoading = basis === 'cash' && dailyCashQueries.some((query) => query.isLoading);
  const cashChartError = basis === 'cash' && dailyCashQueries.some((query) => query.isError);
  const cashChartData = useMemo(() => cashChartDays.map((date, index) => {
    const report = dailyCashQueries[index]?.data;
    return buildDailyCashRow(date, report?.cashIn ?? {});
  }), [cashChartDays, dailyCashQueries]);

  const tickColor = isDark ? '#bec8d2' : '#3e4850';
  const gridColor = isDark ? '#3e4850' : '#f2f3ff';
  const tooltipStyle = { backgroundColor: isDark ? '#2a3040' : '#ffffff', border: `1px solid ${isDark ? '#3e4850' : '#e2e8f0'}`, borderRadius: 12, fontSize: 12 };
  const tooltipLabelStyle = { color: isDark ? '#eef0ff' : '#151b2b', fontWeight: 600 };

  const chartData = useMemo(() => {
    if (!s) return [];
    if (basis === 'cash' && closing) {
      return [];
    }
    return s.byDay.map((d) => ({ name: d.date.slice(5), revenue: d.revenue }));
  }, [s, basis, closing, period.from, period.to]);

  const paymentBreakdown = useMemo(() => {
    if (basis === 'cash' && closing) {
      const totalCash = Number(closing.cashIn.total);
      return buildCashMethodRows(closing.cashIn.byMethod).map((method) => ({
        ...method,
        revenue: method.net,
        pct: totalCash > 0 ? Math.round((method.net / totalCash) * 100) : 0,
      }));
    }
    const totalRev = s?.totalRevenue || 0;
    return (s?.byPayment || [])
      .filter((p) => p.key === 'CASH' || p.key === 'QRIS')
      .map((p) => ({
        key: p.key,
        label: p.label,
        count: p.count,
        revenue: p.revenue,
        pct: totalRev > 0 ? Math.round((p.revenue / totalRev) * 100) : 0,
      }));
  }, [basis, closing, s]);

  const cashierBreakdown = useMemo(() => {
    if (!closing) return [];
    const omsetMap = new Map((s?.byCashier || []).map(c => [c.key, c]));
    return closing.byCashier.map(c => ({
      key: c.staffId,
      label: c.fullName,
      cashIn: Number(c.cashIn),
      omset: omsetMap.get(c.staffId)?.revenue || 0,
      orderCount: c.orderCount,
      outstanding: Number(c.outstanding),
      isBalanced: c.isBalanced,
    }));
  }, [closing, s]);

  const filteredOrders = useMemo(() => {
    if (!s) return [];
    return s.orders.filter(o => {
      if (filterStatus && o.status !== filterStatus) return false;
      if (filterPayment && o.paymentMethod !== filterPayment) return false;
      return true;
    });
  }, [s, filterStatus, filterPayment]);

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

  const breakdownTotal = basis === 'cash' && closing
    ? Number(closing.cashIn.total)
    : (s ? s.totalRevenue : 0);

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
          
          <div className="mt-3 flex items-center justify-between rounded-lg border border-border-subtle dark:border-outline-variant/20 bg-surface-container-low dark:bg-white/5 p-3">
            <div>
              <p className="font-body-md text-body-md font-medium text-on-surface dark:text-inverse-on-surface">
                Basis perhitungan
              </p>
              <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">
                {basis === 'cash' 
                  ? 'Uang masuk nyata (tunai/QRIS diterima)' 
                  : 'Omset order selesai/diambil'}
              </p>
            </div>
            <button
              onClick={() => setBasis(basis === 'cash' ? 'accrual' : 'cash')}
              className={`relative h-8 w-14 rounded-full transition-colors ${
                basis === 'cash' ? 'bg-primary' : 'bg-surface-container-high'
              }`}
              aria-label={`Switch ke basis ${basis === 'cash' ? 'accrual' : 'cash'}`}
            >
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-card transition-[left] ${
                basis === 'cash' ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
          <p className="mt-2 px-1 font-label-md text-label-md text-outline dark:text-outline-variant">
            {statsQuery.isFetching
              ? 'Menyinkronkan data nota…'
              : lastClosedAt
                ? `Terakhir closing: ${new Date(lastClosedAt).toLocaleString('id-ID')}`
                : 'Belum pernah closing di perangkat ini'}
          </p>
        </div>

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
            {closing && <ClosingCard report={closing} dateLabel={periodLabel} />}

            {closing && cashierBreakdown.length > 0 && (
              <section className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-md shadow-card">
                <h2 className="mb-3 flex items-center gap-2 font-semibold">
                  <UserCircle size={18} weight="fill" className="text-primary dark:text-inverse-primary" />
                  Setoran per kasir
                </h2>
                <div className="space-y-2.5">
                  {cashierBreakdown.map((c) => (
                    <div key={c.key} className="flex items-center justify-between gap-3 border-b border-dashed border-border-subtle dark:border-outline-variant/25 pb-2.5 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate font-body-md text-body-md font-semibold">{c.label}</p>
                        <p className="font-label-md text-label-md text-outline dark:text-outline-variant">
                          {c.orderCount} nota
                          {c.outstanding > 0 && ` · piutang ${formatRupiah(c.outstanding)}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular-nums font-data-tabular font-bold">{formatRupiah(c.cashIn)}</p>
                        <p className={`font-label-md text-label-md ${c.isBalanced ? 'text-success' : 'text-error'}`}>
                          {c.isBalanced ? 'Cocok' : 'Selisih'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 pt-2 border-t border-border-subtle dark:border-outline-variant/20 font-label-md text-label-md text-outline dark:text-outline-variant">
                  Nilai = uang masuk (cash-in) per kasir. Omset (order selesai) terpisah di bawah.
                </p>
              </section>
            )}

            {s.totalOrders === 0 && Number(closing?.cashIn.total || 0) === 0 ? (
              <p className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass py-6 text-center font-body-md text-body-md text-outline dark:text-outline-variant">
                Tidak ada transaksi pada periode ini.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-3.5 shadow-card">
                  <div className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${k.color}`}><k.Icon size={16} weight="duotone" /></div>
                  <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{k.label}</p>
                  <p className="mt-0.5 break-words text-base font-bold tabular-nums">{k.value}</p>
                </div>
              ))}
            </div>
            <p className="-mt-2 flex items-center gap-1.5 px-1 font-label-md text-label-md text-outline dark:text-outline-variant">
              <Info size={13} weight="fill" className="shrink-0" />
              {basis === 'cash'
                ? 'Dana diterima usaha = tunai di laci + QRIS netto yang diselesaikan gateway pada periode ini. Pembayaran order diproses tetap tercatat saat diterima.'
                : 'Omset = nilai order berstatus Selesai/Diambil. Uang yang sudah diterima di muka tidak terhitung.'}
            </p>

            <section className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-md shadow-card">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <ChartBar size={18} weight="fill" className="text-primary dark:text-inverse-primary" /> 
                {basis === 'cash' ? 'Uang masuk periode ini' : 'Omset harian'}
              </h2>
              {basis === 'cash' && cashChartTooLarge ? (
                <div className="py-6 text-center">
                  <p className="text-2xl font-bold tabular-nums">{formatRupiah(Number(closing?.cashIn.total || 0))}</p>
                  <p className="mt-2 font-label-md text-label-md text-outline dark:text-outline-variant">
                    Pilih rentang maksimal 31 hari untuk melihat chart kas harian.
                  </p>
                </div>
              ) : basis === 'cash' && cashChartLoading ? (
                <p className="py-10 text-center font-body-md text-body-md text-outline dark:text-outline-variant">Memuat uang masuk harian…</p>
              ) : basis === 'cash' && cashChartError ? (
                <p className="py-10 text-center font-body-md text-body-md text-error">Gagal memuat chart uang masuk harian.</p>
              ) : basis === 'cash' && cashChartData.some((d) => d.total > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={cashChartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={gridColor} />
                    <XAxis dataKey="label" fontSize={10} tick={{ fill: tickColor }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis hide />
                    <Tooltip
                      formatter={(value, name) => [formatRupiah(Number(value)), name === 'cash' ? 'Tunai' : 'QRIS netto']}
                      labelFormatter={(label) => `Tanggal ${label}`}
                      contentStyle={tooltipStyle}
                      labelStyle={tooltipLabelStyle}
                      cursor={{ fill: isDark ? '#3e4850' : '#f2f3ff' }}
                    />
                    <Bar dataKey="cash" stackId="cash" name="Tunai" fill="#006591" radius={[0, 0, 4, 4]} />
                    <Bar dataKey="qris" stackId="cash" name="QRIS netto" fill="#58a7d2" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : basis === 'cash' ? (
                <p className="py-10 text-center font-body-md text-body-md text-outline dark:text-outline-variant">Belum ada dana diterima pada periode ini.</p>
              ) : chartData.some((d) => d.revenue > 0) ? (
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

            <section className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-md shadow-card">
              <h2 className="mb-3 font-semibold">
                {basis === 'cash' ? 'Uang masuk per metode' : 'Omset per metode pembayaran'}
              </h2>
              <div className="space-y-3">
                {paymentBreakdown.map((p) => (
                  <div key={p.key}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{p.label}</span>
                      <span className="shrink-0 tabular-nums font-semibold">{formatRupiah(p.revenue)}</span>
                      <span className="w-9 shrink-0 text-right font-data-tabular text-data-tabular text-on-surface-variant dark:text-outline-variant tabular-nums">{p.pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-container dark:bg-white/10">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${p.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {basis === 'cash' && (
                <p className="mt-3 pt-2 border-t border-border-subtle dark:border-outline-variant/20 font-label-md text-label-md text-outline dark:text-outline-variant">
                  Berdasarkan tunai diterima dan QRIS netto settlement. Pembayaran order diproses tetap tercatat saat diterima.
                </p>
              )}
            </section>
            <BreakdownCard title="Per status order" rows={s.byStatus} total={s.totalOrders} mode="count" />
            <BreakdownCard 
              title="Omset per kasir" 
              rows={s.byCashier} 
              total={s.totalRevenue} 
              limit={5}
            />

            <section className="glass overflow-hidden rounded-xl border border-border-subtle dark:border-outline-variant/20 shadow-card">
              <div className="flex items-center justify-between px-md py-3 border-b border-border-subtle dark:border-outline-variant/20">
                <h2 className="font-headline-md text-headline-md">
                  Transaksi <span className="font-label-md text-label-md font-normal text-outline dark:text-outline-variant">({filteredOrders.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                  <select 
                    value={filterStatus} 
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="neuo-inset min-h-[44px] rounded-md px-2 font-label-md text-label-md outline-none"
                  >
                    <option value="">Semua status</option>
                    <option value="SELESAI">Selesai</option>
                    <option value="DI_PROSES">Diproses</option>
                    <option value="DIAMBIL">Diambil</option>
                    <option value="CANCELLED">Dibatalkan</option>
                  </select>
                  <select 
                    value={filterPayment} 
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="neuo-inset min-h-[44px] rounded-md px-2 font-label-md text-label-md outline-none"
                  >
                    <option value="">Semua metode</option>
                    <option value="CASH">Tunai</option>
                    <option value="QRIS">QRIS</option>
                    <option value="MEMBERSHIP">Membership</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">
                      <th className="px-4 py-2 font-medium">Invoice</th>
                      <th className="px-4 py-2 font-medium">Pelanggan</th>
                      <th className="px-4 py-2 font-medium">Metode</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.slice(0, 50).map((o) => (
                      <tr key={o.id} className="border-t border-border-subtle dark:border-outline-variant/20">
                        <td className="px-4 py-2.5 font-mono text-xs">{o.invoiceNumber}</td>
                        <td className="px-4 py-2.5"><span className="block max-w-[120px] truncate">{o.customerName}</span></td>
                        <td className="px-4 py-2.5 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{PAYMENT_LABEL[o.paymentMethod]}</td>
                        <td className="px-md py-2.5 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{STATUS_LABEL[o.status]}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(o.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredOrders.length > 50 && (
                  <p className="px-md py-3 text-center font-label-md text-label-md text-outline dark:text-outline-variant">
                    Menampilkan 50 dari {filteredOrders.length} transaksi. Ekspor untuk data lengkap.
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
      {title === 'Omset per kasir' && (
        <p className="mt-3 pt-2 border-t border-border-subtle dark:border-outline-variant/20 font-label-md text-label-md text-outline dark:text-outline-variant">
          Berdasarkan order selesai/diambil. Cash-in aktual berbeda di bagian Setoran.
        </p>
      )}
    </section>
  );
}