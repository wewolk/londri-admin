'use client';
import CrudPage from '@/components/crud-page';
import { formatRupiah } from '@/lib/utils';
import type { MembershipTier } from '@/lib/types';
import CardActions from '@/components/card-actions';

export default function MembershipTiersPage() {
  return (
    <CrudPage<MembershipTier>
      title="Tier Membership" endpoint="/membership-tiers" queryKey="membership-tiers" searchPlaceholder="Cari tier…"
      initialForm={{ name: '', purchasePrice: '', balanceAmount: '', validityDays: '', description: '' }}
      fields={[
        { name: 'name', label: 'Nama Tier', placeholder: 'Silver', required: true },
        { name: 'purchasePrice', label: 'Harga Beli (Rp)', type: 'number', placeholder: '100000', required: true },
        { name: 'balanceAmount', label: 'Saldo Didapat (Rp)', type: 'number', placeholder: '120000', required: true },
        { name: 'validityDays', label: 'Masa Berlaku (hari)', type: 'number', placeholder: '30', required: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea' },
      ]}
      validate={(f): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!f.name) e.name = 'Nama wajib diisi';
        if (!f.purchasePrice) e.purchasePrice = 'Harga beli wajib diisi';
        if (!f.balanceAmount) e.balanceAmount = 'Saldo wajib diisi';
        if (!f.validityDays) e.validityDays = 'Masa berlaku wajib diisi';
        return e;
      }}
      toPayload={(f) => ({ name: f.name, purchasePrice: Number(f.purchasePrice), balanceAmount: Number(f.balanceAmount), validityDays: Number(f.validityDays), description: f.description || null })}
      fromItem={(t) => ({ name: t.name, purchasePrice: t.purchasePrice, balanceAmount: t.balanceAmount, validityDays: String(t.validityDays), description: t.description || '' })}
      renderCard={(t, { edit, remove }) => (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <div>
            <p className="font-semibold">{t.name}</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">Beli {formatRupiah(t.purchasePrice)} → saldo {formatRupiah(t.balanceAmount)}</p>
            <p className="font-label-md text-label-md text-outline dark:text-outline-variant">Berlaku {t.validityDays} hari</p>
          </div>
          <CardActions onEdit={edit} onDelete={remove} />
        </div>
      )}
    />
  );
}
