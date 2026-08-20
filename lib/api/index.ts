import { api } from './client';
import type {
  ApiOk, Paginated, Branch, StaffRole, Staff, Service, Perfume, MembershipTier, Promotion,
  Order, OrderStatus, PaymentMethod, Membership, MembershipBalanceLog, MembershipTransaction,
  AttendanceQrCode, StaffAttendance, AttendanceType, AdminUser, BranchWifiCredential, WifiBand,
  DashboardSummary, RevenueByCashier, RevenueByMonth, MembershipSales, MostUsedPromotion,
  ClosingReport,
} from '../types';

const unwrap = <T>(r: { data: ApiOk<T> }) => r.data.data;

// Normalize backend response to Paginated<T>.
// Some endpoints (staff-roles, membership-tiers) return bare arrays instead of { items, total, ... }.
function normalizePaginated<T>(data: unknown): Paginated<T> {
  if (Array.isArray(data)) {
    return { items: data as T[], total: data.length, page: 1, limit: data.length, pages: 1 };
  }
  return data as Paginated<T>;
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiOk<{ token: string; user: AdminUser }>>('/auth/admin/login', { username, password }).then(unwrap),
  me: () => api.get<ApiOk<AdminUser>>('/auth/me').then(unwrap),
  logout: () => api.post<ApiOk<null>>('/auth/logout').then(unwrap),
};

// Generic CRUD factory for master data
function crud<T>(path: string) {
  return {
    list: (params?: Record<string, string | number>) =>
      api.get<ApiOk<Paginated<T> | T[]>>(path, { params }).then(unwrap).then(normalizePaginated<T>),
    get: (id: string) => api.get<ApiOk<T>>(`${path}/${id}`).then(unwrap),
    create: (body: unknown) => api.post<ApiOk<T>>(path, body).then(unwrap),
    update: (id: string, body: unknown) => api.put<ApiOk<T>>(`${path}/${id}`, body).then(unwrap),
    remove: (id: string) => api.delete<ApiOk<T>>(`${path}/${id}`).then(unwrap),
  };
}
export const branchesApi = crud<Branch>('/branches');
export const staffRolesApi = crud<StaffRole>('/staffs/roles');
export const staffsApi = crud<Staff>('/staffs');
export const servicesApi = crud<Service>('/services');
export const perfumesApi = crud<Perfume>('/perfume');
export const membershipTiersApi = crud<MembershipTier>('/memberships/tiers');
export const promotionsApi = crud<Promotion>('/promotions');

// Orders
export interface OrderFilters {
  branchId?: string; staffId?: string; status?: OrderStatus; paymentMethod?: PaymentMethod;
  search?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number;
}

/* Backend memakai enum Prisma (PROCESSING/DONE/PICKED_UP/CANCELLED) sedangkan
   UI memakai istilah Indonesia (DI_PROSES/SELESAI/DIAMBIL/CANCELLED). Tanpa
   penerjemahan ini STATUS_LABEL bernilai undefined (kolom Status kosong) dan
   revenue selalu Rp 0 karena tidak ada order yang cocok SELESAI/DIAMBIL. */
const STATUS_FROM_API: Record<string, OrderStatus> = {
  PROCESSING: 'DI_PROSES',
  DONE: 'SELESAI',
  PICKED_UP: 'DIAMBIL',
  CANCELLED: 'CANCELLED',
};
const STATUS_TO_API: Record<OrderStatus, string> = {
  DI_PROSES: 'PROCESSING',
  SELESAI: 'DONE',
  DIAMBIL: 'PICKED_UP',
  CANCELLED: 'CANCELLED',
};

/** Terjemahkan status order dari bentuk backend ke bentuk UI. Idempoten:
 *  nilai yang sudah berbentuk UI dibiarkan apa adanya. */
function decodeOrder(o: Order): Order {
  const raw = o?.status as unknown as string;
  if (!raw || !(raw in STATUS_FROM_API)) return o;
  return { ...o, status: STATUS_FROM_API[raw] };
}

