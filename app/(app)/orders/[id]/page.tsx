'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/page-header';
import BottomSheet from '@/components/bottom-sheet';
import { ordersApi } from '@/lib/api';
import { apiMessage } from '@/lib/api/client';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import { STATUS_BADGE, STATUS_LABEL, STATUS_DOT, PAYMENT_LABEL, ORDER_FLOW } from '@/lib/labels';
import type { OrderStatus } from '@/lib/types';
import { toast } from '@/hooks/useToast';
import SkeletonList from '@/components/skeleton-list';

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const qc = useQueryClient();
  const [sheet, setSheet] = useState(false);
  const { data: order, isLoading } = useQuery({ queryKey: ['order', params.id], queryFn: () => ordersApi.get(params.id) });
  const mutation = useMutation({
    mutationFn: ({ status }: { status: OrderStatus }) => ordersApi.updateStatus(params.id, status),
    onSuccess: () => {
      toast.success('Status diperbarui');
      setSheet(false);
      qc.invalidateQueries({ queryKey: ['order', params.id] });
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  if (isLoading || !order) return <><PageHeader title="Detail Order" back /><SkeletonList rows={5} /></>;
  const currentIdx = ORDER_FLOW.indexOf(order.status);
  const isTerminal = order.status === 'DIAMBIL' || order.status === 'CANCELLED';
  const nextOptions = !isTerminal ? [ORDER_FLOW[currentIdx + 1], 'CANCELLED' as OrderStatus].filter(Boolean) : [];

  return (
    <>
      <PageHeader title={order.invoiceNumber} back />
      <div className="space-y-4 p-4 pb-28">
        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <p className="font-label-md text-label-md uppercase tracking-wide text-outline dark:text-outline-variant">Customer</p>
          <div className="mt-2 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-container/10 font-headline-md text-sm font-bold text-primary dark:bg-primary-container/20">
                {order.customerName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')}
              </span>
              <div>
                <p className="text-lg font-bold">{order.customerName}</p>
                  <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{order.phoneNumber}</p>
                  {order.address && <p className="mt-1 font-body-md text-body-md text-outline dark:text-outline-variant">{order.address}</p>}
                </div>
            </div>
            <span className={`chip font-semibold ${STATUS_BADGE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
          </div>
          <div className="mt-4 space-y-1 border-t border-dashed border-border-subtle pt-3 font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">
            <p>Cabang: <b className="text-on-surface dark:text-inverse-on-surface">{order.branch?.name}</b></p>
            <p>Kasir: <b className="text-on-surface dark:text-inverse-on-surface">{order.staff?.fullName}</b></p>
            <p>Metode: <b className="text-on-surface dark:text-inverse-on-surface">{PAYMENT_LABEL[order.paymentMethod]}</b></p>
            <p>Dibuat: {formatTanggal(order.createdAt, true)}</p>
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <h3 className="mb-3 font-semibold">Item Layanan</h3>
          <div className="space-y-2">
            {order.items?.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <span>{it.service?.name} <span className="text-outline dark:text-outline-variant">× {Number(it.quantity)}</span></span>
                <b>{formatRupiah(it.subtotal)}</b>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-dashed pt-3 text-sm">
            <div className="flex justify-between text-on-surface-variant dark:text-outline-variant"><span>Subtotal</span><span>{formatRupiah(order.subtotal)}</span></div>
            {Number(order.discountAmount) > 0 && <div className="flex justify-between text-success"><span>Diskon {order.promotion ? `(${order.promotion.code})` : ''}</span><span>-{formatRupiah(order.discountAmount)}</span></div>}
            {Number(order.membershipAmountUsed) > 0 && <div className="flex justify-between text-primary dark:text-inverse-primary"><span>Saldo membership</span><span>-{formatRupiah(order.membershipAmountUsed)}</span></div>}
            <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{formatRupiah(order.totalAmount)}</span></div>
          </div>
        </section>

        <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
          <h3 className="mb-4 font-semibold">Riwayat Status</h3>
          <ol className="relative">
            {(order.logs || []).map((log, i) => {
              const isLatest = i === (order.logs?.length ?? 0) - 1;
              const color = STATUS_DOT[log.status];
              return (
                <li key={log.id} className="relative pb-6 pl-8 last:pb-0">
                  {/* garis vertikal penghubung */}
                  {i < (order.logs?.length ?? 0) - 1 && (
                    <span className="absolute left-[7px] top-5 h-full w-px bg-border-subtle dark:bg-outline-variant/25" />
                  )}
                  <span
                    className={`absolute left-0 top-0.5 h-4 w-4 rounded-full border-2 border-surface-container-lowest dark:border-inverse-surface ${isLatest ? 'ring-4 ring-primary-container dark:ring-primary/25' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-sm font-semibold">{STATUS_LABEL[log.status]}</p>
                  <p className="font-label-md text-label-md text-outline dark:text-outline-variant">{log.staff?.fullName} · {formatTanggal(log.createdAt, true)}</p>
                  {log.notes && <p className="mt-0.5 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{log.notes}</p>}
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      {!isTerminal && nextOptions.length > 0 && (
        <div className="glass-strong fixed inset-x-0 bottom-16 z-40 mx-auto max-w-md p-4 safe-bottom">
          <button onClick={() => setSheet(true)} className="min-h-[48px] w-full rounded-md bg-primary font-semibold text-on-primary transition-colors active:bg-on-primary-container">
            Ubah Status
          </button>
        </div>
      )}

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Ubah Status Order">
        <div className="space-y-2">
          {nextOptions.map((s) => (
            <button key={s} disabled={mutation.isPending} onClick={() => mutation.mutate({ status: s })}
              className={`flex min-h-[48px] w-full items-center justify-between rounded-md border px-md text-left font-medium active:bg-surface-container-low dark:active:bg-white/5 disabled:opacity-50 ${s === 'CANCELLED' ? 'border-error/40 text-error' : 'border-border-subtle dark:border-outline-variant/25'}`}>
              {STATUS_LABEL[s]}
              <span className={`chip font-semibold ${STATUS_BADGE[s]}`}>{STATUS_LABEL[s]}</span>
            </button>
          ))}
          <p className="pt-2 font-label-md text-label-md text-outline dark:text-outline-variant">Status hanya bisa maju satu langkah sesuai alur, atau dibatalkan.</p>
        </div>
      </BottomSheet>
    </>
  );
}
