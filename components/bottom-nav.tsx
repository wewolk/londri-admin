'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SquaresFour, Receipt, UsersThree, Stack, GearSix } from '@phosphor-icons/react';

const items = [
  { href: '/dashboard', label: 'Dashboard', Icon: SquaresFour },
  { href: '/orders', label: 'Order', Icon: Receipt },
  { href: '/memberships', label: 'Member', Icon: UsersThree },
  { href: '/master', label: 'Master', Icon: Stack },
  { href: '/settings', label: 'Setting', Icon: GearSix },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto max-w-max-mobile-width border-t border-border-subtle dark:border-outline-variant/20 safe-bottom">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 pt-1.5 font-label-md text-label-md transition-colors active:bg-surface-container-low dark:active:bg-white/5 ${active ? 'font-medium text-primary dark:text-inverse-primary' : 'text-on-surface-variant dark:text-outline-variant'}`}>
              <span className={`h-1 w-6 rounded-full transition-[background-color] duration-200 ${active ? 'bg-primary dark:bg-inverse-primary' : 'bg-transparent'}`} />
              <item.Icon size={24} weight={active ? 'fill' : 'regular'} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
