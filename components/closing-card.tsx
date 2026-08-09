'use client';
import { useEffect, useState } from 'react';
import type { ClosingReport, CashMethod } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { buildCashMethodRows, buildCashSourceRows } from '@/lib/cash-report.mjs';
import {
  Receipt, Money, Wallet, WarningCircle, CheckCircle, Coins, QrCode, Bank, ArrowRight,
} from '@phosphor-icons/react';

/* Nominal dari backend berupa string desimal ("300000.00"). Number() aman
   untuk rentang nilai transaksi laundry dan menjaga pembulatan tetap konsisten
   dengan tampilan rupiah. */
const n = (v: string | number | null | undefined) => Number(v ?? 0);

const METHOD_META: Record<CashMethod, { label: string; hint: string; Icon: typeof Coins }> = {
  CASH: { label: 'Tunai', hint: 'Hitung fisik di laci', Icon: Coins },
  QRIS: { label: 'QRIS', hint: 'Cek mutasi', Icon: QrCode },
};

function Row({ label, value, sub, tone = 'default', indent }: {
  label: string;
  value: number;
  sub?: string;
  tone?: 'default' | 'muted' | 'strong' | 'error';
  indent?: boolean;
}) {
  const toneClass =
    tone === 'error' ? 'text-error'
    : tone === 'strong' ? 'text-on-surface dark:text-inverse-on-surface font-bold'
    : tone === 'muted' ? 'text-on-surface-variant dark:text-outline-variant'
    : '';
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${indent ? 'pl-4' : ''}`}>
      <span className={`min-w-0 font-body-md text-body-md ${tone === 'muted' ? 'text-on-surface-variant dark:text-outline-variant' : ''}`}>
        {label}
        {sub && <span className="ml-1 font-label-md text-label-md text-outline dark:text-outline-variant">{sub}</span>}
      </span>
      <span className={`shrink-0 tabular-nums font-data-tabular ${toneClass}`}>{formatRupiah(value)}</span>
    </div>
  );
}

/**
 * Kartu closing harian: menjembatani nilai nota dengan uang yang benar-benar
 * diterima. Dibaca dari atas ke bawah seperti struk, sehingga kasir tahu
 * persis angka mana yang harus dicocokkan dengan fisik uang di laci.
 */
export default function ClosingCard({ report, dateLabel }: { report: ClosingReport; dateLabel: string }) {
  const { summary, cashIn, membershipUsed, reconciliation: rec } = report;

  const notaValue = n(summary.newOrderValue);
  const piutang = n(summary.outstanding);
  const saldoMember = n(membershipUsed.amount);
  const seharusnyaDiterima = notaValue - piutang - saldoMember;
  const diterimaDariNotaIni = n(rec.paidOnNewOrders);
  const selisih = n(rec.difference);
  const balanced = rec.isBalanced;

  const cashSources = buildCashSourceRows(cashIn);
  const cashMethods = buildCashMethodRows(cashIn.byMethod);
  const tunaiAmount = cashMethods.find((method) => method.key === 'CASH')?.net ?? 0;

  // Input opsional: kasir mengetik hasil hitung fisik laci untuk dibandingkan.
  const [cashCount, setCashCount] = useState('');
  useEffect(() => { setCashCount(''); }, [report.period.dateFrom, report.period.dateTo, report.period.branchId]);
  const counted = cashCount.trim() === '' ? null : Number(cashCount.replace(/[^\d]/g, ''));
  const cashDiff = counted === null ? null : counted - tunaiAmount;

  return (
    <section className={`overflow-hidden rounded-xl border shadow-card ${balanced
      ? 'border-border-subtle dark:border-outline-variant/20 glass'
      : 'border-error/30 bg-error-container/20 dark:bg-error/5'}`}>

      {/* Status closing */}
      <header className="flex items-center justify-between gap-3 border-b border-border-subtle dark:border-outline-variant/20 px-md py-3">
        <div className="min-w-0">
          <h2 className="font-headline-md text-headline-md">Closing {dateLabel}</h2>
          <p className="font-label-md text-label-md text-outline dark:text-outline-variant">
            {summary.orderCount} nota{summary.cancelledCount > 0 && ` · ${summary.cancelledCount} batal`}
          </p>
        </div>
        <span className={`chip shrink-0 items-center gap-1.5 font-semibold ${balanced
          ? 'bg-success-container text-on-success-container'
          : 'bg-error-container text-on-error-container'}`}>
          {balanced ? <CheckCircle size={15} weight="fill" /> : <WarningCircle size={15} weight="fill" />}
          {balanced ? 'Cocok' : 'Selisih'}
        </span>
      </header>

      {/* Jembatan nota -> uang */}
      <div className="px-md py-3">
        <p className="mb-1 flex items-center gap-1.5 font-label-md text-label-md uppercase tracking-wide text-outline dark:text-outline-variant">
          <Receipt size={14} weight="duotone" /> Dari nota ke uang
        </p>
        <Row label="Nilai nota" value={notaValue} tone="strong" />
        <Row label="Belum dibayar" value={-piutang} indent tone="muted" />
        <Row label="Dibayar saldo member" value={-saldoMember} indent tone="muted" />
        <div className="my-1 border-t border-dashed border-border-subtle dark:border-outline-variant/30" />
        <Row label="Seharusnya diterima" value={seharusnyaDiterima} tone="strong" />
        <Row label="Tercatat diterima" value={diterimaDariNotaIni} />
        {!balanced && (
          <>
            <div className="my-1 border-t border-dashed border-error/40" />
            <Row label="Selisih belum terjelaskan" value={selisih} tone="error" />
            <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-error-container/40 p-2 font-label-md text-label-md text-on-error-container">
              <WarningCircle size={14} weight="fill" className="mt-px shrink-0" />
              Nilai nota belum sepenuhnya terjelaskan oleh pembayaran, saldo member, dan piutang. Periksa nota atau riwayat pembayarannya sebelum menutup kasir.
            </p>
          </>
        )}
      </div>

      {/* Dana aktual: gross QRIS pada struk, net QRIS pada settlement. */}
      <div className="border-t border-border-subtle dark:border-outline-variant/20 px-md py-3">
        <p className="mb-1 flex items-center gap-1.5 font-label-md text-label-md uppercase tracking-wide text-outline dark:text-outline-variant">
          <Wallet size={14} weight="duotone" /> Dana diterima usaha
        </p>
        <p className="mb-3 font-label-md text-label-md text-outline dark:text-outline-variant">
          Tunai di laci + QRIS netto yang diselesaikan gateway pada periode ini.
        </p>

        <div className="space-y-2">
          {cashMethods.map((method) => {
            const meta = METHOD_META[method.key as CashMethod];
            return (
              <div key={method.key} className="rounded-lg bg-surface-container-low px-3 py-2.5 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <meta.Icon size={16} weight="duotone" className="shrink-0 text-primary dark:text-inverse-primary" />
                    <span className="font-body-md text-body-md font-medium">{meta.label}</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-data-tabular font-semibold">
                    {formatRupiah(method.net)}
                  </span>
                </div>
                {method.key === 'QRIS' && (
                  <div className="mt-2 space-y-1 border-t border-border-subtle pt-2 dark:border-outline-variant/20">
                    <Row label="Dibayar customer (bruto)" value={method.gross} tone="muted" indent />
                    <Row label="Biaya layanan gateway" value={-method.fee} tone="muted" indent />
                    <Row label="QRIS netto diterima" value={method.net} tone="strong" indent />
                    <p className="pl-4 pt-1 font-label-md text-label-md text-outline dark:text-outline-variant">
                      Biaya layanan sudah tercetak pada struk customer.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-3 border-t border-border-subtle pt-3 dark:border-outline-variant/20">
          <p className="mb-1 font-label-md text-label-md uppercase tracking-wide text-outline dark:text-outline-variant">Sumber kas</p>
          <Row label="Dari nota periode ini" value={cashSources.fromNewOrders} />
          {cashSources.fromPreviousOrders > 0 && (
            <Row label="Pelunasan nota periode sebelumnya" value={cashSources.fromPreviousOrders} />
          )}
          {!cashSources.isBalanced && (
            <p className="mt-1 rounded-md bg-error-container/40 p-2 font-label-md text-label-md text-on-error-container">
              Rincian sumber kas belum cocok dengan total. Periksa riwayat pembayaran.
            </p>
          )}
        </div>
        <div className="mt-2 border-t border-border-subtle dark:border-outline-variant/20 pt-2">
          <Row label="Total dana diterima usaha" value={cashSources.total} tone="strong" />
        </div>
      </div>

      {/* Cocokkan fisik laci */}
      {/* <div className="border-t border-border-subtle dark:border-outline-variant/20 px-md py-3">
        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 font-label-md text-label-md uppercase tracking-wide text-outline dark:text-outline-variant">
            <Money size={14} weight="duotone" /> Hitung fisik laci
          </span>
          <div className="flex items-center gap-2">
            <span className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">Rp</span>
            <input
              inputMode="numeric"
              value={cashCount}
              onChange={(e) => setCashCount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder={String(tunaiAmount)}
              aria-label="Jumlah uang tunai hasil hitung fisik"
              className="neuo-inset min-h-[42px] flex-1 rounded-md px-3 font-data-tabular tabular-nums outline-none"
            />
          </div>
        </label>
        <p className="mt-1.5 font-label-md text-label-md text-outline dark:text-outline-variant">
          Seharusnya ada {formatRupiah(tunaiAmount)} tunai di laci.
        </p>
        {cashDiff !== null && (
          <p className={`mt-1.5 flex items-center gap-1.5 rounded-md p-2 font-body-md text-body-md font-semibold ${cashDiff === 0
            ? 'bg-success-container text-on-success-container'
            : 'bg-error-container text-on-error-container'}`}>
            {cashDiff === 0
              ? <><CheckCircle size={15} weight="fill" /> Uang tunai cocok</>
              : <><WarningCircle size={15} weight="fill" /> {cashDiff > 0 ? 'Lebih' : 'Kurang'} {formatRupiah(Math.abs(cashDiff))}</>}
          </p>
        )}
      </div> */}
    </section>
  );
}
