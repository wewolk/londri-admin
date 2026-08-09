'use client';
import { useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { dashboardApi } from '@/lib/api';
import { formatRupiah } from '@/lib/utils';
import { fetchOrdersInPeriod, periodFromPreset } from '@/lib/reports';
import PageHeader from '@/components/page-header';
import SkeletonList from '@/components/skeleton-list';
import { useTheme } from '@/lib/theme';
import { CalendarCheck, ListChecks, Users, ShoppingCart, ChartBar, QrCode, TrendUp, TrendDown } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';

// Dynamic import Recharts — huge chunk (~100KB), only needed on this page
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });

/* Deret kategorikal untuk pie chart. Tier membership memang kategori berbeda,
   jadi hue berbeda dibenarkan di sini — tapi tetap dijaga di dalam keluarga
   palet (198 → 220 → hijau/kuning status) alih-alih pelangi acak. */
const COLORS = ['#006591', '#505f76', '#047857', '#b45309', '#89ceff'];

function sapaan() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

function toISODate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

function deltaInfo(today: number, yesterday: number) {
  if (!yesterday) return { pct: null as number | null, up: true };
  const diff = today - yesterday;
  const pct = Math.round((diff / yesterday) * 100);
  return { pct: Math.abs(pct), up: diff >= 0 };
}

const CHART_PRESETS = [
  { key: '7d', label: '7H' },
  { key: '30d', label: '30H' },
  { key: 'month', label: 'Bulan' },
] as const;

