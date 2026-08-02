'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import PageHeader from '@/components/page-header';
import Field, { inputCls } from '@/components/field';
import { attendanceApi, branchesApi } from '@/lib/api';
import { apiMessage } from '@/lib/api/client';
import { formatTanggal } from '@/lib/utils';
import { toast } from '@/hooks/useToast';
import type { AttendanceQrCode } from '@/lib/types';

export default function AttendanceQrPage() {
  const qc = useQueryClient();
  const [branchId, setBranchId] = useState('');
  const [validHours, setValidHours] = useState('8');
  const [qrImage, setQrImage] = useState('');
  const [generated, setGenerated] = useState<AttendanceQrCode | null>(null);

  const { data: branches } = useQuery({ queryKey: ['branches-all'], queryFn: () => branchesApi.list({ limit: 100 }) });
  const { data: qrCodes } = useQuery({ queryKey: ['attendance-qr'], queryFn: attendanceApi.qrCodes });

  const create = useMutation({
    mutationFn: () => attendanceApi.createQr(branchId, Math.min(24, Math.max(1, Number(validHours) || 1))),
    onSuccess: async (qr) => {
      setGenerated(qr);
      setQrImage(await QRCode.toDataURL(qr.qrToken, { width: 480, margin: 2 }));
      qc.invalidateQueries({ queryKey: ['attendance-qr'] });
      toast.success('QR presensi dibuat');
    },
    onError: (e) => toast.error(apiMessage(e)),
  });

  useEffect(() => { setGenerated(null); setQrImage(''); }, [branchId]);

  return (
    <>
      <PageHeader title="QR Presensi" back />
      <div className="space-y-5 p-4">
        <section className="space-y-4 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-5 shadow-card">
          <Field label="Cabang">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              <option value="">— Pilih cabang —</option>
              {(branches?.items || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Berlaku (jam)">
            <input type="number" min={1} max={24} value={validHours} onChange={(e) => setValidHours(e.target.value)} className={inputCls} />
          </Field>
          <button onClick={() => create.mutate()} disabled={!branchId || create.isPending}
            className="min-h-[48px] w-full rounded-md bg-primary font-semibold text-on-primary transition-colors active:bg-on-primary-container disabled:opacity-50">
            {create.isPending ? 'Membuat…' : 'Generate QR'}
          </button>
        </section>

        {generated && qrImage && (
          <section className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-6 text-center shadow-card">
            <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">Scan QR ini untuk presensi di</p>
            <p className="mt-1 text-lg font-bold">{generated.branch?.name || (branches?.items || []).find((b) => b.id === generated.branchId)?.name}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImage} alt="QR Presensi" className="mx-auto my-5 w-64 rounded-xl" />
            <p className="break-all rounded bg-surface-container-low dark:bg-white/5 p-2 font-label-md text-label-md text-outline dark:text-outline-variant">{generated.qrToken}</p>
            <p className="mt-3 font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">
              Berlaku: {formatTanggal(generated.validFrom, true)} — {formatTanggal(generated.validUntil, true)}
            </p>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">QR Aktif Sebelumnya</h2>
            {qrCodes?.length ? (
              <span className="rounded-full bg-primary-container/10 px-2.5 py-1 font-label-md text-label-md font-medium text-primary dark:bg-primary-container/20">
                {qrCodes.length} QR
              </span>
            ) : null}
          </div>
          <div className="space-y-2">
            {qrCodes?.map((qr) => (
              <div key={qr.id} className="rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card">
                <p className="font-medium">{qr.branch?.name}</p>
                <p className="mt-1 font-label-md text-label-md text-outline dark:text-outline-variant">
                  {formatTanggal(qr.validFrom, true)} — {formatTanggal(qr.validUntil, true)}
                </p>
              </div>
            ))}
            {!qrCodes?.length && <p className="font-body-md text-body-md text-outline dark:text-outline-variant">Belum ada QR dibuat.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
