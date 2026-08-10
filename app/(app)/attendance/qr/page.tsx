'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { DownloadSimple, Infinity as InfinityIcon, Power, QrCode } from '@phosphor-icons/react';
import PageHeader from '@/components/page-header';
import ConfirmDialog from '@/components/confirm-dialog';
import Field, { inputCls } from '@/components/field';
import { attendanceApi, branchesApi } from '@/lib/api';
import { apiMessage } from '@/lib/api/client';
import { formatTanggal } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import type { AttendanceQrCode } from '@/lib/types';

function qrFileName(qr: AttendanceQrCode): string {
  const branch = (qr.branch?.name || `cabang-${qr.branchId}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `qr-presensi-${branch || qr.branchId}.png`;
}

function PermanentQrCard({ qr, onDeactivate, deactivating }: {
  qr: AttendanceQrCode;
  onDeactivate: (qr: AttendanceQrCode) => void;
  deactivating: boolean;
}) {
  const [image, setImage] = useState('');

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qr.qrToken, { width: 480, margin: 2 })
      .then((dataUrl) => { if (!cancelled) setImage(dataUrl); })
      .catch(() => { if (!cancelled) setImage(''); });
    return () => { cancelled = true; };
  }, [qr.qrToken]);

  return (
    <article className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{qr.branch?.name || `Cabang ${qr.branchId}`}</p>
          <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">
            Dibuat {formatTanggal(qr.createdAt, true)}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-success-container px-2.5 py-1 font-label-md text-label-md font-medium text-on-success-container">
          <InfinityIcon size={14} weight="bold" /> Permanen
        </span>
      </div>

      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`QR presensi permanen ${qr.branch?.name || qr.branchId}`} className="mx-auto my-4 w-52 rounded-xl bg-white p-2" />
          <div className="grid grid-cols-2 gap-2">
            <a
              href={image}
              download={qrFileName(qr)}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-primary px-3 font-body-md text-body-md font-semibold text-primary active:bg-primary-container/10"
            >
              <DownloadSimple size={18} weight="bold" /> Unduh
            </a>
            <button
              type="button"
              onClick={() => onDeactivate(qr)}
              disabled={deactivating}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-error px-3 font-body-md text-body-md font-semibold text-on-error active:bg-on-error-container disabled:opacity-50"
            >
              <Power size={18} weight="bold" /> Hapus QR
            </button>
          </div>
        </>
      ) : (
        <div className="my-4 flex h-52 items-center justify-center rounded-xl bg-surface-container-low text-outline dark:bg-white/5 dark:text-outline-variant">
          <QrCode size={42} className="animate-pulse" />
        </div>
      )}

      <p className="mt-3 break-all rounded bg-surface-container-low p-2 font-label-md text-label-md text-outline dark:bg-white/5 dark:text-outline-variant">
        {qr.qrToken}
      </p>
      <p className="mt-2 font-label-md text-label-md text-outline dark:text-outline-variant">
        Dipakai {qr._count?.attendances || 0} kali untuk presensi.
      </p>
    </article>
  );
}

export default function AttendanceQrPage() {
  const qc = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [generated, setGenerated] = useState<AttendanceQrCode | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AttendanceQrCode | null>(null);

  const { data: branches } = useQuery({
    queryKey: ['branches-all'],
    queryFn: () => branchesApi.list({ limit: 100 }),
  });
  const { data: qrCodes, isLoading } = useQuery({
    queryKey: ['attendance-qr'],
    queryFn: attendanceApi.qrCodes,
  });

  const create = useMutation({
    mutationFn: () => attendanceApi.createQr(branchId),
    onSuccess: (qr) => {
      setGenerated(qr);
      qc.invalidateQueries({ queryKey: ['attendance-qr'] });
      toast.success('QR presensi permanen dibuat');
    },
    onError: (error) => toast.error(apiMessage(error)),
  });
  const deactivate = useMutation({
    mutationFn: (qr: AttendanceQrCode) => attendanceApi.deactivateQr(qr.id),
    onSuccess: (_, qr) => {
      setDeactivateTarget(null);
      if (generated?.id === qr.id) setGenerated(null);
      qc.invalidateQueries({ queryKey: ['attendance-qr'] });
      toast.success('QR berhasil dihapus');
    },
    onError: (error) => toast.error(apiMessage(error)),
  });

  useEffect(() => { setGenerated(null); }, [branchId]);

  return (
    <>
      <PageHeader title="QR Presensi" back />
      <div className="space-y-5 p-4">
        <section className="space-y-4 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-5 shadow-card">
          <div className="flex items-start gap-3 rounded-xl bg-primary-container/10 p-3 text-primary dark:bg-primary-container/20">
            <InfinityIcon size={22} weight="bold" className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">QR berlaku permanen</p>
              <p className="mt-1 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">
                QR dapat digunakan setiap hari sampai dihapus oleh admin.
              </p>
            </div>
          </div>
          <Field label="Cabang">
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={inputCls}>
              <option value="">— Pilih cabang —</option>
              {(branches?.items || []).map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </Field>
          <button
            onClick={() => create.mutate()}
            disabled={!branchId || create.isPending}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-on-primary transition-colors active:bg-on-primary-container disabled:opacity-50"
          >
            <QrCode size={20} weight="bold" /> {create.isPending ? 'Membuat…' : 'Generate QR Permanen'}
          </button>
        </section>

        {generated && (
          <section>
            <h2 className="mb-3 font-semibold">QR Baru Dibuat</h2>
            <PermanentQrCard qr={generated} onDeactivate={setDeactivateTarget} deactivating={deactivate.isPending} />
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">QR Permanen Aktif</h2>
              <p className="mt-0.5 font-label-md text-label-md text-outline dark:text-outline-variant">Gambar dibuat ulang dari token dan tetap muncul setelah reload.</p>
            </div>
            {qrCodes?.length ? (
              <span className="shrink-0 rounded-full bg-primary-container/10 px-2.5 py-1 font-label-md text-label-md font-medium text-primary dark:bg-primary-container/20">
                {qrCodes.length} QR
              </span>
            ) : null}
          </div>
          <div className="space-y-3">
            {(qrCodes || []).map((qr) => (
              <PermanentQrCard key={qr.id} qr={qr} onDeactivate={setDeactivateTarget} deactivating={deactivate.isPending} />
            ))}
            {isLoading && <p className="py-6 text-center font-body-md text-body-md text-outline dark:text-outline-variant">Memuat QR…</p>}
            {!isLoading && !qrCodes?.length && (
              <p className="rounded-xl border border-dashed border-border-subtle p-6 text-center font-body-md text-body-md text-outline dark:border-outline-variant/20 dark:text-outline-variant">
                Belum ada QR permanen aktif.
              </p>
            )}
          </div>
        </section>
      </div>
      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Hapus QR ini?"
        message={`QR ${deactivateTarget?.branch?.name || ''} tidak bisa dipakai lagi setelah dihapus. Riwayat presensi yang sudah tercatat tetap tersimpan.`}
        loading={deactivate.isPending}
        confirmLabel="Hapus"
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivate.mutate(deactivateTarget)}
      />
    </>
  );
}