export default function DashboardPage() {
  const { resolved } = useTheme();
  const isDark = resolved === 'dark';
  const [chartPreset, setChartPreset] = useState<'7d' | '30d' | 'month'>('7d');
  
  const [summary, months, cashiers, sales, promos] = useQueries({ queries: [
    { queryKey: ['dashboard'], queryFn: dashboardApi.summary },
    { queryKey: ['dashboard-months'], queryFn: dashboardApi.revenueByMonth },
    { queryKey: ['dashboard-cashiers'], queryFn: dashboardApi.revenueByCashier },
    { queryKey: ['dashboard-sales'], queryFn: dashboardApi.membershipSales },
    { queryKey: ['dashboard-promos'], queryFn: dashboardApi.mostUsedPromotions },
  ]});
  
  // Data untuk delta vs kemarin
  const todayPeriod = periodFromPreset('today');
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayPeriod = { from: toISODate(yesterday), to: toISODate(yesterday) };
  
  const { data: todayOrders } = useQuery({
    queryKey: ['dashboard-orders-today'],
    queryFn: () => fetchOrdersInPeriod(todayPeriod),
  });
  
  const { data: yesterdayOrders } = useQuery({
    queryKey: ['dashboard-orders-yesterday'],
    queryFn: () => fetchOrdersInPeriod(yesterdayPeriod),
  });
  
  // Data untuk chart dengan filter periode
  const chartPeriod = periodFromPreset(chartPreset);
  const { data: chartOrders } = useQuery({
    queryKey: ['dashboard-chart', chartPreset],
    queryFn: () => fetchOrdersInPeriod(chartPeriod),
  });
  
  if (summary.isLoading) return <><PageHeader title="Dashboard" /><SkeletonList rows={5} /></>;
  const d = summary.data;
  const today = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date());
  
  // Hitung delta
  const todayRevenue = todayOrders?.reduce((s, o) => s + Number(o.totalAmount || 0), 0) || 0;
  const yesterdayRevenue = yesterdayOrders?.reduce((s, o) => s + Number(o.totalAmount || 0), 0) || 0;
  const delta = deltaInfo(todayRevenue, yesterdayRevenue);
  
  // Data chart dari periode terpilih
  const chartByDay = new Map<string, number>();
  (chartOrders || []).forEach(o => {
    const day = (o.createdAt || '').slice(0, 10);
    if (!day) return;
    chartByDay.set(day, (chartByDay.get(day) || 0) + Number(o.totalAmount || 0));
  });
  const chartData = Array.from(chartByDay.entries())
    .map(([date, revenue]) => ({ name: date.slice(5), revenue })) // MM-DD format
    .sort((a, b) => a.name.localeCompare(b.name));
  
  // Metrik kecil dengan trend indicator
  const smallCards = [
    { label: 'Revenue bulan ini', value: formatRupiah(d?.revenue.monthly.amount), Icon: CalendarCheck, color: 'bg-primary-container text-on-primary-container', trend: null },
    { label: 'Total order', value: d?.summary.totalOrders ?? 0, Icon: ListChecks, color: 'bg-secondary-container text-on-secondary-container', trend: null },
    { label: 'Member aktif', value: d?.summary.activeMemberships ?? 0, Icon: Users, color: 'bg-success-container text-on-success-container', trend: null },
  ];
  const tickColor = isDark ? '#bec8d2' : '#3e4850';
  const gridColor = isDark ? '#3e4850' : '#f2f3ff';
  const tooltipStyle = { backgroundColor: isDark ? '#2a3040' : '#ffffff', border: `1px solid ${isDark ? '#3e4850' : '#e2e8f0'}`, borderRadius: 12, fontSize: 12 };
  const tooltipLabelStyle = { color: isDark ? '#eef0ff' : '#151b2b', fontWeight: 600 };

  return (
    <>
      <PageHeader title="Dashboard" />
      <div className="space-y-5 p-4">
        {/* Greeting */}
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface dark:text-inverse-on-surface">{sapaan()}, Admin</h2>
          <p className="mt-0.5 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{today}</p>
        </div>

        {/* Hero card — revenue hari ini dengan delta */}
        {/* Hero — satu-satunya blok bertinta penuh di halaman. Solid, bukan
            gradient, dan tanpa glow berwarna: DESIGN.md § Elevation meminta
            hierarki dari warna dan garis, bukan dari bayangan. */}
        <section className="relative overflow-hidden rounded-xl bg-primary p-5">
          <p className="font-label-md text-label-md text-on-primary/80">Revenue hari ini</p>
          <p className="mt-1 font-display text-display tabular-nums text-on-primary">{formatRupiah(todayRevenue)}</p>
          <div className="mt-2 flex items-center gap-2">
            {delta.pct !== null && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-label-md text-label-md font-semibold ${
                delta.up 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/20 text-white'
              }`}>
                {delta.up ? <TrendUp size={14} weight="bold" /> : <TrendDown size={14} weight="bold" />}
                {delta.up ? '+' : '-'}{delta.pct}% vs kemarin
              </span>
            )}
            <span className="font-label-md text-label-md text-on-primary/70">
              {d?.revenue.daily.count ?? 0} transaksi selesai
            </span>
          </div>
        </section>

        {/* Tiga metrik kecil */}
        <div className="grid grid-cols-3 gap-3">
          {smallCards.map((c) => <div key={c.label} className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-3.5 shadow-card">
            <div className={`mb-2.5 flex h-8 w-8 items-center justify-center rounded-xl ${c.color}`}><c.Icon size={16} weight="duotone" /></div>
            <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{c.label}</p>
            <p className="mt-0.5 truncate font-data-tabular text-data-tabular font-bold tabular-nums text-on-surface dark:text-inverse-on-surface">{c.value}</p>
          </div>)}
        </div>

        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">Revenue</h2>
            <div className="flex items-center gap-1 rounded-lg bg-surface-container dark:bg-white/5 p-0.5">
              {CHART_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setChartPreset(p.key)}
                  className={`min-h-[28px] rounded-md px-2.5 font-label-md text-label-md font-medium transition-colors ${
                    chartPreset === p.key
                      ? 'bg-surface-container-lowest dark:bg-inverse-surface text-primary dark:text-inverse-primary shadow-card'
                      : 'text-on-surface-variant dark:text-outline-variant'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <Link href="/reports" className="font-label-md text-label-md font-medium text-primary dark:text-inverse-primary active:opacity-70">
              Laporan lengkap →
            </Link>
          </div>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#006591" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#006591" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={gridColor} />
                <XAxis dataKey="name" fontSize={11} tick={{ fill: tickColor }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => formatRupiah(Number(v))} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} cursor={{ stroke: '#006591', strokeOpacity: 0.3 }} />
                <Area type="monotone" dataKey="revenue" stroke="#006591" strokeWidth={2.5} fill="url(#revGradient)"
                  dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p className="py-12 text-center font-body-md text-body-md text-outline">Belum ada data revenue untuk periode ini</p>}
        </section>

        {/* Quick Actions — dipindah ke bawah karena bukan prioritas utama */}
        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <h2 className="mb-3 font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">Aksi cepat</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'History Order', Icon: ShoppingCart, href: '/orders' },
              { label: 'Laporan', Icon: ChartBar, href: '/reports' },
              { label: 'QR Presensi', Icon: QrCode, href: '/attendance/qr' },
            ].map((a) => (
              <Link key={a.label} href={a.href}
                className="flex flex-col items-center gap-2 rounded-lg border border-border-subtle dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-inverse-surface p-4 transition-colors active:bg-surface-container-low dark:active:bg-white/5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container/10 text-primary">
                  <a.Icon size={20} weight="fill" />
                </div>
                <span className="font-label-md text-label-md text-on-surface dark:text-inverse-on-surface">{a.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border-subtle dark:border-outline-variant/20 shadow-card">
          <div className="border-b border-border-subtle dark:border-outline-variant/20 bg-surface-container-low dark:bg-white/5 px-md py-3">
            <h2 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">Revenue per kasir</h2>
          </div>
          <div className="space-y-4 p-md">
            {(cashiers.data || []).slice(0, 5).map((x, i, arr) => {
              const maxRev = Number(arr[0].totalRevenue) || 1;
              const pct = Math.round((Number(x.totalRevenue) / maxRev) * 100);
              const barColor = i === 0 ? 'bg-primary' : i === 1 ? 'bg-primary-container' : 'bg-secondary-fixed-dim';
              return (
                <div key={x.staffId}>
                  <div className="mb-1 flex items-center justify-between font-body-md text-body-md">
                    <span className="font-medium text-on-surface dark:text-inverse-on-surface">{x.fullName}</span>
                    <span className="font-data-tabular text-data-tabular tabular-nums">{formatRupiah(x.totalRevenue)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container dark:bg-white/10">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!cashiers.data?.length && <p className="font-body-md text-body-md text-outline">Belum ada data kasir</p>}
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <h2 className="mb-3 font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">Penjualan membership</h2>
          <div className="flex items-center gap-4">
            <div className="relative h-36 w-36 shrink-0">
              {sales.data?.byTier?.length ? (
                <>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={sales.data.byTier} dataKey="total" nameKey="tierName" innerRadius="55%" outerRadius="100%" paddingAngle={2} strokeWidth={0}>
                        {sales.data.byTier.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatRupiah(Number(v))} contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="font-label-md text-label-md text-outline dark:text-outline-variant">Total</p>
                    <p className="text-sm font-bold tabular-nums">{formatRupiah(sales.data.totalSales.amount)}</p>
                  </div>
                </>
              ) : <div className="flex h-full items-center justify-center rounded-full bg-surface-container dark:bg-white/10 font-label-md text-label-md text-outline">Kosong</div>}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {(sales.data?.byTier || []).map((t, i) => (
                <div key={t.tierName} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-on-surface-variant dark:text-outline-variant">{t.tierName}</span>
                  <b className="shrink-0 tabular-nums">{formatRupiah(t.total)}</b>
                </div>
              ))}
              <p className="pt-1 font-label-md text-label-md text-outline dark:text-outline-variant">{sales.data?.totalSales.count || 0} transaksi</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <h2 className="mb-4 font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">Promo terpopuler</h2>
          <div className="space-y-3">{(promos.data || []).slice(0, 5).map((p) => <div key={p.code} className="flex items-center justify-between"><div><span className="chip chip-info font-bold">{p.code}</span><span className="ml-2 text-sm">{p.name}</span></div><b className="text-sm tabular-nums">{p.usage_count}×</b></div>)}{!promos.data?.length && <p className="font-body-md text-body-md text-outline">Belum ada promo digunakan</p>}</div>
        </section>
      </div>
    </>
  );
}
