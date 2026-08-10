'use client';
import CrudPage from '@/components/crud-page';
import BottomSheet from '@/components/bottom-sheet';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { branchesApi, staffRolesApi } from '@/lib/api';
import type { Staff } from '@/lib/types';
import CardActions from '@/components/card-actions';
import { Copy, Storefront, WhatsappLogo } from '@phosphor-icons/react';
import { toast } from '@/hooks/useToast';

type CredentialShare = {
  fullName: string;
  username: string;
  password: string;
  phoneNumber: string | null;
};

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits.startsWith('62') ? digits : digits;
}

export default function StaffsPage() {
  const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => branchesApi.list({ limit: 100 }) });
  const { data: roles } = useQuery({ queryKey: ['roles-all'], queryFn: () => staffRolesApi.list({ limit: 100 }) });
  const [credential, setCredential] = useState<CredentialShare | null>(null);

  const shareText = credential ? [
    `Halo ${credential.fullName},`,
    '',
    'Akun staff Londri POS Anda sudah dibuat.',
    `Username: ${credential.username}`,
    `Password: ${credential.password}`,
    '',
    'Simpan kredensial ini dengan aman dan jangan bagikan kepada orang lain.',
  ].join('\n') : '';

  async function copyCredential() {
    if (!credential) return;
    try {
      await navigator.clipboard.writeText(shareText);
      toast.success('Kredensial disalin');
    } catch {
      toast.error('Tidak dapat menyalin kredensial');
    }
  }

  function shareWhatsapp() {
    if (!credential?.phoneNumber) return;
    const target = whatsappNumber(credential.phoneNumber);
    if (!target) return;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <CrudPage<Staff>
        title="Staff" endpoint="/staffs" queryKey="staffs" searchPlaceholder="Cari staff…"
        initialForm={{ fullName: '', username: '', password: '', branchId: '', roleId: '', phoneNumber: '', address: '', isActive: true }}
        fields={[
          { name: 'fullName', label: 'Nama Lengkap', required: true },
          { name: 'username', label: 'Username', required: true },
          { name: 'password', label: 'Password', type: 'password', placeholder: 'Kosongkan jika tidak diubah' },
          { name: 'branchId', label: 'Cabang', type: 'select', required: true, options: (branches?.items || []).map((b) => ({ value: b.id, label: b.name })) },
          { name: 'roleId', label: 'Role', type: 'select', required: true, options: (roles?.items || []).map((r) => ({ value: r.id, label: r.name })) },
          { name: 'phoneNumber', label: 'No. WhatsApp', placeholder: '0812…' },
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
        onCreated={(staff, form) => setCredential({
          fullName: staff.fullName,
          username: staff.username,
          password: String(form.password),
          phoneNumber: staff.phoneNumber,
        })}
        fromItem={(s) => ({ fullName: s.fullName, username: s.username, password: '', branchId: s.branchId, roleId: s.roleId, phoneNumber: s.phoneNumber || '', address: s.address || '', isActive: s.isActive })}
        renderCard={(s, { edit, remove }) => (
          <div className={`overflow-hidden rounded-xl border border-border-subtle dark:border-outline-variant/20 shadow-card ${!s.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between px-md py-3">
              <div className="min-w-0 flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.isActive ? 'bg-primary-container/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                  {s.fullName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.fullName}</p>
                  <p className="truncate font-body-md text-body-md text-secondary dark:text-outline-variant">{s.role?.name || '—'}</p>
                </div>
              </div>
              <span className={`chip shrink-0 font-bold ${s.isActive ? 'chip-success' : 'chip-neutral'}`}>{s.isActive ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            <div className="border-t border-border-subtle dark:border-outline-variant/20" />
            <div className="flex items-center justify-between gap-2 px-md py-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Storefront size={15} weight="duotone" className="shrink-0 text-outline dark:text-outline-variant" aria-hidden="true" />
                <span className="font-label-md text-label-md text-outline dark:text-outline-variant">Cabang</span>
                <span className="truncate font-body-md text-body-md font-medium">{s.branch?.name || '—'}</span>
              </div>
              <CardActions onEdit={edit} onDelete={remove} />
            </div>
          </div>
        )}
      />

      <BottomSheet open={Boolean(credential)} onClose={() => setCredential(null)} title="Kredensial staff baru">
        {credential && <div className="space-y-4">
          <div className="rounded-xl bg-warning-container p-3 font-label-md text-label-md text-on-warning-container">
            Password hanya ditampilkan sekarang. Simpan atau bagikan sebelum menutup panel ini.
          </div>
          <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-container-low p-4 dark:border-outline-variant/20 dark:bg-white/5">
            <div><p className="font-label-md text-label-md text-outline dark:text-outline-variant">Staff</p><p className="font-semibold">{credential.fullName}</p></div>
            <div><p className="font-label-md text-label-md text-outline dark:text-outline-variant">Username</p><p className="font-data-tabular font-semibold">{credential.username}</p></div>
            <div><p className="font-label-md text-label-md text-outline dark:text-outline-variant">Password awal</p><p className="font-data-tabular break-all font-semibold">{credential.password}</p></div>
          </div>
          {credential.phoneNumber ? (
            <button type="button" onClick={shareWhatsapp} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-success font-semibold text-on-success">
              <WhatsappLogo size={21} weight="fill" /> Bagikan via WhatsApp
            </button>
          ) : <p className="rounded-xl bg-surface-container-low p-3 font-label-md text-label-md text-on-surface-variant dark:bg-white/5 dark:text-outline-variant">Nomor WhatsApp tidak diisi. Salin kredensial lalu kirimkan secara manual.</p>}
          <button type="button" onClick={copyCredential} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border border-border-subtle font-semibold text-on-surface dark:border-outline-variant/25 dark:text-inverse-on-surface">
            <Copy size={20} /> Salin kredensial
          </button>
        </div>}
      </BottomSheet>
    </>
  );
}
