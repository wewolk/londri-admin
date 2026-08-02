'use client';
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, isTokenExpired } from '@/lib/auth';

// Guard: pages under (app) require login. Hydrates token from localStorage.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, hydrated, hydrate, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!hydrated) return;
    // Token hilang atau kedaluwarsa (mis. tab dibiarkan lama) → paksa logout.
    if (!token || isTokenExpired(token)) {
      if (token) logout();
      router.replace('/login');
    }
  }, [hydrated, token, router, pathname, logout]);

  if (!hydrated || !token || isTokenExpired(token)) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border-subtle dark:border-outline-variant/20 border-t-primary" />
      </div>
    );
  }
  return <>{children}</>;
}
