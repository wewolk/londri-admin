import type { OrderStatus, PaymentMethod, MembershipStatus } from '@/lib/types';

/* Warna status — token Stitch "Refined Glass".
 *
 * Badge memetakan empat kategori yang berbeda maknanya bagi kasir:
 *
 *   info     sedang dikerjakan (DI_PROSES)
 *   sukses   selesai dikerjakan, siap diambil (SELESAI)
 *   netral   sudah diambil pelanggan (DIAMBIL) — arsip
 *   error    dibatalkan (CANCELLED)
 */

const NEUTRAL = 'bg-surface-container text-on-surface-variant dark:bg-white/10 dark:text-outline-variant';
const INFO    = 'bg-primary-container text-on-primary-container dark:bg-primary/25 dark:text-primary-fixed';
const WARNING = 'bg-warning-container text-on-warning-container dark:bg-warning/25 dark:text-warning-container';
const SUCCESS = 'bg-success-container text-on-success-container dark:bg-success/25 dark:text-success-container';
const ERROR   = 'bg-error-container text-on-error-container dark:bg-error/25 dark:text-error-container';

export const STATUS_BADGE: Record<OrderStatus, string> = {
  DI_PROSES: INFO,
  SELESAI: SUCCESS,
  DIAMBIL: NEUTRAL,
  CANCELLED: ERROR,
};

/* Titik timeline — hex inline (bukan class Tailwind) karena dipakai sebagai
 * style pada elemen SVG/absolute. */
export const STATUS_DOT: Record<OrderStatus, string> = {
  DI_PROSES: '#006591',   // primary — sedang dikerjakan
  SELESAI: '#047857',     // success
  DIAMBIL: '#bec8d2',     // outline-variant — arsip
  CANCELLED: '#dc2626',   // error
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  DI_PROSES: 'Diproses', SELESAI: 'Selesai', DIAMBIL: 'Diambil', CANCELLED: 'Dibatalkan',
};
export const PAYMENT_LABEL: Record<PaymentMethod, string> = { CASH: 'Tunai', TRANSFER: 'Transfer', QRIS: 'QRIS', MEMBERSHIP: 'Membership' };
export const ORDER_FLOW: OrderStatus[] = ['DI_PROSES', 'SELESAI', 'DIAMBIL'];

export const MEMBER_BADGE: Record<MembershipStatus, string> = {
  ACTIVE: SUCCESS,
  EXPIRED: WARNING,
  BLOCKED: ERROR,
};
export const MEMBER_LABEL: Record<MembershipStatus, string> = { ACTIVE: 'Aktif', EXPIRED: 'Kedaluwarsa', BLOCKED: 'Diblokir' };
