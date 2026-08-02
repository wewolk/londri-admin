'use client';
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { apiMessage, apiErrors } from '@/lib/api/client';
import PageHeader from '@/components/page-header';
import SkeletonList from '@/components/skeleton-list';
import EmptyState from '@/components/empty-state';
import Fab from '@/components/fab';
import BottomSheet from '@/components/bottom-sheet';
import ConfirmDialog from '@/components/confirm-dialog';
import Field, { inputCls } from '@/components/field';
import SearchInput from '@/components/search-input';
import { Package } from '@phosphor-icons/react';
import { toast } from '@/hooks/useToast';
import type { Paginated } from '@/lib/types';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select' | 'date' | 'switch' | 'password';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface CrudPageProps<T extends { id: string }> {
  title: string;
  endpoint: string;
  queryKey: string;
  searchPlaceholder?: string;
  fields: FieldDef[];
  initialForm: Record<string, string | boolean>;
  toPayload?: (form: Record<string, string | boolean>, isEditing: boolean) => unknown;
  fromItem?: (item: T) => Record<string, string | boolean>;
  renderCard: (item: T, actions: { edit: () => void; remove: () => void }) => React.ReactNode;
  validate?: (form: Record<string, string | boolean>, isEditing: boolean) => Record<string, string>;
}

export default function CrudPage<T extends { id: string }>(props: CrudPageProps<T>) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>(props.initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useQuery({
    queryKey: [props.queryKey, debounced],
    queryFn: async () => {
      const data = (await api.get(props.endpoint, { params: { limit: 100, search: debounced || undefined } })).data.data;
      // Normalize: backend may return bare array or paginated object
      if (Array.isArray(data)) return { items: data as T[], total: data.length, page: 1, limit: data.length, pages: 1 } as Paginated<T>;
      return data as Paginated<T>;
    },
  });

  const save = useMutation({
    mutationFn: async (payload: unknown) => editing
      ? api.put(`${props.endpoint}/${editing.id}`, payload)
      : api.post(props.endpoint, payload),
    onSuccess: () => {
      toast.success(editing ? 'Berhasil diperbarui' : 'Berhasil ditambahkan');
      setSheetOpen(false);
      qc.invalidateQueries({ queryKey: [props.queryKey] });
    },
    onError: (e) => { setErrors(apiErrors(e)); if (!Object.keys(apiErrors(e)).length) toast.error(apiMessage(e)); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`${props.endpoint}/${id}`),
    onSuccess: () => { toast.success('Berhasil dihapus'); setDeleteTarget(null); qc.invalidateQueries({ queryKey: [props.queryKey] }); },
    onError: (e) => toast.error(apiMessage(e)),
  });

  function openCreate() { setEditing(null); setForm(props.initialForm); setErrors({}); setSheetOpen(true); }
  function openEdit(item: T) { setEditing(item); setForm(props.fromItem ? props.fromItem(item) : props.initialForm); setErrors({}); setSheetOpen(true); }
  function submit() {
    const clientErrors = props.validate?.(form, !!editing) || {};
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
    save.mutate(props.toPayload ? props.toPayload(form, !!editing) : form);
  }

  const items = listQuery.data?.items || [];
  return (
    <>
      <PageHeader title={props.title} back />
      <div className="glass-strong sticky top-[56px] z-30 px-4 py-2">
        <SearchInput value={search} onChange={setSearch} placeholder={props.searchPlaceholder || 'Cari…'} />
      </div>
      {listQuery.isLoading ? <SkeletonList /> : items.length ? (
        <div className="space-y-3 p-4">
          {items.map((item) => (
            <div key={item.id}>
              {props.renderCard(item, { edit: () => openEdit(item), remove: () => setDeleteTarget(item) })}
            </div>
          ))}
        </div>
      ) : <EmptyState icon={Package} title={`Belum ada ${props.title.toLowerCase()}`} desc="Tekan tombol + untuk menambah" />}

      <Fab onClick={openCreate} />

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`${editing ? 'Ubah' : 'Tambah'} ${props.title}`}>
        <div className="space-y-4">
          {props.fields.map((f) => (
            <Field key={f.name} label={f.label} error={errors[f.name]}>
              {f.type === 'textarea' ? (
                <textarea value={String(form[f.name] ?? '')} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  placeholder={f.placeholder} rows={3} className={inputCls + ' py-3'} />
              ) : f.type === 'select' ? (
                <select value={String(form[f.name] ?? '')} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inputCls}>
                  <option value="">— Pilih —</option>
                  {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'switch' ? (
                <button type="button" onClick={() => setForm({ ...form, [f.name]: !form[f.name] })}
                  className={`relative h-8 w-14 rounded-full transition-colors ${form[f.name] ? 'bg-success' : 'bg-surface-container-high'}`}>
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-surface-container-lowest shadow-card transition-[left] ${form[f.name] ? 'left-7' : 'left-1'}`} />
                </button>
              ) : (
                <input type={f.type || 'text'} value={String(form[f.name] ?? '')} placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} className={inputCls} />
              )}
            </Field>
          ))}
          <button onClick={submit} disabled={save.isPending}
            className="min-h-[48px] w-full rounded-md bg-primary font-body-lg text-body-lg font-semibold text-on-primary transition-colors active:bg-on-primary-container disabled:opacity-50">
            {save.isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog open={!!deleteTarget} title={`Hapus ${props.title}?`} loading={del.isPending}
        message="Data yang dihapus tidak dapat dikembalikan."
        onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && del.mutate(deleteTarget.id)} />
    </>
  );
}
