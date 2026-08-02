export default function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border-subtle dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-inverse-surface p-md shadow-card">
          <div className="h-4 w-2/3 rounded bg-surface-container-high dark:bg-white/10" />
          <div className="mt-2 h-3 w-1/3 rounded bg-surface-container dark:bg-white/5" />
        </div>
      ))}
    </div>
  );
}
