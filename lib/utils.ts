export const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export function formatRupiah(value: string | number | null | undefined) {
  return rupiah.format(Number(value || 0));
}
export function formatTanggal(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '-';
  const date = new Date(value);
  return new Intl.DateTimeFormat('id-ID', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
}
export function formatBulan(month: number) {
  return new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(2024, month - 1, 1));
}
/** Waktu relatif ("2 jam lalu") jika < 24 jam, selain itu tanggal biasa */
export function formatRelatif(value: string | Date | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 0) return formatTanggal(date, true);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  return formatTanggal(date, true);
}
