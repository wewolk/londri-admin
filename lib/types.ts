// ===== Enums (match backend Prisma) =====
export type OrderStatus = 'DI_PROSES' | 'SELESAI' | 'DIAMBIL' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'QRIS' | 'MEMBERSHIP';
export type MembershipStatus = 'ACTIVE' | 'EXPIRED' | 'BLOCKED';
export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type PromotionAudience = 'ALL' | 'MEMBER' | 'NON_MEMBER' | 'NEW_CUSTOMER' | 'NTH_WASH';
export type PromotionBenefitType = 'DISCOUNT' | 'FREE_SERVICE' | 'GIFT';
export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT';
export type WifiBand = '2.4GHz' | '5GHz';
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

export interface Perfume {
  id: string;
  name: string;
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

export interface PromotionDiscountBenefit {
  discountType: DiscountType;
  discountValue: string;
  maximumDiscount: string | null;
}
export interface PromotionFreeServiceBenefit {
  serviceId: string;
  serviceName: string | null;
  quantity: string | null;
}
export interface PromotionGiftBenefit {
  giftName: string;
  quantity: string | null;
}
export type PromotionBenefit = PromotionDiscountBenefit | PromotionFreeServiceBenefit | PromotionGiftBenefit;

/** Shape returned by GET/POST/PUT /promotions. Benefit is intentionally nested. */
export interface Promotion {
  id: string;
  code: string;
  name: string;
  branchId: string | null;
  audience: PromotionAudience;
  nthWash: number | null;
  minimumPurchase: string;
  quota: number | null;
  quotaPerCustomer: number | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  benefitType: PromotionBenefitType;
  benefit: PromotionBenefit;
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
  /** PAID berarti tagihan order sudah lunas; PENDING masih memiliki sisa. */
  paymentStatus?: 'PAID' | 'PENDING' | 'FAILED' | string;
  subtotal: string;
  /** Sisa tagihan yang belum dibayar, sumber kebenaran status belum lunas. */
  underPayment?: string;
  /** Dana non-membership yang sudah dikreditkan ke order. */
  amountPaid?: string;
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
  paymentMethod: 'CASH' | 'QRIS';
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
  isActive: boolean;
  createdAt: string;
  branch?: { id: string; name: string };
  _count?: { attendances: number };
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
  ssid: string | null;
  bssid: string | null;
  createdAt: string;
  staff?: { id: string; fullName: string };
  branch?: { id: string; name: string };
  attendanceQrCode?: { id: string; qrToken: string };
}

export interface BranchWifiCredential {
  id: string;
  branchId: string;
  ssid: string;
  bssids: string[];
  band: WifiBand | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  branch?: { id: string; name: string };
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

// ===== Laporan closing (GET /dashboard/report) =====
export type CashMethod = 'CASH' | 'QRIS';

export interface ClosingReport {
  period: { dateFrom: string; dateTo: string; timezone: string; branchId: number | null };
  summary: {
    orderCount: number;
    cancelledCount: number;
    newOrderValue: string;
    discountTotal: string;
    outstanding: string;
    quantityByServiceType: { type: string; quantity: string }[];
  };
  cashIn: {
    total: string;
    fromNewOrders: string;
    fromPreviousOrders: string;
    byPurpose: Record<string, string>;
    byMethod: {
      method: CashMethod;
      amount: string;
      feeAmount: string;
      grossAmount: string;
      transactionCount: number;
    }[];
  };
  membershipUsed: { amount: string; orderCount: number };
  reconciliation: {
    newOrderValue: string;
    paidOnNewOrders: string;
    membershipUsed: string;
    outstanding: string;
    difference: string;
    isBalanced: boolean;
  };
  receivablesAging: { bucket: string; orderCount: number; amount: string }[];
  orderStatus: { status: string; orderCount: number; value: string }[];
  readyNotPickedUp: { bucket: string; orderCount: number; value: string }[];
  byCashier: {
    staffId: string;
    fullName: string;
    orderCount: number;
    newOrderValue: string;
    cashIn: string;
    byMethod: Record<CashMethod, string>;
    membershipUsed: string;
    outstanding: string;
    isBalanced: boolean;
  }[];
  byService: { serviceId: string; name: string; type: string; quantity: string; revenue: string }[];
  transactions: {
    id: string;
    invoiceNumber: string;
    createdAt: string;
    customerName: string;
    phoneNumber: string;
    branchName: string;
    staffName: string;
    paymentMethod: PaymentMethod;
    status: string;
    subtotal: string;
    discountAmount: string;
    totalAmount: string;
    membershipAmountUsed: string;
    amountPaidAsOf: string;
    underPaymentAsOf: string;
    paymentStatusAsOf: 'PAID' | 'PENDING';
  }[];
}
