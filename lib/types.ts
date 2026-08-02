// ===== Enums (match backend Prisma) =====
export type OrderStatus = 'DI_PROSES' | 'SELESAI' | 'DIAMBIL' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'MEMBERSHIP';
export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'BLOCKED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT';
export type BalanceLogType = 'USAGE' | 'ADJUSTMENT' | 'REFUND';

// ===== API envelope =====
export interface ApiOk<T> { success: true; message: string; data: T }
export interface ApiErr {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ===== Entities (all IDs are string — backend serializes BigInt) =====
export interface AdminUser {
  id: string;
  username: string;
  type: 'admin';
  role?: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phoneNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface StaffRole {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Staff {
  id: string;
  branchId: string;
  roleId: string;
  fullName: string;
  username: string;
  phoneNumber: string | null;
  address: string | null;
  isActive: boolean;
  isLoggedIn?: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  role?: StaffRole;
  branch?: { id: string; name: string };
}

export interface Service {
  id: string;
  name: string;
  price: string;
  type: string;
  estimatedHours: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipTier {
  id: string;
  name: string;
  purchasePrice: string;
  balanceAmount: string;
  validityDays: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  discountType: DiscountType;
  discountValue: string;
  minimumPurchase: string;
  maximumDiscount: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  serviceId: string;
  quantity: string;
  unitPrice: string;
  subtotal: string;
  createdAt: string;
  service?: Service;
}

export interface OrderLog {
  id: string;
  orderId: string;
  status: OrderStatus;
  notes: string | null;
  updatedBy: string;
  createdAt: string;
  staff?: { id: string; fullName: string };
}

export interface Order {
  id: string;
  invoiceNumber: string;
  branchId: string;
  staffId: string;
  membershipId: string | null;
  promotionId: string | null;
  customerName: string;
  phoneNumber: string;
  address: string | null;
  paymentMethod: PaymentMethod;
  subtotal: string;
  discountAmount: string;
  membershipAmountUsed: string;
  totalAmount: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  branch?: { id: string; name: string };
  staff?: { id: string; fullName: string };
  membership?: { id: string; customerName: string; phoneNumber: string } | null;
  promotion?: Promotion | null;
  items?: OrderItem[];
  logs?: OrderLog[];
}

export interface Membership {
  id: string;
  tierId: string;
  customerName: string;
  phoneNumber: string;
  address: string | null;
  balance: string;
  expiresAt: string;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
  tier?: MembershipTier;
}

export interface MembershipBalanceLog {
  id: string;
  membershipId: string;
  orderId: string | null;
  branchId: string;
  staffId: string;
  type: BalanceLogType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  notes: string | null;
  createdAt: string;
  branch?: { id: string; name: string };
  staff?: { id: string; fullName: string };
  order?: { id: string; invoiceNumber: string } | null;
}

export interface MembershipTransaction {
  id: string;
  membershipId: string;
  branchId: string;
  staffId: string;
  previousTierId: string | null;
  currentTierId: string;
  purchasePrice: string;
  balanceAdded: string;
  previousExpiryDate: string | null;
  newExpiryDate: string;
  paymentMethod: 'CASH' | 'TRANSFER' | 'QRIS';
  createdAt: string;
  branch?: { id: string; name: string };
  staff?: { id: string; fullName: string };
  currentTier?: MembershipTier;
  previousTier?: MembershipTier | null;
}

export interface AttendanceQrCode {
  id: string;
  branchId: string;
  qrToken: string;
  validFrom: string;
  validUntil: string;
  createdAt: string;
  branch?: { id: string; name: string };
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  branchId: string;
  attendanceQrCodeId: string;
  attendanceType: AttendanceType;
  scannedAt: string;
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
  createdAt: string;
  staff?: { id: string; fullName: string };
  branch?: { id: string; name: string };
  attendanceQrCode?: { id: string; qrToken: string };
}

// ===== Dashboard shapes =====
export interface DashboardSummary {
  summary: {
    totalOrders: number;
    totalMembers: number;
    activeMemberships: number;
    expiredMemberships: number;
    totalServices: number;
  };
  revenue: {
    daily: { amount: string | number; count: number };
    monthly: { amount: string | number; count: number };
  };
  revenueByBranch: { id: string; name: string; total_revenue: string; order_count: number }[];
}
export interface RevenueByCashier {
  staffId: string;
  fullName: string;
  totalRevenue: string;
  orderCount: number;
}
export interface RevenueByMonth {
  year: number;
  month: number;
  totalRevenue: string;
  orderCount: number;
}
export interface MembershipSales {
  totalSales: { amount: string | number; count: number };
  byTier: { tierName: string; count: number; total: string }[];
  balanceUsage: { membershipId: string; totalUsed: string }[];
}
export interface MostUsedPromotion {
  code: string;
  name: string;
  usage_count: number;
}
