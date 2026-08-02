'use client';
import { useRouter } from 'next/navigation';
import { Plus } from '@phosphor-icons/react';

export default function Fab({ href, onClick }: { href?: string; onClick?: () => void }) {
  const router = useRouter();
  return (
    <button
      onClick={onClick || (() => href && router.push(href))}
      aria-label="Tambah"
      className="fixed bottom-24 right-[max(1rem,calc(50%-14rem+1rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-fab transition-transform duration-150 active:scale-95"
      style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <Plus size={26} weight="bold" />
    </button>
  );
}
