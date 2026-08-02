'use client';
import { useRouter } from 'next/navigation';
import { CaretLeft } from '@phosphor-icons/react';

export default function PageHeader({ title, back = false, right }: { title: string; back?: boolean; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="glass-strong sticky top-0 z-40 flex min-h-[56px] items-center gap-2 border-b border-border-subtle dark:border-outline-variant/20 px-md safe-top">
      {back && (
        <button onClick={() => router.back()} aria-label="Kembali"
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-primary active:bg-surface-container-low dark:active:bg-white/5">
          <CaretLeft size={20} weight="bold" />
        </button>
      )}
      <h1 className="flex-1 truncate font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">{title}</h1>
      {right}
    </header>
  );
}
