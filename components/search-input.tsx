'use client';
import { MagnifyingGlass, X } from '@phosphor-icons/react';

export default function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <MagnifyingGlass size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Cari…'} inputMode="search"
        className="neuo-inset min-h-[44px] w-full rounded-xl border border-border-subtle dark:border-outline-variant/20 bg-surface-container-low dark:bg-inverse-surface pl-10 pr-10 font-body-md text-body-md text-on-surface dark:text-inverse-on-surface outline-none transition-colors focus:border-primary focus:bg-surface-container-lowest dark:focus:border-inverse-primary placeholder:text-outline dark:placeholder:text-outline-variant" />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Bersihkan pencarian"
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-on-surface-variant active:bg-surface-container-low dark:active:bg-white/5">
          <X size={16} weight="bold" />
        </button>
      )}
    </div>
  );
}
