'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import BottomSheet from '@/components/bottom-sheet';
import ConfirmDialog from '@/components/confirm-dialog';
import EmptyState from '@/components/empty-state';
import Field, { inputCls } from '@/components/field';
import SkeletonList from '@/components/skeleton-list';
import { attendanceWifiApi, branchesApi } from '@/lib/api';
import { apiErrors, apiMessage } from '@/lib/api/client';
import { toast } from '@/hooks/useToast';
import type { BranchWifiCredential, WifiBand } from '@/lib/types';
import {
  CheckCircle,
  FunnelSimple,
  PencilSimple,
  Power,
  WarningCircle,
  WifiHigh,
} from '@phosphor-icons/react';

type StatusFilter = 'all' | 'active' | 'inactive';
type FormState = {
  ssid: string;
  bssids: string;
  band: '' | WifiBand;
  isActive: boolean;
};

const emptyForm: FormState = { ssid: '', bssids: '', band: '', isActive: true };

function normalizeBssid(value: string): string | null {
  const compact = value.replace(/[:\-\s]/g, '');
  if (!/^[0-9a-fA-F]{12}$/.test(compact)) return null;
  return compact.toUpperCase().match(/.{2}/g)!.join(':');
}

function parseBssids(raw: string): { values: string[]; invalid: string[] } {
  const entries = raw.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean);
  const values: string[] = [];
  const invalid: string[] = [];
  for (const entry of entries) {
    const normalized = normalizeBssid(entry);
    if (!normalized) invalid.push(entry);
    else if (!values.includes(normalized)) values.push(normalized);
  }
  return { values, invalid };
}

