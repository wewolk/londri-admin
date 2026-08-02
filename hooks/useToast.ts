'use client';
import { create } from 'zustand';

interface Toast { id: number; message: string; type: 'success' | 'error' }
interface ToastState {
  toasts: Toast[];
  push: (message: string, type?: 'success' | 'error') => void;
}
let counter = 0;
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type = 'success') => {
    const id = ++counter;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000);
  },
}));
export const toast = {
  success: (msg: string) => useToastStore.getState().push(msg, 'success'),
  error: (msg: string) => useToastStore.getState().push(msg, 'error'),
};
