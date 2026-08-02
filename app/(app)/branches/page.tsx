'use client';
import CrudPage from '@/components/crud-page';
import CardActions from '@/components/card-actions';
import type { Branch } from '@/lib/types';

export default function BranchesPage() {
  return (
    <CrudPage<Branch>
      title="Cabang" endpoint="/branches" queryKey="branches" searchPlaceholder="Cari cabang…"
      initialForm={{ name: '', address: '', phoneNumber: '' }}
      fields={[
        { name: 'name', label: 'Nama Cabang', placeholder: 'Londri Cabang Bandung', required: true },
        { name: 'address', label: 'Alamat', type: 'textarea', placeholder: 'Jl. …', required: true },
        { name: 'phoneNumber', label: 'No. Telepon', placeholder: '0812…', required: true },
      ]}
      validate={(f): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!f.name) e.name = 'Nama wajib diisi';
        if (!f.address) e.address = 'Alamat wajib diisi';
        if (!f.phoneNumber) e.phoneNumber = 'Telepon wajib diisi';
        return e;
      }}
      fromItem={(b) => ({ name: b.name, address: b.address, phoneNumber: b.phoneNumber })}
      renderCard={(b, { edit, remove }) => (
        <div className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{b.name}</p>
              <p className="mt-1 font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{b.address}</p>
              <p className="mt-1 font-body-md text-body-md text-outline dark:text-outline-variant">{b.phoneNumber}</p>
            </div>
            <CardActions onEdit={edit} onDelete={remove} />
          </div>
        </div>
      )}
    />
  );
}
