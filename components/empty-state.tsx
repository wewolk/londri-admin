import { Icon } from '@phosphor-icons/react';

export default function EmptyState({ icon: IconCmp, title, desc, action }: {
  icon?: Icon; title: string; desc?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      {IconCmp && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container dark:bg-white/5 text-outline">
          <IconCmp size={28} />
        </div>
      )}
      <h3 className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">{title}</h3>
      {desc && <p className="mt-1 font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
