'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/page-header';
import SkeletonList from '@/components/skeleton-list';
import EmptyState from '@/components/empty-state';
import { membershipsApi } from '@/lib/api';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import { MEMBER_BADGE, MEMBER_LABEL } from '@/lib/labels';
import { Wallet, Receipt } from '@phosphor-icons/react';

type Tab = 'info' | 'balance' | 'transaksi';

export default function MembershipDetailPage({ params }: { params: { id: string } }) {
  const [tab, setTab] = useState<Tab>('info');
  const { data: m, isLoading } = useQuery({ queryKey: ['membership', params.id], queryFn: () => membershipsApi.get(params.id) });
  const balanceLogs = useQuery({ queryKey: ['membership-balance', params.id], queryFn: () => membershipsApi.balanceLogs(params.id), enabled: tab === 'balance' });
  const transactions = useQuery({ queryKey: ['membership-tx', params.id], queryFn: () => membershipsApi.transactions(params.id), enabled: tab === 'transaksi' });

  if (isLoading || !m) return <><PageHeader title="Detail Member" back /><SkeletonList /></>;

  return (
    <>
      <PageHeader title={m.customerName} back />
      <div className="p-4">
        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-5 shadow-card">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-container/10 font-headline-lg text-xl font-bold text-primary dark:bg-primary-container/20">
              {m.customerName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
            </span>
            <p className="mt-2 text-lg font-bold">{m.customerName}</p>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{m.phoneNumber}</p>
            <span className={`mt-2 chip font-semibold ${MEMBER_BADGE[m.status]}`}>{MEMBER_LABEL[m.status]}</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-primary-container p-3">
              <p className="font-label-md text-label-md text-on-primary-container">Saldo</p>
              <p className="mt-0.5 font-data-tabular text-data-tabular font-bold tabular-nums text-on-primary-container">{formatRupiah(m.balance)}</p>
            </div>
            <div className="rounded-md bg-surface-container-low dark:bg-white/5 p-3">
              <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">Tier</p>
              <p className="mt-0.5 font-bold">{m.tier?.name}</p>
            </div>
          </div>
          <p className="mt-3 font-body-md text-body-md text-outline dark:text-outline-variant">Berlaku sampai {formatTanggal(m.expiresAt)}</p>
        </section>

        <div role="tablist" className="mt-4 grid grid-cols-3 rounded-md bg-surface-container dark:bg-white/5 p-1">
          {(['info', 'balance', 'transaksi'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`min-h-[40px] rounded-lg text-sm font-medium ${tab === t ? 'bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface shadow-card' : 'text-on-surface-variant dark:text-outline-variant'}`}>
              {t === 'info' ? 'Info' : t === 'balance' ? 'Saldo' : 'Transaksi'}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'info' && (
            <section className="space-y-2 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-5 font-body-md text-body-md shadow-card">
              <p><span className="text-outline dark:text-outline-variant">Nama:</span> {m.customerName}</p>
              <p><span className="text-outline dark:text-outline-variant">Telepon:</span> {m.phoneNumber}</p>
              <p><span className="text-outline dark:text-outline-variant">Alamat:</span> {m.address || '—'}</p>
              <p><span className="text-outline dark:text-outline-variant">Tier:</span> {m.tier?.name} ({formatRupiah(m.tier?.balanceAmount)} / {m.tier?.validityDays} hari)</p>
              <p><span className="text-outline dark:text-outline-variant">Terdaftar:</span> {formatTanggal(m.createdAt, true)}</p>
            </section>
          )}
          {tab === 'balance' && (
            balanceLogs.isLoading ? <SkeletonList rows={3} /> : (
              <div className="space-y-2">
                {balanceLogs.data?.map((l) => (
                  <div key={l.id} className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
                    <div className="flex items-center justify-between">
                      <span className={`chip font-bold ${l.type === 'USAGE' ? 'chip-error' : l.type === 'REFUND' ? 'chip-success' : 'chip-neutral'}`}>
                        {l.type === 'USAGE' ? 'Pemakaian' : l.type === 'REFUND' ? 'Refund' : 'Penyesuaian'}
                      </span>
                      <b className={`font-data-tabular text-data-tabular tabular-nums ${l.type === 'USAGE' ? 'text-error' : 'text-success'}`}>
                        {l.type === 'USAGE' ? '-' : '+'}{formatRupiah(l.amount)}
                      </b>
                    </div>
                    <p className="mt-2 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{l.notes || l.order?.invoiceNumber || '—'}</p>
                    <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">Saldo: {formatRupiah(l.balanceBefore)} → {formatRupiah(l.balanceAfter)}</p>
                    <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">{formatTanggal(l.createdAt, true)}</p>
                  </div>
                ))}
                {!balanceLogs.data?.length && <EmptyState icon={Wallet} title="Belum ada riwayat saldo" />}
              </div>
            )
          )}
          {tab === 'transaksi' && (
            transactions.isLoading ? <SkeletonList rows={3} /> : (
              <div className="space-y-2">
                {transactions.data?.map((t) => (
                  <div key={t.id} className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{t.currentTier?.name}</p>
                      <b>{formatRupiah(t.purchasePrice)}</b>
                    </div>
                    <p className="mt-1 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">Saldo +{formatRupiah(t.balanceAdded)} · via {t.paymentMethod}</p>
                    <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">Cabang {t.branch?.name} · Kasir {t.staff?.fullName}</p>
                    <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">{formatTanggal(t.createdAt, true)}</p>
                  </div>
                ))}
                {!transactions.data?.length && <EmptyState icon={Receipt} title="Belum ada transaksi" />}
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
