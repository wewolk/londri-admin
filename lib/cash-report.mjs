/** @param {string | number | null | undefined} value */
const money = (value) => Number(value ?? 0);

/**
 * Normalizes only the accepted cash methods for reports. QRIS is retained as
 * three separate values so receipts (gross) and settlement (net) stay clear.
 * @param {Array<{method: string, amount?: string | number, grossAmount?: string | number, feeAmount?: string | number, transactionCount?: number}>} methods
 */
export function buildCashMethodRows(methods) {
  return methods
    .filter((method) => method.method === 'CASH' || method.method === 'QRIS')
    .map((method) => ({
      key: method.method,
      label: method.method === 'CASH' ? 'Tunai' : 'QRIS',
      net: money(method.amount),
      gross: money(method.grossAmount),
      fee: money(method.feeAmount),
      transactionCount: Number(method.transactionCount ?? 0),
    }));
}

/**
 * @param {{total?: string | number, fromNewOrders?: string | number, fromPreviousOrders?: string | number}} cashIn
 */
export function buildCashSourceRows(cashIn) {
  const total = money(cashIn.total);
  const fromNewOrders = money(cashIn.fromNewOrders);
  const fromPreviousOrders = money(cashIn.fromPreviousOrders);
  return {
    total,
    fromNewOrders,
    fromPreviousOrders,
    isBalanced: Math.abs(total - fromNewOrders - fromPreviousOrders) < 0.005,
  };
}

/** @param {string} from @param {string} to @param {number} [maxDays] */
export function calendarDays(from, to, maxDays = 31) {
  const days = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end && days.length < maxDays) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** @param {string} date @param {{total?: string | number, byMethod?: Array<{method: string, amount?: string | number}>}} cashIn */
export function buildDailyCashRow(date, cashIn) {
  const methods = buildCashMethodRows(cashIn.byMethod ?? []);
  const cash = methods.find((method) => method.key === 'CASH')?.net ?? 0;
  const qris = methods.find((method) => method.key === 'QRIS')?.net ?? 0;
  return { date, label: date.slice(5), cash, qris, total: money(cashIn.total) };
}
