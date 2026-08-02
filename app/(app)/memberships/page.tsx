'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/page-header';
import SkeletonList from '@/components/skeleton-list';
import EmptyState from '@/components/empty-state';
import BottomSheet from '@/components/bottom-sheet';
import SearchInput from '@/components/search-input';
import { membershipsApi, membershipTiersApi } from '@/lib/api';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import type { MembershipStatus } from '@/lib/types';
import { MEMBER_BADGE, MEMBER_LABEL } from '@/lib/labels';
import { Crown, FunnelSimple, CircleNotch } from '@phosphor-icons/react';

export default function MembershipsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<MembershipStatus | undefined>();
  const [tierId, setTierId] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  // Draft: perubahan filter baru berlaku saat "Terapkan" (konsisten dgn halaman Order).
  const [draftStatus, setDraftStatus] = useState<MembershipStatus | undefined>();
  const [draftTierId, setDraftTierId] = useState('');

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 400); return () => clearTimeout(t); }, [search]);

  const params = useMemo(() => ({ search: debounced || undefined, status, tierId: tierId || undefined, limit: 15 }), [debounced, status, tierId]);
  const query = useInfiniteQuery({
    queryKey: ['memberships', params],
    queryFn: ({ pageParam }) => membershipsApi.list({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const { data: tiers } = useQuery({ queryKey: ['tiers-all'], queryFn: () => membershipTiersApi.list({ limit: 100 }) });

  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); });
    obs.observe(el); return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const activeCount = (status ? 1 : 0) + (tierId ? 1 : 0);

  return (
    <>
      <PageHeader title="Membership" right={
        <button onClick={() => { setDraftStatus(status); setDraftTierId(tierId); setFilterOpen(true); }} className="relative flex h-10 w-10 items-center justify-center rounded-full active:bg-surface-container-low dark:active:bg-white/5" aria-label="Filter">
          <FunnelSimple size={20} weight={activeCount > 0 ? 'fill' : 'regular'} className={activeCount > 0 ? 'text-primary dark:text-inverse-primary' : undefined} />
          {activeCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary font-label-md text-label-md font-bold text-on-primary">{activeCount}</span>}
        </button>
      } />
      <div className="glass-strong sticky top-[56px] z-30 px-4 py-2">
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / telepon…" />
      </div>
      {query.isLoading ? <SkeletonList /> : (
        <div className="space-y-3 p-4">
          {(query.data?.pages || []).flatMap((p) => p.items).map((m) => (
            <Link key={m.id} href={`/memberships/${m.id}`} className="block overflow-hidden rounded-xl border border-border-subtle dark:border-outline-variant/20 shadow-card transition-transform duration-150 active:scale-[0.98]">
              <div className="flex items-center justify-between border-b border-border-subtle dark:border-outline-variant/20 bg-surface-container-low dark:bg-white/5 px-md py-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container/10 font-headline-md text-[11px] font-bold text-primary dark:bg-primary-container/20">
                    {m.customerName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
                  </span>
                  <span className="font-body-lg text-body-lg font-medium text-on-surface dark:text-inverse-on-surface">{m.customerName}</span>
                </div>
                <span className={`rounded-md px-2 py-0.5 font-label-md text-label-md ${MEMBER_BADGE[m.status]}`}>{MEMBER_LABEL[m.status]}</span>
              </div>
              <div className="flex items-center justify-between p-md">
                <div>
                  <p className="flex items-center gap-1 font-body-md text-body-md text-secondary dark:text-outline-variant">
                    <Crown size={13} weight="duotone" />{m.tier?.name} · {m.phoneNumber}
                  </p>
                  <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">Exp {formatTanggal(m.expiresAt)}</p>
                </div>
                <span className="font-data-tabular text-data-tabular font-semibold tabular-nums text-primary dark:text-inverse-primary">{formatRupiah(m.balance)}</span>
              </div>
            </Link>
          ))}
          {!(query.data?.pages[0]?.items?.length) && <EmptyState icon={Crown} title="Belum ada member" desc={activeCount || debounced ? 'Coba ubah kata kunci atau filter' : undefined} />}
          <div ref={sentinel} className="h-4" />
          {query.isFetchingNextPage && <p className="flex items-center justify-center gap-1.5 py-2 text-center font-label-md text-label-md text-outline dark:text-outline-variant"><CircleNotch size={14} className="animate-spin" /> Memuat…</p>}
        </div>
      )}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Member">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Status</p>
            <div className="flex gap-2">
              {(['ACTIVE', 'EXPIRED', 'BLOCKED'] as MembershipStatus[]).map((s) => (
                <button key={s} onClick={() => setDraftStatus(draftStatus === s ? undefined : s)}
                  className={`min-h-[36px] flex-1 rounded-full text-xs font-medium ${draftStatus === s ? 'bg-primary text-on-primary' : 'bg-surface-container dark:bg-white/10 text-on-surface-variant dark:text-outline-variant'}`}>
                  {MEMBER_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Tier</p>
            <select value={draftTierId} onChange={(e) => setDraftTierId(e.target.value)} className="min-h-[44px] w-full rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md">
              <option value="">Semua tier</option>
              {(tiers?.items || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => { setDraftStatus(undefined); setDraftTierId(''); setStatus(undefined); setTierId(''); setFilterOpen(false); }}
              className="min-h-[48px] rounded-md border border-border-subtle dark:border-outline-variant/25 font-medium">Reset</button>
            <button onClick={() => { setStatus(draftStatus); setTierId(draftTierId); setFilterOpen(false); }}
              className="min-h-[48px] rounded-md bg-primary font-semibold text-on-primary">Terapkan</button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
