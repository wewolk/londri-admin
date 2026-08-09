import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCashMethodRows,
  buildCashSourceRows,
} from './cash-report.mjs';

test('buildCashMethodRows keeps only cash and QRIS, with QRIS gross, fee, and net', () => {
  const rows = buildCashMethodRows([
    { method: 'CASH', amount: '592500.00', grossAmount: '592500.00', feeAmount: '0.00', transactionCount: 11 },
    { method: 'TRANSFER', amount: '9000.00', grossAmount: '9000.00', feeAmount: '0.00', transactionCount: 1 },
    { method: 'QRIS', amount: '337224.00', grossAmount: '339938.00', feeAmount: '2714.00', transactionCount: 11 },
  ]);

  assert.deepEqual(rows, [
    { key: 'CASH', label: 'Tunai', net: 592500, gross: 592500, fee: 0, transactionCount: 11 },
    { key: 'QRIS', label: 'QRIS', net: 337224, gross: 339938, fee: 2714, transactionCount: 11 },
  ]);
});

test('buildCashSourceRows separates current-period cash from prior-invoice settlement', () => {
  assert.deepEqual(buildCashSourceRows({
    total: '929724.00',
    fromNewOrders: '887112.00',
    fromPreviousOrders: '42612.00',
  }), {
    total: 929724,
    fromNewOrders: 887112,
    fromPreviousOrders: 42612,
    isBalanced: true,
  });
});

test('buildCashSourceRows flags a source total that does not reconcile', () => {
  assert.equal(buildCashSourceRows({
    total: '100.00', fromNewOrders: '75.00', fromPreviousOrders: '20.00',
  }).isBalanced, false);
});
