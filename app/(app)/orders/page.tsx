'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/page-header';
import SkeletonList from '@/components/skeleton-list';
import EmptyState from '@/components/empty-state';
import BottomSheet from '@/components/bottom-sheet';
import SearchInput from '@/components/search-input';
import { FunnelSimple, Basket, CircleNotch } from '@phosphor-icons/react';
import { ordersApi, branchesApi, OrderFilters } from '@/lib/api';
import { formatRupiah, formatRelatif } from '@/lib/utils';
import type { OrderStatus, PaymentMethod } from '@/lib/types';
import { STATUS_BADGE, STATUS_LABEL, PAYMENT_LABEL } from '@/lib/labels';

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];
const PAYMENTS = Object.keys(PAYMENT_LABEL) as PaymentMethod[];

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [draft, setDraft] = useState<OrderFilters>({});

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => ({ ...filters, search: debounced || undefined, limit: 15 }), [filters, debounced]);
  const query = useInfiniteQuery({
    queryKey: ['orders', params],
    queryFn: ({ pageParam }) => ordersApi.list({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => branchesApi.list({ limit: 100 }) });

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <>
      <PageHeader title="Order" right={
        <button onClick={() => { setDraft(filters); setFilterOpen(true); }}
          className="relative flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-container-low dark:active:bg-white/5" aria-label="Filter">
          <FunnelSimple size={20} weight={activeCount > 0 ? 'fill' : 'regular'} className={activeCount > 0 ? 'text-primary dark:text-inverse-primary' : undefined} />
          {activeCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-label-md text-label-md font-bold text-on-primary">{activeCount}</span>}
        </button>
      } />
      <div className="glass-strong sticky top-[56px] z-30 px-4 py-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari invoice / pelanggan…" />
        <div className="no-scrollbar -mx-4 mt-2 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto overscroll-x-contain px-4 pb-0.5">
          <button onClick={() => setFilters({ ...filters, status: undefined })}
            className={`min-h-[32px] shrink-0 rounded-full px-3 text-xs font-medium transition-colors ${!filters.status ? 'bg-on-surface text-inverse-on-surface dark:bg-inverse-on-surface dark:text-on-surface' : 'bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline-variant'}`}>
            Semua
          </button>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setFilters({ ...filters, status: filters.status === s ? undefined : s })}
              className={`min-h-[32px] shrink-0 rounded-full px-3 text-xs font-medium transition-colors ${filters.status === s ? 'bg-primary text-on-primary' : 'bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline-variant'}`}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? <SkeletonList /> : (
        <div className="space-y-3 p-4">
          {(query.data?.pages || []).flatMap((p) => p.items).map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="block overflow-hidden rounded-xl border border-border-subtle dark:border-outline-variant/20 shadow-card transition-transform duration-150 active:scale-[0.98]">
              <div className="flex items-center justify-between border-b border-border-subtle dark:border-outline-variant/20 bg-surface-container-low dark:bg-white/5 px-md py-2.5">
                <span className="font-data-tabular text-data-tabular font-semibold text-on-surface dark:text-inverse-on-surface">{o.invoiceNumber}</span>
                <span className={`rounded-md px-2 py-0.5 font-label-md text-label-md ${STATUS_BADGE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
              </div>
              <div className="p-md">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-body-lg text-body-lg font-medium text-on-surface dark:text-inverse-on-surface">{o.customerName}</h3>
                    <p className="mt-0.5 font-body-md text-body-md text-secondary dark:text-outline-variant">{o.branch?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-data-tabular text-data-tabular font-semibold text-on-surface dark:text-inverse-on-surface">{formatRupiah(o.totalAmount)}</p>
                    <p className="font-label-md text-label-md text-outline dark:text-outline-variant">{formatRelatif(o.createdAt)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {!(query.data?.pages[0]?.items?.length) && <EmptyState icon={Basket} title="Belum ada order" desc={activeCount || debounced ? 'Coba ubah kata kunci atau filter' : 'Order akan muncul di sini'} />}
          <div ref={sentinel} className="h-4" />
          {query.isFetchingNextPage && <p className="flex items-center justify-center gap-1.5 py-2 text-center font-label-md text-label-md text-outline dark:text-outline-variant"><CircleNotch size={14} className="animate-spin" /> Memuat…</p>}
        </div>
      )}

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Order">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Cabang</p>
            <select value={draft.branchId || ''} onChange={(e) => setDraft({ ...draft, branchId: e.target.value || undefined })}
              className="min-h-[44px] w-full rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md">
              <option value="">Semua cabang</option>
              {(branches?.items || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setDraft({ ...draft, status: draft.status === s ? undefined : s })}
                  className={`min-h-[36px] rounded-full px-3 text-xs font-medium ${draft.status === s ? 'bg-primary text-on-primary' : 'bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline-variant'}`}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Metode bayar</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENTS.map((p) => (
                <button key={p} onClick={() => setDraft({ ...draft, paymentMethod: draft.paymentMethod === p ? undefined : p })}
                  className={`min-h-[36px] rounded-full px-3 text-xs font-medium ${draft.paymentMethod === p ? 'bg-primary text-on-primary' : 'bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline-variant'}`}>
                  {PAYMENT_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-sm font-medium">Dari tanggal</p>
              <input type="date" value={draft.dateFrom || ''} onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value || undefined })}
                className="min-h-[44px] w-full rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md" />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Sampai</p>
              <input type="date" value={draft.dateTo || ''} onChange={(e) => setDraft({ ...draft, dateTo: e.target.value || undefined })}
                className="min-h-[44px] w-full rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => { setDraft({}); setFilters({}); setFilterOpen(false); }}
              className="min-h-[48px] rounded-md border border-border-subtle dark:border-outline-variant/25 font-medium">Reset</button>
            <button onClick={() => { setFilters(draft); setFilterOpen(false); }}
              className="min-h-[48px] rounded-md bg-primary font-semibold text-on-primary">Terapkan</button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
