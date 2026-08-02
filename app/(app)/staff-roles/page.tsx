'use client';
import CrudPage from '@/components/crud-page';
import type { StaffRole } from '@/lib/types';
import CardActions from '@/components/card-actions';

export default function StaffRolesPage() {
  return (
    <CrudPage<StaffRole>
      title="Role Staff" endpoint="/staff-roles" queryKey="staff-roles" searchPlaceholder="Cari role…"
      initialForm={{ name: '', description: '' }}
      fields={[
        { name: 'name', label: 'Nama Role', placeholder: 'Cashier', required: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Kasir cabang' },
      ]}
      validate={(f): Record<string, string> => (!f.name ? { name: 'Nama wajib diisi' } : {})}
      fromItem={(r) => ({ name: r.name, description: r.description || '' })}
      renderCard={(r, { edit, remove }) => (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <div>
            <p className="font-semibold">{r.name}</p>
            <p className="mt-1 font-body-md text-body-md text-outline dark:text-outline-variant">{r.description || '—'}</p>
          </div>
          <CardActions onEdit={edit} onDelete={remove} />
        </div>
      )}
    />
  );
}
