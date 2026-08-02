'use client';
export default function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-body-md text-body-md font-medium text-on-surface dark:text-inverse-on-surface">{label}</span>
      {children}
      {error && <span className="mt-1 block font-label-md text-label-md text-error">{error}</span>}
    </label>
  );
}
export const inputCls =
  'neuo-inset w-full min-h-[44px] rounded-xl border border-border-subtle dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-inverse-surface text-on-surface dark:text-inverse-on-surface px-4 font-body-md text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:border-inverse-primary placeholder:text-outline dark:placeholder:text-outline-variant';
