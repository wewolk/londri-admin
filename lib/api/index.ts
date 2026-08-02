import { api } from './client';
import type {
  ApiOk, Paginated, Branch, StaffRole, Staff, Service, MembershipTier, Promotion,
  Order, OrderStatus, PaymentMethod, Membership, MembershipBalanceLog, MembershipTransaction,
  AttendanceQrCode, StaffAttendance, AttendanceType, AdminUser,
  DashboardSummary, RevenueByCashier, RevenueByMonth, MembershipSales, MostUsedPromotion,
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
export const staffRolesApi = crud<StaffRole>('/staff-roles');
export const staffsApi = crud<Staff>('/staffs');
export const servicesApi = crud<Service>('/services');
export const membershipTiersApi = crud<MembershipTier>('/membership-tiers');
export const promotionsApi = crud<Promotion>('/promotions');

// Orders
export interface OrderFilters {
  branchId?: string; staffId?: string; status?: OrderStatus; paymentMethod?: PaymentMethod;
  search?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number;
}
export const ordersApi = {
  list: (params: OrderFilters) =>
    api.get<ApiOk<Paginated<Order>>>('/orders', { params }).then(unwrap),
  get: (id: string) => api.get<ApiOk<Order>>(`/orders/${id}`).then(unwrap),
  updateStatus: (id: string, status: OrderStatus, notes?: string) =>
    api.patch<ApiOk<Order>>(`/orders/${id}/status`, { status, notes }).then(unwrap),
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
    api.get<ApiOk<Paginated<StaffAttendance>>>('/attendance', { params }).then(unwrap),
  qrCodes: () => api.get<ApiOk<AttendanceQrCode[]>>('/attendance/qr-codes').then(unwrap),
  createQr: (branchId: string, validHours: number) =>
    api.post<ApiOk<AttendanceQrCode>>('/attendance/qr-codes', { branchId, validHours }).then(unwrap),
};

// Dashboard
export const dashboardApi = {
  summary: () => api.get<ApiOk<DashboardSummary>>('/dashboard').then(unwrap),
  revenueByCashier: () => api.get<ApiOk<RevenueByCashier[]>>('/dashboard/revenue-by-cashier').then(unwrap),
  revenueByMonth: () => api.get<ApiOk<RevenueByMonth[]>>('/dashboard/revenue-by-month').then(unwrap),
  membershipSales: () => api.get<ApiOk<MembershipSales>>('/dashboard/membership-sales').then(unwrap),
  mostUsedPromotions: () => api.get<ApiOk<MostUsedPromotion[]>>('/dashboard/most-used-promotions').then(unwrap),
};
