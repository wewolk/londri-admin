'use client';
export default function ConfirmDialog({ open, title, message, loading, onCancel, onConfirm }: {
  open: boolean; title: string; message?: string; loading?: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] mx-auto flex max-w-md items-center justify-center px-8">
      <div className="animate-fade-in absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="animate-dialog-in glass-strong relative w-full rounded-3xl p-6 shadow-xl">
        <h3 className="text-base font-semibold">{title}</h3>
        {message && <p className="mt-2 font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{message}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onCancel} className="min-h-[44px] rounded-md border border-border-subtle dark:border-outline-variant/25 font-medium active:bg-surface-container-low dark:active:bg-white/5">Batal</button>
          <button onClick={onConfirm} disabled={loading}
            className="min-h-[44px] rounded-md bg-error font-medium text-on-error transition-colors active:bg-on-error-container disabled:opacity-50">
            {loading ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
