'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api';
import { apiMessage } from '@/lib/api/client';
import { useAuth } from '@/lib/auth';
import Image from 'next/image';
import { User, LockKey, Eye, EyeSlash, CircleNotch } from '@phosphor-icons/react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => authApi.login(username, password),
    onSuccess: (data) => { login(data.token, data.user); router.replace('/dashboard'); },
    onError: (e) => setError(apiMessage(e)),
  });

  /* .neuo-inset kini menangani border + fokus lewat globals.css — tidak perlu
     lagi menumpuk border/focus di sini. */
  const inputCls = 'neuo-inset min-h-[48px] w-full rounded-md text-on-surface dark:text-inverse-on-surface pl-11 pr-4 outline-none';

  return (
    <div className="min-h-[100dvh]">
      {/* Panel brand ~35vh */}
      <div className="relative flex h-[35vh] min-h-[240px] flex-col items-center justify-center overflow-hidden bg-primary safe-top">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/95 p-3 shadow-lg">
          <Image src="/logo.png" alt="Londri POS" width={80} height={64} priority className="h-auto w-full" />
        </div>
        <h1 className="mt-3 text-2xl font-bold text-white">Londri POS</h1>
        <p className="mt-1 text-sm text-white/80">Masuk sebagai Superadmin</p>
      </div>

      {/* Card form menumpuk overlap ke panel gradient */}
      <div className="glass-strong relative z-10 -mt-8 rounded-3xl px-6 pb-10 pt-8 shadow-lg">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setError(''); mutation.mutate(); }}>
          {error && <div role="alert" className="rounded-md bg-error-container px-md py-3 font-body-md text-body-md text-on-error-container">{error}</div>}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Username</label>
            <div className="relative">
              <User size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username"
                className={inputCls} placeholder="admin" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <div className="relative">
              <LockKey size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password"
                className={inputCls + ' pr-11'} placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Tampilkan password"
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-outline active:bg-surface-container-low dark:active:bg-white/5">
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={mutation.isPending}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md bg-primary font-semibold text-on-primary transition-[transform,background-color] duration-150 hover:bg-on-primary-container active:scale-[0.98] disabled:opacity-60">
            {mutation.isPending ? (<><CircleNotch size={20} className="animate-spin" /> Masuk…</>) : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
