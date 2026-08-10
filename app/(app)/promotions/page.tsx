'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarBlank,
  Copy,
  Gift,
  Plus,
  PencilSimple,
  Sparkle,
  Tag,
  Trash,
  TShirt,
} from '@phosphor-icons/react';
import { api, apiErrors, apiMessage } from '@/lib/api/client';
import PageHeader from '@/components/page-header';
import BottomSheet from '@/components/bottom-sheet';
import ConfirmDialog from '@/components/confirm-dialog';
import EmptyState from '@/components/empty-state';
import SkeletonList from '@/components/skeleton-list';
import SearchInput from '@/components/search-input';
import Field, { inputCls } from '@/components/field';
import { toast } from '@/hooks/useToast';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type {
  Branch,
  Paginated,
  Promotion,
  PromotionAudience,
  PromotionBenefitType,
  Service,
} from '@/lib/types';

type FormState = {
  code: string;
  name: string;
  branchId: string;
  audience: PromotionAudience;
  nthWash: string;
  quota: string;
  quotaPerCustomer: string;
  minimumPurchase: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  benefitType: PromotionBenefitType;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: string;
  maximumDiscount: string;
  serviceId: string;
  giftName: string;
  quantity: string;
};

const INITIAL_FORM: FormState = {
  code: '', name: '', branchId: '', audience: 'ALL', nthWash: '', quota: '', quotaPerCustomer: '',
  minimumPurchase: '0', startDate: '', endDate: '', isActive: true, benefitType: 'DISCOUNT',
  discountType: 'PERCENTAGE', discountValue: '', maximumDiscount: '', serviceId: '', giftName: '', quantity: '',
};

const AUDIENCES: { value: PromotionAudience; label: string; hint: string }[] = [
  { value: 'ALL', label: 'Semua pelanggan', hint: 'Tidak membedakan status pelanggan.' },
  { value: 'MEMBER', label: 'Khusus member', hint: 'Hanya pelanggan dengan membership aktif.' },
  { value: 'NON_MEMBER', label: 'Non-member', hint: 'Tidak berlaku untuk pelanggan member.' },
  { value: 'NEW_CUSTOMER', label: 'Pelanggan baru', hint: 'Hanya sebelum cuci pertama tercatat.' },
  { value: 'NTH_WASH', label: 'Cuci ke-N', hint: 'Berlaku pada kelipatan jumlah cuci yang dipilih.' },
];

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function dateBoundary(date: string, end = false) {
  return `${date}T${end ? '23:59:59.999' : '00:00:00.000'}+07:00`;
}

function asItems<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.items || [];
}

function promotionForm(p: Promotion): FormState {
  const discount = p.benefitType === 'DISCOUNT' ? p.benefit : null;
  const freeService = p.benefitType === 'FREE_SERVICE' ? p.benefit : null;
  const gift = p.benefitType === 'GIFT' ? p.benefit : null;
  return {
    code: p.code,
    name: p.name,
    branchId: p.branchId || '',
    audience: p.audience,
    nthWash: p.nthWash ? String(p.nthWash) : '',
    quota: p.quota ? String(p.quota) : '',
    quotaPerCustomer: p.quotaPerCustomer ? String(p.quotaPerCustomer) : '',
    minimumPurchase: p.minimumPurchase,
    startDate: dateInput(p.startDate),
    endDate: dateInput(p.endDate),
    isActive: p.isActive,
    benefitType: p.benefitType,
    discountType: discount && 'discountType' in discount ? discount.discountType : 'PERCENTAGE',
    discountValue: discount && 'discountValue' in discount ? discount.discountValue : '',
    maximumDiscount: discount && 'maximumDiscount' in discount ? discount.maximumDiscount || '' : '',
    serviceId: freeService && 'serviceId' in freeService ? String(freeService.serviceId) : '',
    giftName: gift && 'giftName' in gift ? gift.giftName : '',
    quantity: (freeService && 'quantity' in freeService ? freeService.quantity : gift && 'quantity' in gift ? gift.quantity : null) || '',
  };
}

function benefitLabel(p: Promotion) {
  if (p.benefitType === 'GIFT' && 'giftName' in p.benefit) {
    return `${p.benefit.quantity ? `${p.benefit.quantity}× ` : ''}${p.benefit.giftName}`;
  }
  if (p.benefitType === 'FREE_SERVICE' && 'serviceName' in p.benefit) {
    return `Gratis ${p.benefit.serviceName || 'layanan'}${p.benefit.quantity ? ` · ${p.benefit.quantity}` : ''}`;
  }
  if ('discountType' in p.benefit) {
    const base = p.benefit.discountType === 'PERCENTAGE'
      ? `${Number(p.benefit.discountValue)}%`
      : formatRupiah(p.benefit.discountValue);
    return p.benefit.maximumDiscount ? `${base} · maks. ${formatRupiah(p.benefit.maximumDiscount)}` : base;
  }
  return '—';
}

