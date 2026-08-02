'use client';
import { useToastStore } from '@/hooks/useToast';
import { CheckCircle, WarningCircle } from '@phosphor-icons/react';

export default function Toaster() {
  const { toasts } = useToastStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] mx-auto flex w-full max-w-md flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div key={t.id}
          className={`animate-toast-in pointer-events-auto flex w-full items-center gap-2.5 rounded-md px-md py-3 font-body-md text-body-md text-on-primary shadow-card-hover ${t.type === 'error' ? 'bg-error' : 'bg-success'}`}>
          {t.type === 'error' ? <WarningCircle size={20} weight="fill" className="shrink-0" /> : <CheckCircle size={20} weight="fill" className="shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
