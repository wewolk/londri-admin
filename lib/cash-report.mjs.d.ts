export type CashMethodRow = {
  key: 'CASH' | 'QRIS';
  label: 'Tunai' | 'QRIS';
  net: number;
  gross: number;
  fee: number;
  transactionCount: number;
};

export function buildCashMethodRows(methods: Array<{
  method: string;
  amount?: string | number;
  grossAmount?: string | number;
  feeAmount?: string | number;
  transactionCount?: number;
}>): CashMethodRow[];

export function buildCashSourceRows(cashIn: {
  total?: string | number;
  fromNewOrders?: string | number;
  fromPreviousOrders?: string | number;
}): {
  total: number;
  fromNewOrders: number;
  fromPreviousOrders: number;
  isBalanced: boolean;
};

export function calendarDays(from: string, to: string, maxDays?: number): string[];

export function buildDailyCashRow(date: string, cashIn: {
  total?: string | number;
  byMethod?: Array<{ method: string; amount?: string | number }>;
}): { date: string; label: string; cash: number; qris: number; total: number };
