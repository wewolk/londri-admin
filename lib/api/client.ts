import axios from 'axios';

/**
 * Normalisasi base URL API.
 * Kalau env di-set tanpa skema (mis. "londri-be-beryl.vercel.app/api/v1"),
 * axios menganggapnya path relatif sehingga request nyasar ke
 * https://<domain-frontend>/londri-be-beryl.vercel.app/... dan balas 404.
 * Fungsi ini memaksa https:// untuk host non-localhost.
 */
function normalizeBaseUrl(raw?: string): string {
  const v = (raw || '').trim().replace(/\/+$/, '');
  if (!v) return 'http://localhost:3000/api/v1';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(v)) return `http://${v}`;
  return `https://${v}`;
}

export const API_BASE_URL = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('londri_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Jangan logout pada gagal network/CORS — itu bukan masalah auth.
    if (!axios.isAxiosError(error) || !error.code) {
      return Promise.reject(error);
    }
    // Hanya logout pada HTTP 401 sungguhan dari server.
    // Network/CORS failure (error.response undefined) tidak diperlakukan sbg logout.
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('londri_token');
      localStorage.removeItem('londri_user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export function apiMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    // Backend balas JSON dengan field message → ini kasus normal.
    if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
      return (data as { message: string }).message;
    }
    // Backend balas HTML/teks polos (mis. 404 default Express "Cannot GET ...")
    // — biasanya karena endpoint salah/berubah, bukan kesalahan input user.
    const status = error.response?.status;
    if (status === 404) return 'Data atau endpoint tidak ditemukan (404). Kemungkinan ada perubahan di server.';
    if (status && status >= 500) return `Server mengalami masalah (${status}). Coba lagi beberapa saat lagi.`;
    if (status) return `Permintaan gagal (${status}).`;
    // Tidak ada response sama sekali → network/CORS, bukan masalah auth/validasi.
    return error.message || 'Tidak dapat terhubung ke server.';
  }
  return error instanceof Error ? error.message : 'Terjadi kesalahan';
}
export function apiErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const errors = error.response?.data?.errors as { field: string; message: string }[] | undefined;
  return Object.fromEntries((errors || []).map((e) => [e.field, e.message]));
}