function audienceLabel(audience: PromotionAudience, nthWash: number | null) {
  const label = AUDIENCES.find((item) => item.value === audience)?.label || audience;
  return audience === 'NTH_WASH' && nthWash ? `${label} ${nthWash}` : label;
}

function PromotionCard({ promotion, onEdit, onDelete }: { promotion: Promotion; onEdit: () => void; onDelete: () => void }) {
  const isDiscount = promotion.benefitType === 'DISCOUNT';
  const Icon = promotion.benefitType === 'GIFT' ? Gift : promotion.benefitType === 'FREE_SERVICE' ? TShirt : Tag;
  return (
    <article className="rounded-xl border border-border-subtle bg-surface-container-lowest p-md shadow-card dark:border-outline-variant/20 dark:bg-inverse-surface">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
          <Icon size={22} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary-container px-2 py-1 font-label-md text-label-md font-bold tracking-wide text-on-primary-container">{promotion.code}</span>
            <span className={`rounded-md px-2 py-1 font-label-md text-label-md font-semibold ${promotion.isActive ? 'bg-success-container text-on-success-container' : 'bg-surface-container-high text-on-surface-variant dark:bg-surface-container dark:text-outline-variant'}`}>
              {promotion.isActive ? 'AKTIF' : 'NONAKTIF'}
            </span>
          </div>
          <h2 className="mt-2 truncate font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">{promotion.name}</h2>
          <p className="mt-1 font-body-md text-body-md font-semibold text-primary dark:text-inverse-primary">{benefitLabel(promotion)}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} aria-label={`Ubah ${promotion.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant active:bg-surface-container-low dark:text-outline-variant dark:active:bg-white/5"><PencilSimple size={18} /></button>
          <button type="button" onClick={onDelete} aria-label={`Hapus ${promotion.name}`} className="flex h-9 w-9 items-center justify-center rounded-full text-error active:bg-error-container/50 dark:active:bg-white/5"><Trash size={18} /></button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border-subtle pt-3 font-label-md text-label-md text-on-surface-variant dark:border-outline-variant/20 dark:text-outline-variant">
        <span className="truncate">{audienceLabel(promotion.audience, promotion.nthWash)}</span>
        <span className="truncate text-right">min. {formatRupiah(promotion.minimumPurchase)}</span>
        <span className="col-span-2 truncate">{formatTanggal(promotion.startDate)} – {formatTanggal(promotion.endDate)}</span>
      </div>
      {isDiscount && promotion.audience === 'ALL' && Number(promotion.minimumPurchase) === 0 && (
        <p className="mt-3 rounded-lg bg-warning-container px-3 py-2 font-label-md text-label-md text-on-warning-container">Promo berlaku tanpa syarat minimum belanja.</p>
      )}
    </article>
  );
}

export default function PromotionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState<'all' | 'active' | 'inactive'>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);

  const promotions = useQuery({
    queryKey: ['promotions', search, activeOnly],
    queryFn: async () => {
      const { data } = await api.get<{ data: Paginated<Promotion> }>('/promotions', {
        params: { limit: 100, search: search || undefined, isActive: activeOnly === 'all' ? undefined : activeOnly === 'active' },
      });
      return data.data;
    },
  });
  const branches = useQuery({
    queryKey: ['branches', 'promotion-form'],
    queryFn: async () => (await api.get<{ data: Paginated<Branch> | Branch[] }>('/branches', { params: { limit: 100 } })).data.data,
  });
  const services = useQuery({
    queryKey: ['services', 'promotion-form'],
    queryFn: async () => (await api.get<{ data: Paginated<Service> | Service[] }>('/services', { params: { limit: 100 } })).data.data,
  });

  const branchItems = useMemo(() => asItems(branches.data || []), [branches.data]);
  const serviceItems = useMemo(() => asItems(services.data || []).filter((service) => service.isActive), [services.data]);
  const promoItems = promotions.data?.items || [];

  const save = useMutation({
    mutationFn: async (body: unknown) => editing
      ? api.put(`/promotions/${editing.id}`, body)
      : api.post('/promotions', body),
    onSuccess: () => {
      toast.success(editing ? 'Promo berhasil diperbarui' : 'Promo berhasil dibuat');
      setSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-promos'] });
    },
    onError: (error) => {
      const fieldErrors = apiErrors(error);
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) toast.error(apiMessage(error));
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/promotions/${id}`),
    onSuccess: () => {
      toast.success('Promo berhasil dihapus');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-promos'] });
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  function openCreate() { setEditing(null); setForm(INITIAL_FORM); setErrors({}); setSheetOpen(true); }
  function openEdit(promotion: Promotion) { setEditing(promotion); setForm(promotionForm(promotion)); setErrors({}); setSheetOpen(true); }

  function validate() {
    const next: Record<string, string> = {};
    const code = form.code.trim();
    if (!code) next.code = 'Kode promo wajib diisi.';
    if (!form.name.trim()) next.name = 'Nama promo wajib diisi.';
    if (!form.startDate) next.startDate = 'Tanggal mulai wajib diisi.';
    if (!form.endDate) next.endDate = 'Tanggal berakhir wajib diisi.';
    if (form.startDate && form.endDate && form.startDate > form.endDate) next.endDate = 'Tanggal berakhir harus setelah tanggal mulai.';
    if (Number(form.minimumPurchase) < 0) next.minimumPurchase = 'Minimum belanja tidak boleh negatif.';
    if (form.audience === 'NTH_WASH' && (!Number.isInteger(Number(form.nthWash)) || Number(form.nthWash) < 2)) next.nthWash = 'Isi angka bulat minimal 2.';
    for (const key of ['quota', 'quotaPerCustomer'] as const) {
      if (form[key] && (!Number.isInteger(Number(form[key])) || Number(form[key]) < 1)) next[key] = 'Isi angka bulat minimal 1.';
    }
    if (form.benefitType === 'DISCOUNT') {
      const value = Number(form.discountValue);
      if (!form.discountValue || !Number.isFinite(value) || value <= 0) next.discountValue = 'Nilai diskon harus lebih dari 0.';
      if (form.discountType === 'PERCENTAGE' && value > 100) next.discountValue = 'Persentase tidak boleh lebih dari 100%.';
      if (form.maximumDiscount && Number(form.maximumDiscount) < 0) next.maximumDiscount = 'Maksimum diskon tidak boleh negatif.';
    }
    if (form.benefitType === 'FREE_SERVICE' && !form.serviceId) next.serviceId = 'Pilih layanan yang digratiskan.';
    if (form.benefitType === 'GIFT' && !form.giftName.trim()) next.giftName = 'Nama hadiah wajib diisi.';
    if (form.benefitType !== 'DISCOUNT' && form.quantity && Number(form.quantity) <= 0) next.quantity = 'Jumlah harus lebih dari 0.';
    return next;
  }

  function payload() {
    const common = {
      code: form.code.trim().toUpperCase(), name: form.name.trim(), branchId: form.branchId || null,
      audience: form.audience, nthWash: form.audience === 'NTH_WASH' ? Number(form.nthWash) : null,
      quota: form.quota ? Number(form.quota) : null, quotaPerCustomer: form.quotaPerCustomer ? Number(form.quotaPerCustomer) : null,
      minimumPurchase: Number(form.minimumPurchase || 0), startDate: dateBoundary(form.startDate), endDate: dateBoundary(form.endDate, true),
      isActive: form.isActive, benefitType: form.benefitType,
    };
    if (form.benefitType === 'DISCOUNT') {
      return { ...common, benefit: { discountType: form.discountType, discountValue: Number(form.discountValue), maximumDiscount: form.discountType === 'PERCENTAGE' && form.maximumDiscount ? Number(form.maximumDiscount) : null } };
    }
    if (form.benefitType === 'FREE_SERVICE') return { ...common, benefit: { serviceId: Number(form.serviceId), quantity: form.quantity ? Number(form.quantity) : null } };
    return { ...common, benefit: { giftName: form.giftName.trim(), quantity: form.quantity ? Number(form.quantity) : null } };
  }

  function submit() {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    save.mutate(payload());
  }

  const audienceHint = AUDIENCES.find((item) => item.value === form.audience)?.hint;
  return (
    <>
      <PageHeader title="Promosi" back right={<button type="button" onClick={openCreate} aria-label="Tambah promo" className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary active:bg-on-primary-container"><Plus size={21} weight="bold" /></button>} />
      <section className="sticky top-[56px] z-30 border-b border-border-subtle bg-surface-container-lowest px-4 py-3 dark:border-outline-variant/20 dark:bg-inverse-surface">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari kode atau nama promo…" />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {([
            ['all', 'Semua'], ['active', 'Aktif'], ['inactive', 'Nonaktif'],
          ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setActiveOnly(value)} className={`min-h-9 shrink-0 rounded-full px-3 font-label-md text-label-md font-semibold ${activeOnly === value ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant dark:bg-surface-container dark:text-outline-variant'}`}>{label}</button>)}
        </div>
      </section>
      {promotions.isLoading ? <SkeletonList /> : promoItems.length ? (
        <main className="space-y-3 p-4 pb-24">{promoItems.map((promotion) => <PromotionCard key={promotion.id} promotion={promotion} onEdit={() => openEdit(promotion)} onDelete={() => setDeleteTarget(promotion)} />)}</main>
      ) : <EmptyState icon={Sparkle} title="Belum ada promo" desc={search ? 'Coba kata kunci lain.' : 'Buat promo pertama untuk pelanggan Anda.'} />}

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`${editing ? 'Ubah' : 'Buat'} promo`}>
        <div className="space-y-5">
          <div className="rounded-xl bg-primary-container p-3 text-on-primary-container">
            <div className="flex items-center gap-2 font-body-md text-body-md font-semibold"><Sparkle size={18} weight="fill" /> Aturan promo akan dihitung server saat order dibuat.</div>
            <p className="mt-1 font-label-md text-label-md opacity-80">Pilih manfaat dan syarat yang sesuai; kolom yang tidak relevan tidak dikirim.</p>
          </div>
          <div className="space-y-4">
            <p className="font-label-lg text-label-lg font-bold uppercase tracking-wide text-primary dark:text-inverse-primary">Identitas</p>
            <Field label="Kode promo" error={errors.code}><div className="relative"><input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="HEMAT10" maxLength={50} className={`${inputCls} pr-12 uppercase`} /><Copy size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-outline" /></div></Field>
            <Field label="Nama promo" error={errors.name}><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Diskon pelanggan baru" maxLength={150} className={inputCls} /></Field>
            <Field label="Status"><button type="button" role="switch" aria-checked={form.isActive} onClick={() => set('isActive', !form.isActive)} className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-4 font-body-md text-body-md ${form.isActive ? 'border-success/30 bg-success-container text-on-success-container' : 'border-border-subtle bg-surface-container-low text-on-surface-variant dark:border-outline-variant/20 dark:bg-surface-container dark:text-outline-variant'}`}><span>{form.isActive ? 'Promo langsung aktif' : 'Simpan sebagai nonaktif'}</span><span className={`relative h-6 w-11 rounded-full ${form.isActive ? 'bg-success' : 'bg-outline-variant'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-[left] ${form.isActive ? 'left-6' : 'left-1'}`} /></span></button></Field>
          </div>

          <div className="border-t border-border-subtle pt-5 dark:border-outline-variant/20">
            <p className="font-label-lg text-label-lg font-bold uppercase tracking-wide text-primary dark:text-inverse-primary">Manfaat</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([
                ['DISCOUNT', 'Diskon', Tag], ['FREE_SERVICE', 'Gratis layanan', TShirt], ['GIFT', 'Hadiah', Gift],
              ] as const).map(([value, label, Icon]) => <button key={value} type="button" onClick={() => set('benefitType', value)} className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-xl border px-1 font-label-md text-label-md font-semibold ${form.benefitType === value ? 'border-primary bg-primary-container text-on-primary-container' : 'border-border-subtle bg-surface-container-low text-on-surface-variant dark:border-outline-variant/20 dark:bg-surface-container dark:text-outline-variant'}`}><Icon size={20} weight={form.benefitType === value ? 'fill' : 'regular'} /><span className="text-center leading-tight">{label}</span></button>)}
            </div>
            {form.benefitType === 'DISCOUNT' && <div className="mt-4 space-y-4">
              <Field label="Jenis diskon"><select value={form.discountType} onChange={(e) => set('discountType', e.target.value as FormState['discountType'])} className={inputCls}><option value="PERCENTAGE">Persentase (%)</option><option value="FIXED_AMOUNT">Nominal rupiah</option></select></Field>
              <Field label={form.discountType === 'PERCENTAGE' ? 'Nilai diskon (%)' : 'Nilai diskon (Rp)'} error={errors.discountValue}><input type="number" min="0" inputMode="decimal" value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} placeholder={form.discountType === 'PERCENTAGE' ? '10' : '10000'} className={inputCls} /></Field>
              {form.discountType === 'PERCENTAGE' && <Field label="Maksimum diskon (Rp)" error={errors.maximumDiscount}><input type="number" min="0" inputMode="decimal" value={form.maximumDiscount} onChange={(e) => set('maximumDiscount', e.target.value)} placeholder="Opsional" className={inputCls} /></Field>}
            </div>}
            {form.benefitType === 'FREE_SERVICE' && <div className="mt-4 space-y-4">
              <Field label="Layanan yang digratiskan" error={errors.serviceId}><select value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)} className={inputCls}><option value="">— Pilih layanan aktif —</option>{serviceItems.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatRupiah(service.price)}</option>)}</select></Field>
              <Field label="Jumlah gratis"><input type="number" min="0" step="0.01" inputMode="decimal" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="Kosongkan untuk seluruh jumlah layanan" className={inputCls} /><span className="mt-1 block font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">Kosong = seluruh baris layanan tersebut gratis.</span></Field>
            </div>}
            {form.benefitType === 'GIFT' && <div className="mt-4 space-y-4">
              <Field label="Nama hadiah" error={errors.giftName}><input value={form.giftName} onChange={(e) => set('giftName', e.target.value)} placeholder="Tote bag" maxLength={150} className={inputCls} /></Field>
              <Field label="Jumlah hadiah" error={errors.quantity}><input type="number" min="0" step="0.01" inputMode="decimal" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="Opsional" className={inputCls} /></Field>
            </div>}
          </div>

          <div className="border-t border-border-subtle pt-5 dark:border-outline-variant/20">
            <p className="font-label-lg text-label-lg font-bold uppercase tracking-wide text-primary dark:text-inverse-primary">Syarat & periode</p>
            <div className="mt-4 space-y-4">
              <Field label="Berlaku di cabang"><select value={form.branchId} onChange={(e) => set('branchId', e.target.value)} className={inputCls}><option value="">Semua cabang</option>{branchItems.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></Field>
              <Field label="Target pelanggan"><select value={form.audience} onChange={(e) => set('audience', e.target.value as PromotionAudience)} className={inputCls}>{AUDIENCES.map((audience) => <option key={audience.value} value={audience.value}>{audience.label}</option>)}</select><span className="mt-1 block font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{audienceHint}</span></Field>
              {form.audience === 'NTH_WASH' && <Field label="Setiap cuci ke-" error={errors.nthWash}><input type="number" min="2" step="1" inputMode="numeric" value={form.nthWash} onChange={(e) => set('nthWash', e.target.value)} placeholder="5" className={inputCls} /></Field>}
              <Field label="Minimum belanja (Rp)" error={errors.minimumPurchase}><input type="number" min="0" inputMode="decimal" value={form.minimumPurchase} onChange={(e) => set('minimumPurchase', e.target.value)} className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-3"><Field label="Kuota total" error={errors.quota}><input type="number" min="1" step="1" inputMode="numeric" value={form.quota} onChange={(e) => set('quota', e.target.value)} placeholder="Tanpa batas" className={inputCls} /></Field><Field label="Kuota / pelanggan" error={errors.quotaPerCustomer}><input type="number" min="1" step="1" inputMode="numeric" value={form.quotaPerCustomer} onChange={(e) => set('quotaPerCustomer', e.target.value)} placeholder="Tanpa batas" className={inputCls} /></Field></div>
              <div className="grid grid-cols-2 gap-3"><Field label="Mulai" error={errors.startDate}><div className="relative"><input type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} className={`${inputCls} pr-2`} /><CalendarBlank size={17} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline" /></div></Field><Field label="Berakhir" error={errors.endDate}><input type="date" value={form.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></Field></div>
            </div>
          </div>
          <button type="button" onClick={submit} disabled={save.isPending} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-body-lg text-body-lg font-bold text-on-primary active:bg-on-primary-container disabled:opacity-50">{save.isPending ? 'Menyimpan…' : <><Sparkle size={19} weight="fill" /> {editing ? 'Simpan perubahan' : 'Buat promo'}</>}</button>
        </div>
      </BottomSheet>
      <ConfirmDialog open={!!deleteTarget} title="Hapus promo?" message={`Promo ${deleteTarget?.code || ''} akan dihapus permanen. Promo yang sudah dipakai pada order mungkin tidak dapat dihapus.`} loading={remove.isPending} onCancel={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)} />
    </>
  );
}
