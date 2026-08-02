'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Sun, Moon, GearSix, Question, CaretRight } from '@phosphor-icons/react';
import { toast } from '@/hooks/useToast';

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Terang', Icon: Sun },
  { value: 'dark' as const, label: 'Gelap', Icon: Moon },
  { value: 'system' as const, label: 'Ikuti Sistem', Icon: GearSix },
];

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: authApi.me });
  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => { logout(); router.replace('/login'); toast.success('Berhasil keluar'); },
  });

  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-border-subtle dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-inverse-surface p-5 shadow-card">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-headline-lg text-headline-lg font-bold text-on-primary">
              {(me?.username || 'A')[0].toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{me?.username || '…'}</p>
              <p className="font-body-md text-body-md text-on-surface-variant dark:text-outline-variant">{me?.role || 'Super Admin'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-inverse-surface p-5 shadow-card">
          <h3 className="mb-3 font-label-md text-label-md font-semibold uppercase tracking-wide text-on-surface-variant dark:text-outline-variant">Tema Tampilan</h3>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setTheme(opt.value)}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 transition-colors ${
                  theme === opt.value
                    ? 'border-primary bg-primary-container'
                    : 'border-border-subtle bg-surface-container-lowest dark:border-outline-variant/25 dark:bg-inverse-surface'
                }`}>
                <opt.Icon size={24} weight="duotone" />
                <span className={`text-xs font-medium ${
                  theme === opt.value ? 'text-on-primary-container' : 'text-on-surface-variant dark:text-outline-variant'
                }`}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Link href="/help"
          className="flex items-center gap-3 rounded-xl border border-border-subtle dark:border-outline-variant/20 bg-surface-container-lowest dark:bg-inverse-surface p-md shadow-card active:bg-surface-container-low dark:active:bg-white/5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-container text-on-primary-container">
            <Question size={20} weight="duotone" />
          </span>
          <div className="flex-1">
            <p className="font-medium">Bantuan &amp; Panduan</p>
            <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">Cara pakai tiap fitur & FAQ</p>
          </div>
          <CaretRight size={18} className="text-outline dark:text-outline-variant" aria-hidden="true" />
        </Link>

        <button onClick={() => logoutMutation.mutate()} disabled={logoutMutation.isPending}
          className="min-h-[48px] w-full rounded-md bg-error-container font-semibold text-on-error-container transition-opacity active:opacity-80 disabled:opacity-50">
          {logoutMutation.isPending ? 'Keluar…' : 'Keluar'}
        </button>

        <p className="pt-2 text-center font-label-md text-label-md text-outline dark:text-outline-variant">Londri POS Superadmin · v0.1.0</p>
      </div>
    </>
  );
}
