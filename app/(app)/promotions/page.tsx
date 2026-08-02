'use client';
import CrudPage from '@/components/crud-page';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { Promotion } from '@/lib/types';
import CardActions from '@/components/card-actions';

export default function PromotionsPage() {
  return (
    <CrudPage<Promotion>
      title="Promo" endpoint="/promotions" queryKey="promotions" searchPlaceholder="Cari promo…"
      initialForm={{ code: '', name: '', discountType: 'PERCENTAGE', discountValue: '', minimumPurchase: '0', maximumDiscount: '', startDate: '', endDate: '', isActive: true }}
      fields={[
        { name: 'code', label: 'Kode Promo', placeholder: 'DISKON10', required: true },
        { name: 'name', label: 'Nama Promo', placeholder: 'Diskon 10%', required: true },
        { name: 'discountType', label: 'Tipe Diskon', type: 'select', required: true, options: [
          { value: 'PERCENTAGE', label: 'Persentase (%)' },
          { value: 'FIXED_AMOUNT', label: 'Nominal (Rp)' },
        ]},
        { name: 'discountValue', label: 'Nilai Diskon', type: 'number', placeholder: '10', required: true },
        { name: 'minimumPurchase', label: 'Minimal Belanja (Rp)', type: 'number', placeholder: '0' },
        { name: 'maximumDiscount', label: 'Maks Diskon (Rp)', type: 'number', placeholder: 'Opsional' },
        { name: 'startDate', label: 'Mulai', type: 'date', required: true },
        { name: 'endDate', label: 'Berakhir', type: 'date', required: true },
        { name: 'isActive', label: 'Aktif', type: 'switch' },
      ]}
      validate={(f): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!f.code) e.code = 'Kode wajib diisi';
        if (!f.name) e.name = 'Nama wajib diisi';
        if (!f.discountValue) e.discountValue = 'Nilai diskon wajib diisi';
        if (!f.startDate) e.startDate = 'Tanggal mulai wajib diisi';
        if (!f.endDate) e.endDate = 'Tanggal akhir wajib diisi';
        return e;
      }}
      toPayload={(f) => ({
        code: f.code, name: f.name, discountType: f.discountType, discountValue: Number(f.discountValue),
        minimumPurchase: Number(f.minimumPurchase) || 0, maximumDiscount: f.maximumDiscount ? Number(f.maximumDiscount) : null,
        startDate: f.startDate, endDate: f.endDate, isActive: !!f.isActive,
      })}
      fromItem={(p) => ({
        code: p.code, name: p.name, discountType: p.discountType, discountValue: p.discountValue,
        minimumPurchase: p.minimumPurchase, maximumDiscount: p.maximumDiscount || '',
        startDate: p.startDate.slice(0, 10), endDate: p.endDate.slice(0, 10), isActive: p.isActive,
      })}
      renderCard={(p, { edit, remove }) => (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <div>
            <div className="flex items-center gap-2">
              <span className="chip chip-info font-bold">{p.code}</span>
              {!p.isActive && <span className="chip chip-neutral font-bold">NONAKTIF</span>}
            </div>
            <p className="mt-2 font-semibold">{p.name}</p>
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">
              {p.discountType === 'PERCENTAGE' ? `${Number(p.discountValue)}%` : formatRupiah(p.discountValue)}
              {' '}· min. {formatRupiah(p.minimumPurchase)}
            </p>
            <p className="font-label-md text-label-md text-outline dark:text-outline-variant">{formatTanggal(p.startDate)} – {formatTanggal(p.endDate)}</p>
          </div>
          <CardActions onEdit={edit} onDelete={remove} />
        </div>
      )}
    />
  );
}
