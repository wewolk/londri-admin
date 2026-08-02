import AuthGuard from '@/components/auth-guard';
import BottomNav from '@/components/bottom-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <main className="min-h-[100dvh] pb-20">{children}</main>
      <BottomNav />
    </AuthGuard>
  );
}
