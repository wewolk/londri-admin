'use client';
import CrudPage from '@/components/crud-page';
import { useQuery } from '@tanstack/react-query';
import { branchesApi, staffRolesApi } from '@/lib/api';
import type { Staff } from '@/lib/types';
import CardActions from '@/components/card-actions';

export default function StaffsPage() {
  const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => branchesApi.list({ limit: 100 }) });
  const { data: roles } = useQuery({ queryKey: ['roles-all'], queryFn: () => staffRolesApi.list({ limit: 100 }) });

  return (
    <CrudPage<Staff>
      title="Staff" endpoint="/staffs" queryKey="staffs" searchPlaceholder="Cari staff…"
      initialForm={{ fullName: '', username: '', password: '', branchId: '', roleId: '', phoneNumber: '', address: '', isActive: true }}
      fields={[
        { name: 'fullName', label: 'Nama Lengkap', required: true },
        { name: 'username', label: 'Username', required: true },
        { name: 'password', label: 'Password', type: 'password', placeholder: 'Kosongkan jika tidak diubah' },
        { name: 'branchId', label: 'Cabang', type: 'select', required: true, options: (branches?.items || []).map((b) => ({ value: b.id, label: b.name })) },
        { name: 'roleId', label: 'Role', type: 'select', required: true, options: (roles?.items || []).map((r) => ({ value: r.id, label: r.name })) },
        { name: 'phoneNumber', label: 'No. Telepon' },
        { name: 'address', label: 'Alamat', type: 'textarea' },
        { name: 'isActive', label: 'Aktif', type: 'switch' },
      ]}
      validate={(f, isEditing): Record<string, string> => {
        const e: Record<string, string> = {};
        if (!f.fullName) e.fullName = 'Nama wajib diisi';
        if (!f.username) e.username = 'Username wajib diisi';
        if (!isEditing && (!f.password || String(f.password).length < 6)) e.password = 'Password wajib (min 6 karakter)';
        if (!f.branchId) e.branchId = 'Cabang wajib dipilih';
        if (!f.roleId) e.roleId = 'Role wajib dipilih';
        return e;
      }}
      toPayload={(f, isEditing) => {
        const payload: Record<string, unknown> = {
          fullName: f.fullName, username: f.username, branchId: f.branchId, roleId: f.roleId,
          phoneNumber: f.phoneNumber || null, address: f.address || null, isActive: !!f.isActive,
        };
        if (!isEditing || f.password) payload.password = f.password;
        return payload;
      }}
      fromItem={(s) => ({ fullName: s.fullName, username: s.username, password: '', branchId: s.branchId, roleId: s.roleId, phoneNumber: s.phoneNumber || '', address: s.address || '', isActive: s.isActive })}
      renderCard={(s, { edit, remove }) => (
        <div className={`overflow-hidden rounded-xl border border-border-subtle dark:border-outline-variant/20 shadow-card ${!s.isActive ? 'opacity-60' : ''}`}>
          {/* Top: avatar + name + status */}
          <div className="flex items-center justify-between px-md py-3">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${s.isActive ? 'bg-primary-container/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                {s.fullName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
              </span>
              <div>
                <p className="font-semibold">{s.fullName}</p>
                <p className="font-body-md text-body-md text-secondary dark:text-outline-variant">{s.role?.name}</p>
              </div>
            </div>
            <span className={`chip font-bold ${s.isActive ? 'chip-success' : 'chip-neutral'}`}>
              {s.isActive ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          {/* Divider */}
          <div className="border-t border-border-subtle dark:border-outline-variant/20" />
          {/* Bottom: branch meta */}
          <div className="flex items-center justify-between px-md py-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-outline dark:text-outline-variant">storefront</span>
              <span className="font-label-md text-label-md text-outline dark:text-outline-variant">Branch</span>
              <span className="font-body-md text-body-md font-medium">{s.branch?.name}</span>
            </div>
            <CardActions onEdit={edit} onDelete={remove} />
          </div>
        </div>
      )}
    />
  );
}
