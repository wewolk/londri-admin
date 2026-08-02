'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/page-header';
import SkeletonList from '@/components/skeleton-list';
import EmptyState from '@/components/empty-state';
import { attendanceApi, branchesApi, staffsApi } from '@/lib/api';
import { formatTanggal } from '@/lib/utils';
import type { AttendanceType } from '@/lib/types';
import { SignIn, SignOut, ClipboardText } from '@phosphor-icons/react';
import { useRef } from 'react';

export default function AttendancePage() {
  const [branchId, setBranchId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [type, setType] = useState<AttendanceType | ''>('');
  const [date, setDate] = useState('');

  const params = useMemo(() => ({ branchId: branchId || undefined, staffId: staffId || undefined, attendanceType: type || undefined, date: date || undefined, limit: 20 }), [branchId, staffId, type, date]);
  const query = useInfiniteQuery({
    queryKey: ['attendance', params],
    queryFn: ({ pageParam }) => attendanceApi.list({ ...params, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
  });
  const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => branchesApi.list({ limit: 100 }) });
  const { data: staffs } = useQuery({ queryKey: ['staffs-all'], queryFn: () => staffsApi.list({ limit: 100 }) });

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage(); });
    obs.observe(el); return () => obs.disconnect();
  }, [query]);

  return (
    <>
      <PageHeader title="Presensi" back right={
        <Link href="/attendance/qr" className="flex h-10 items-center rounded-md bg-primary px-3 font-body-md text-body-md font-semibold text-on-primary transition-colors active:bg-on-primary-container">
          + QR
        </Link>
      } />
      <div className="glass-strong space-y-2 px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="min-h-[44px] rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md">
            <option value="">Semua cabang</option>
            {(branches?.items || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className="min-h-[44px] rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md">
            <option value="">Semua staff</option>
            {(staffs?.items || []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={type} onChange={(e) => setType(e.target.value as AttendanceType | '')} className="min-h-[44px] rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md">
            <option value="">Semua tipe</option>
            <option value="CHECK_IN">Check-in</option>
            <option value="CHECK_OUT">Check-out</option>
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="min-h-[44px] rounded-md border border-border-subtle dark:border-outline-variant/25 bg-surface-container-lowest dark:bg-inverse-surface px-3 font-body-md text-body-md" />
        </div>
      </div>
      {query.isLoading ? <SkeletonList /> : (
        <div className="space-y-2 p-4">
          {(query.data?.pages || []).flatMap((p) => p.items).map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${a.attendanceType === 'CHECK_IN' ? 'bg-success-container text-on-success-container' : 'bg-warning-container text-on-warning-container'}`}>
                {a.attendanceType === 'CHECK_IN' ? <SignIn size={20} weight='bold' /> : <SignOut size={20} weight='bold' />}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{a.staff?.fullName}</p>
                <p className="font-label-md text-label-md text-outline dark:text-outline-variant">{a.branch?.name} · {a.attendanceType === 'CHECK_IN' ? 'Masuk' : 'Keluar'}</p>
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{formatTanggal(a.scannedAt, true)}</p>
            </div>
          ))}
          {!(query.data?.pages[0]?.items?.length) && <EmptyState icon={ClipboardText} title="Belum ada presensi" />}
          <div ref={sentinel} className="h-4" />
        </div>
      )}
    </>
  );
}