export default function AttendanceWifiPage() {
  const qc = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BranchWifiCredential | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deactivateTarget, setDeactivateTarget] = useState<BranchWifiCredential | null>(null);

  const { data: branches } = useQuery({
    queryKey: ['branches-all'],
    queryFn: () => branchesApi.list({ limit: 100 }),
  });
  const wifiQuery = useQuery({
    queryKey: ['attendance-wifi', branchId, status],
    queryFn: () => attendanceWifiApi.list(branchId, status === 'all' ? undefined : status === 'active'),
    enabled: Boolean(branchId),
  });

  const activeCount = useMemo(
    () => (wifiQuery.data || []).filter((credential) => credential.isActive).length,
    [wifiQuery.data],
  );

  const refresh = () => qc.invalidateQueries({ queryKey: ['attendance-wifi', branchId] });
  const save = useMutation({
    mutationFn: () => {
      const ssid = form.ssid.trim();
      const { values } = parseBssids(form.bssids);
      const payload = {
        branchId,
        ssid,
        bssids: values,
        ...(form.band ? { band: form.band } : {}),
        isActive: form.isActive,
      };
      return editing ? attendanceWifiApi.update(editing.id, payload) : attendanceWifiApi.create(payload);
    },
    onSuccess: () => {
      toast.success(editing ? 'Wi-Fi diperbarui' : 'Wi-Fi ditambahkan');
      setSheetOpen(false);
      setEditing(null);
      refresh();
    },
    onError: (error) => {
      const fieldErrors = apiErrors(error);
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) toast.error(apiMessage(error));
    },
  });
  const deactivate = useMutation({
    mutationFn: (target: BranchWifiCredential) => attendanceWifiApi.deactivate(target.id, target.branchId),
    onSuccess: () => {
      toast.success('Wi-Fi dinonaktifkan');
      setDeactivateTarget(null);
      refresh();
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setSheetOpen(true);
  }

  function openEdit(item: BranchWifiCredential) {
    setEditing(item);
    setForm({
      ssid: item.ssid,
      bssids: item.bssids.join('\n'),
      band: item.band || '',
      isActive: item.isActive,
    });
    setErrors({});
    setSheetOpen(true);
  }

  function submit() {
    const nextErrors: Record<string, string> = {};
    const ssid = form.ssid.trim();
    const parsed = parseBssids(form.bssids);
    if (!branchId) nextErrors.branchId = 'Cabang wajib dipilih';
    if (!ssid) nextErrors.ssid = 'SSID wajib diisi';
    else if (ssid.length > 100) nextErrors.ssid = 'SSID maksimal 100 karakter';
    if (!parsed.values.length) nextErrors.bssids = 'Minimal satu BSSID wajib diisi';
    else if (parsed.invalid.length) nextErrors.bssids = `BSSID tidak valid: ${parsed.invalid.join(', ')}`;
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    save.mutate();
  }

  const selectedBranch = (branches?.items || []).find((branch) => branch.id === branchId);
  const emptyDescription = branchId
    ? 'Belum ada kredensial Wi-Fi untuk cabang ini.'
    : 'Pilih cabang untuk melihat dan mengelola Wi-Fi presensi.';

  return (
    <>
      <PageHeader title="Wi-Fi Presensi" back right={
        <Link href="/attendance" className="font-label-md text-label-md font-semibold text-primary">
          Presensi
        </Link>
      } />

      <div className="space-y-4 p-4">
        <section className="glass rounded-xl border border-border-subtle p-4 shadow-card">
          <Field label="Cabang" error={errors.branchId}>
            <select
              value={branchId}
              onChange={(event) => { setBranchId(event.target.value); setErrors({}); }}
              className={inputCls}
            >
              <option value="">— Pilih cabang —</option>
              {(branches?.items || []).map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </Field>
          <p className="mt-2 flex items-start gap-2 font-label-md text-label-md text-outline dark:text-outline-variant">
            <WarningCircle size={16} className="mt-0.5 shrink-0" />
            Wi-Fi dicocokkan dengan SSID dan BSSID saat staff melakukan scan QR.
          </p>
        </section>

        {branchId && (
          <>
            <div className="flex items-center gap-2 overflow-x-auto">
              <FunnelSimple size={18} className="shrink-0 text-outline" />
              {(['active', 'inactive', 'all'] as StatusFilter[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setStatus(value)}
                  className={`rounded-full px-3 py-2 font-label-md text-label-md font-medium transition-colors ${status === value ? 'bg-primary text-on-primary' : 'bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline-variant'}`}
                >
                  {value === 'active' ? 'Aktif' : value === 'inactive' ? 'Nonaktif' : 'Semua'}
                </button>
              ))}
            </div>

            {activeCount === 1 && status !== 'inactive' && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-container/60 p-3 font-label-md text-label-md text-on-warning-container">
                <WarningCircle size={18} className="mt-0.5 shrink-0" />
                Menonaktifkan Wi-Fi aktif terakhir membuat scan kembali mengikuti grace period backend.
              </div>
            )}

            {wifiQuery.isLoading ? <SkeletonList rows={3} /> : wifiQuery.isError ? (
              <div className="rounded-xl border border-error/30 bg-error-container p-4 text-center text-on-error-container">
                <p className="font-body-md text-body-md">Gagal memuat kredensial Wi-Fi.</p>
                <button onClick={() => wifiQuery.refetch()} className="mt-3 rounded-md bg-error px-4 py-2 font-label-md text-label-md font-semibold text-on-error">Coba lagi</button>
              </div>
            ) : (wifiQuery.data || []).length ? (
              <div className="space-y-3">
                {(wifiQuery.data || []).map((credential) => (
                  <article key={credential.id} className={`glass rounded-xl border border-border-subtle p-4 shadow-card ${!credential.isActive ? 'opacity-65' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                          <WifiHigh size={21} weight="duotone" />
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate font-semibold">{credential.ssid}</h2>
                          <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">
                            {credential.band || 'Band tidak ditentukan'} · {credential.branch?.name || selectedBranch?.name || 'Cabang'}
                          </p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 font-label-md text-label-md font-medium ${credential.isActive ? 'bg-success-container text-on-success-container' : 'bg-surface-container-high text-outline'}`}>
                        {credential.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="mt-4 space-y-1 rounded-lg bg-surface-container-low dark:bg-white/5 p-3">
                      <p className="font-label-md text-label-md font-medium text-outline dark:text-outline-variant">BSSID</p>
                      {credential.bssids.map((bssid) => <p key={bssid} className="font-mono text-xs">{bssid}</p>)}
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <button onClick={() => openEdit(credential)} className="flex min-h-[40px] items-center gap-2 rounded-md border border-border-subtle px-3 font-label-md text-label-md font-semibold active:bg-surface-container-low">
                        <PencilSimple size={17} /> Edit
                      </button>
                      {credential.isActive && (
                        <button onClick={() => setDeactivateTarget(credential)} className="flex min-h-[40px] items-center gap-2 rounded-md bg-error px-3 font-label-md text-label-md font-semibold text-on-error active:bg-on-error-container">
                          <Power size={17} /> Nonaktifkan
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : <EmptyState icon={WifiHigh} title="Belum ada Wi-Fi" desc={emptyDescription} />}
          </>
        )}
      </div>

      {branchId && <button onClick={openCreate} className="fixed bottom-[var(--app-bottom-safe)] right-[max(1rem,calc(50%-14rem+1rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab transition-transform duration-150 active:scale-95" aria-label="Tambah Wi-Fi">
        <WifiHigh size={25} weight="bold" />
      </button>}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`${editing ? 'Edit' : 'Tambah'} Wi-Fi Presensi`}>
        <div className="space-y-4">
          <Field label="Cabang">
            <input value={selectedBranch?.name || branchId} readOnly className={inputCls + ' opacity-70'} />
          </Field>
          <Field label="SSID" error={errors.ssid}>
            <input value={form.ssid} onChange={(event) => setForm({ ...form, ssid: event.target.value })} placeholder="Nama Wi-Fi toko" maxLength={100} className={inputCls} />
          </Field>
          <Field label="BSSID" error={errors.bssids}>
            <textarea value={form.bssids} onChange={(event) => setForm({ ...form, bssids: event.target.value })} placeholder={'Satu BSSID per baris\nAA:BB:CC:DD:EE:FF'} rows={4} className={inputCls + ' py-3 font-mono text-sm'} />
            <span className="mt-1 block font-label-md text-label-md text-outline dark:text-outline-variant">Boleh memakai format colon, hyphen, atau 12 digit hex.</span>
          </Field>
          <Field label="Band Wi-Fi">
            <select value={form.band} onChange={(event) => setForm({ ...form, band: event.target.value as FormState['band'] })} className={inputCls}>
              <option value="">Tidak ditentukan</option>
              <option value="2.4GHz">2.4GHz</option>
              <option value="5GHz">5GHz</option>
            </select>
          </Field>
          <button type="button" role="switch" aria-checked={form.isActive} onClick={() => setForm({ ...form, isActive: !form.isActive })} className="flex min-h-[44px] items-center gap-3 font-body-md text-body-md">
            <span className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${form.isActive ? 'bg-success' : 'bg-surface-container-high'}`}>
              <span className={`h-5 w-5 rounded-full bg-surface-container-lowest shadow-card transition-[transform] ${form.isActive ? 'translate-x-5' : ''}`} />
            </span>
            <span>{form.isActive ? 'Credential aktif' : 'Credential nonaktif'}</span>
          </button>
          <button onClick={submit} disabled={save.isPending} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-primary font-body-lg text-body-lg font-semibold text-on-primary disabled:opacity-50">
            {save.isPending ? 'Menyimpan…' : <><CheckCircle size={19} /> Simpan</>}
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Nonaktifkan Wi-Fi?"
        message="Credential tetap tersimpan dan bisa diaktifkan kembali. Jika ini Wi-Fi aktif terakhir, scan dapat kembali mengikuti grace period backend."
        loading={deactivate.isPending}
        confirmLabel="Nonaktifkan"
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivate.mutate(deactivateTarget)}
      />
    </>
  );
}
