'use client';
import { useEffect, useId, useRef } from 'react';

export default function ConfirmDialog({ open, title, message, loading, confirmLabel = 'Hapus', onCancel, onConfirm }: {
  open: boolean; title: string; message?: string; loading?: boolean;
  confirmLabel?: string; onCancel: () => void; onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] mx-auto flex max-w-md items-center justify-center px-8">
      <button aria-label="Tutup dialog" className="animate-fade-in absolute inset-0 w-full bg-black/40" onClick={onCancel} />
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={message ? descriptionId : undefined}
        className="animate-dialog-in glass-strong relative w-full rounded-3xl p-6 shadow-xl">
        <h3 id={titleId} className="text-base font-semibold">{title}</h3>
        {message && <p id={descriptionId} className="mt-2 font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button ref={cancelRef} onClick={onCancel} className="min-h-[44px] rounded-md border border-border-subtle dark:border-outline-variant/25 font-medium active:bg-surface-container-low dark:active:bg-white/5">Batal</button>
          <button onClick={onConfirm} disabled={loading} className="min-h-[44px] rounded-md bg-error font-medium text-on-error transition-colors active:bg-on-error-container disabled:opacity-50">
            {loading ? `${confirmLabel}…` : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
