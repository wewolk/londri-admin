'use client';
import { create } from 'zustand';
import type { AdminUser } from './types';

// Decode JWT payload tanpa verifikasi signature (hanya untuk baca exp di client).
// Return null jika token tidak valid / bukan JWT.
function decodeJwt(token: string): { exp?: number } | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// True jika token tidak ada, bukan JWT, atau sudah lewat exp.
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
}
export const useAuth = create<AuthState>((set) => ({
  token: null, user: null, hydrated: false,
  hydrate: () => {
    const token = localStorage.getItem('londri_token');
    // Token kedaluwarsa / invalid → bersihkan agar guard langsung redirect.
    if (isTokenExpired(token)) {
      localStorage.removeItem('londri_token');
      localStorage.removeItem('londri_user');
      set({ token: null, user: null, hydrated: true });
      return;
    }
    const raw = localStorage.getItem('londri_user');
    let user: AdminUser | null = null;
    try {
      user = raw ? JSON.parse(raw) : null;
    } catch {
      // Data user korup di localStorage → abaikan, jangan sampai crash app.
      localStorage.removeItem('londri_user');
      user = null;
    }
    set({ token, user, hydrated: true });
  },
  login: (token, user) => {
    localStorage.setItem('londri_token', token);
    localStorage.setItem('londri_user', JSON.stringify(user));
    set({ token, user, hydrated: true });
  },
  logout: () => {
    localStorage.removeItem('londri_token');
    localStorage.removeItem('londri_user');
    set({ token: null, user: null });
  },
}));
