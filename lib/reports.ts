import { ordersApi } from '@/lib/api';
import type { Order, OrderStatus, PaymentMethod } from '@/lib/types';

// ===== Periode =====
export type PeriodPreset = 'today' | '7d' | '30d' | 'month' | 'custom';

export interface Period {
  from: string; // yyyy-mm-dd (inklusif)
  to: string;   // yyyy-mm-dd (inklusif)
}

function toISODate(d: Date) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** Rentang tanggal untuk preset. Semua inklusif (batas atas = hari itu penuh). */
export function periodFromPreset(preset: PeriodPreset): Period {
  const now = new Date();
  const to = toISODate(now);
  if (preset === 'today') return { from: to, to };
  if (preset === '7d') {
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return { from: toISODate(f), to };
  }
  if (preset === '30d') {
    const f = new Date(now); f.setDate(f.getDate() - 29);
    return { from: toISODate(f), to };
  }
  // month = bulan berjalan
  const f = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: toISODate(f), to };
}

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  today: 'Hari ini', '7d': '7 hari', '30d': '30 hari', month: 'Bulan ini', custom: 'Custom',
};

// ===== Fetch semua order dalam periode (loop pagination) =====
const REVENUE_STATUSES: OrderStatus[] = ['SELESAI', 'DIAMBIL'];

export interface ReportFilters {
  branchId?: string;
}

/** Ambil seluruh order dalam periode dengan menelusuri semua halaman. */
export async function fetchOrdersInPeriod(period: Period, filters: ReportFilters = {}): Promise<Order[]> {
  const limit = 100;
  let page = 1;
  const all: Order[] = [];
  // Batas aman agar tidak infinite loop bila backend nakal.
  const MAX_PAGES = 100;
  while (page <= MAX_PAGES) {
    const res = await ordersApi.list({
      dateFrom: period.from,
      dateTo: period.to,
      branchId: filters.branchId || undefined,
      page,
      limit,
    });
    all.push(...res.items);
    if (page >= res.pages || res.items.length === 0) break;
    page += 1;
  }
  return all;
}

// ===== Agregasi statistik =====
export interface Breakdown {
  key: string;
  label: string;
  count: number;      // jumlah order
  revenue: number;    // total revenue (order SELESAI/DIAMBIL)
}

export interface ReportStats {
  period: Period;
  orders: Order[];
  // KPI
  totalRevenue: number;     // hanya order SELESAI/DIAMBIL
  totalOrders: number;      // semua order pada periode
  completedOrders: number;
  cancelledOrders: number;
  avgOrderValue: number;    // revenue / completedOrders
  totalDiscount: number;
  uniqueCustomers: number;
  completionRate: number;   // completed / total (0..1)
  // Breakdown
  byStatus: Breakdown[];
  byPayment: Breakdown[];
  byCashier: Breakdown[];
  byBranch: Breakdown[];
  byDay: { date: string; revenue: number; count: number }[];
}

const num = (v: string | number | null | undefined) => Number(v || 0);
const isRevenue = (o: Order) => REVENUE_STATUSES.includes(o.status);

const STATUS_ID: Record<OrderStatus, string> = {
  DI_PROSES: 'Diproses', SELESAI: 'Selesai', DIAMBIL: 'Diambil', CANCELLED: 'Dibatalkan',
};
const PAYMENT_ID: Record<PaymentMethod, string> = {
  CASH: 'Tunai', TRANSFER: 'Transfer', QRIS: 'QRIS', MEMBERSHIP: 'Membership',
};

function groupBy(
  orders: Order[],
  keyFn: (o: Order) => { key: string; label: string } | null,
): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const o of orders) {
    const g = keyFn(o);
    if (!g) continue;
    const cur = map.get(g.key) || { key: g.key, label: g.label, count: 0, revenue: 0 };
    cur.count += 1;
    if (isRevenue(o)) cur.revenue += num(o.totalAmount);
    map.set(g.key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue || b.count - a.count);
}

export function computeStats(orders: Order[], period: Period): ReportStats {
  const completed = orders.filter(isRevenue);
  const totalRevenue = completed.reduce((s, o) => s + num(o.totalAmount), 0);
  const completedOrders = completed.length;
  const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED').length;
  const totalDiscount = orders.reduce((s, o) => s + num(o.discountAmount), 0);
  const customers = new Set(orders.map((o) => o.phoneNumber || o.customerName).filter(Boolean));

  // Per hari (dari from..to), isi 0 untuk hari kosong agar chart mulus.
  const dayMap = new Map<string, { revenue: number; count: number }>();
  for (const o of orders) {
    const day = (o.createdAt || '').slice(0, 10);
    if (!day) continue;
    const cur = dayMap.get(day) || { revenue: 0, count: 0 };
    cur.count += 1;
    if (isRevenue(o)) cur.revenue += num(o.totalAmount);
    dayMap.set(day, cur);
  }
  const byDay: { date: string; revenue: number; count: number }[] = [];
  const start = new Date(period.from);
  const end = new Date(period.to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = toISODate(d);
    const v = dayMap.get(iso) || { revenue: 0, count: 0 };
    byDay.push({ date: iso, revenue: v.revenue, count: v.count });
  }

  return {
    period,
    orders,
    totalRevenue,
    totalOrders: orders.length,
    completedOrders,
    cancelledOrders,
    avgOrderValue: completedOrders ? totalRevenue / completedOrders : 0,
    totalDiscount,
    uniqueCustomers: customers.size,
    completionRate: orders.length ? completedOrders / orders.length : 0,
    byStatus: groupBy(orders, (o) => ({ key: o.status, label: STATUS_ID[o.status] })),
    byPayment: groupBy(orders, (o) => ({ key: o.paymentMethod, label: PAYMENT_ID[o.paymentMethod] })),
    byCashier: groupBy(orders, (o) => o.staff ? { key: o.staff.id, label: o.staff.fullName } : { key: o.staffId, label: `Staff #${o.staffId}` }),
    byBranch: groupBy(orders, (o) => o.branch ? { key: o.branch.id, label: o.branch.name } : { key: o.branchId, label: `Cabang #${o.branchId}` }),
    byDay,
  };
}
