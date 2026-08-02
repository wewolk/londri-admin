'use client';
import CrudPage from '@/components/crud-page';
import { formatRupiah } from '@/lib/utils';
import type { Service } from '@/lib/types';
import CardActions from '@/components/card-actions';

export default function ServicesPage() {
  return (
    <CrudPage<Service>
      title="Layanan" endpoint="/services" queryKey="services" searchPlaceholder="Cari layanan…"
      initialForm={{ name: '', price: '', type: '', estimatedHours: '', description: '', isActive: true }}
      fields={[
        { name: 'name', label: 'Nama Layanan', placeholder: 'Cuci Kering Reguler', required: true },
        { name: 'price', label: 'Harga (Rp)', type: 'number', placeholder: '7000', required: true },
        { name: 'type', label: 'Tipe', placeholder: 'per kg / per pcs', required: true },
        { name: 'estimatedHours', label: 'Estimasi (jam)', type: 'number', placeholder: '24', required: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea' },
        { name: 'isActive', label: 'Aktif', type: 'switch' },
      ]}
      validate={(f): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!f.name) e.name = 'Nama wajib diisi';
        if (!f.price) e.price = 'Harga wajib diisi';
        if (!f.type) e.type = 'Tipe wajib diisi';
        if (!f.estimatedHours) e.estimatedHours = 'Estimasi wajib diisi';
        return e;
      }}
      toPayload={(f) => ({ name: f.name, price: Number(f.price), type: f.type, estimatedHours: Number(f.estimatedHours), description: f.description || null, isActive: !!f.isActive })}
      fromItem={(s) => ({ name: s.name, price: s.price, type: s.type, estimatedHours: String(s.estimatedHours), description: s.description || '', isActive: s.isActive })}
      renderCard={(s, { edit, remove }) => (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{s.name}</p>
              {!s.isActive && <span className="chip chip-neutral">NONAKTIF</span>}
            </div>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{formatRupiah(s.price)} · {s.type}</p>
            <p className="font-label-md text-label-md text-outline dark:text-outline-variant">Estimasi {s.estimatedHours} jam</p>
          </div>
          <CardActions onEdit={edit} onDelete={remove} />
        </div>
      )}
    />
  );
}