export const ordersApi = {
  list: (params: OrderFilters) =>
    api.get<ApiOk<Paginated<Order>>>('/orders', {
      params: { ...params, status: params.status ? STATUS_TO_API[params.status] : undefined },
    })
      .then(unwrap)
      .then((p) => ({ ...p, items: (p.items || []).map(decodeOrder) })),
  get: (id: string) => api.get<ApiOk<Order>>(`/orders/${id}`).then(unwrap).then(decodeOrder),
  updateStatus: (id: string, status: OrderStatus, notes?: string) =>
    api.patch<ApiOk<Order>>(`/orders/${id}/status`, { status: STATUS_TO_API[status] ?? status, notes })
      .then(unwrap)
      .then(decodeOrder),
};

// Memberships
export const membershipsApi = {
  list: (params: { status?: string; search?: string; tierId?: string; page?: number; limit?: number }) =>
    api.get<ApiOk<Paginated<Membership>>>('/memberships', { params }).then(unwrap),
  get: (id: string) => api.get<ApiOk<Membership>>(`/memberships/${id}`).then(unwrap),
  balanceLogs: (id: string) =>
    api.get<ApiOk<MembershipBalanceLog[]>>(`/memberships/${id}/balance-logs`).then(unwrap),
  transactions: (id: string) =>
    api.get<ApiOk<MembershipTransaction[]>>(`/memberships/${id}/transactions`).then(unwrap),
};

// Attendance — note: backend param is "attendanceType" not "type"
export const attendanceApi = {
  list: (params: { staffId?: string; branchId?: string; attendanceType?: AttendanceType; date?: string; page?: number; limit?: number }) =>
    api.get<ApiOk<Paginated<StaffAttendance>>>('/staffs/attendance', { params }).then(unwrap),
  qrCodes: () => api.get<ApiOk<AttendanceQrCode[]>>('/staffs/attendance/qr-codes').then(unwrap),
  createQr: (branchId: string) =>
    api.post<ApiOk<AttendanceQrCode>>('/staffs/attendance/qr-codes', { branchId }).then(unwrap),
  deactivateQr: (id: string) =>
    api.put<ApiOk<AttendanceQrCode>>(`/staffs/attendance/qr-codes/${id}/deactivate`).then(unwrap),
};

export interface WifiCredentialPayload {
  branchId: string;
  ssid: string;
  bssids: string[];
  band?: WifiBand;
  isActive?: boolean;
}

export const attendanceWifiApi = {
  list: (branchId: string, active?: boolean) =>
    api.get<ApiOk<BranchWifiCredential[]>>('/branches/wifi', { params: { branchId, active } }).then(unwrap),
  create: (body: WifiCredentialPayload) =>
    api.post<ApiOk<BranchWifiCredential>>('/branches/wifi', body).then(unwrap),
  update: (id: string, body: WifiCredentialPayload) =>
    api.put<ApiOk<BranchWifiCredential>>(`/branches/wifi/${id}`, body).then(unwrap),
  deactivate: (id: string, branchId: string) =>
    api.delete<ApiOk<BranchWifiCredential>>(`/branches/wifi/${id}`, { data: { branchId } }).then(unwrap),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get<ApiOk<DashboardSummary>>('/dashboard').then(unwrap),
  revenueByCashier: () => api.get<ApiOk<RevenueByCashier[]>>('/dashboard/revenue-by-cashier').then(unwrap),
  revenueByMonth: () => api.get<ApiOk<RevenueByMonth[]>>('/dashboard/revenue-by-month').then(unwrap),
  membershipSales: () => api.get<ApiOk<MembershipSales>>('/dashboard/membership-sales').then(unwrap),
  mostUsedPromotions: () => api.get<ApiOk<MostUsedPromotion[]>>('/dashboard/most-used-promotions').then(unwrap),
  /* Laporan closing: seluruh agregasi (kas masuk, piutang, rekonsiliasi)
     dihitung di PostgreSQL, jadi angkanya memakai amountPaid yang sebenarnya
     — bukan hasil menjumlah ulang totalAmount di sisi klien. */
  closingReport: (params: { dateFrom: string; dateTo: string; branchId?: string }) =>
    api.get<ApiOk<ClosingReport>>('/dashboard/report', { params }).then(unwrap),
};
