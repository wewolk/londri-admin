'use client';
import Link from 'next/link';
import PageHeader from '@/components/page-header';
import { House, Users, ShieldCheck, TShirt, Crown, Tag, QrCode, ChartLineUp, Question, CaretRight } from '@phosphor-icons/react';

/* Sebelumnya tiap baris punya hue sendiri — sky, violet, emerald, amber, rose,
 * teal, indigo, slate. Sembilan warna untuk sembilan tujuan navigasi yang
 * setara: tidak ada satu pun yang lebih penting, lebih berbahaya, atau beda
 * kategori dari yang lain, jadi warnanya tidak mengkodekan apa pun.
 *
 * Yang membedakan baris di sini adalah glyph ikon dan labelnya, dan itu sudah
 * cukup. Satu tint tonal dipakai seragam supaya daftar terbaca sebagai satu
 * kelompok, bukan sebagai delapan kategori palsu. */
const modules = [
  { href: '/reports', label: 'Laporan', desc: 'Statistik & ekspor CSV/Excel/PDF', Icon: ChartLineUp },
  { href: '/branches', label: 'Cabang', desc: 'Kelola cabang laundry', Icon: House },
  { href: '/staffs', label: 'Staff', desc: 'Akun kasir & karyawan', Icon: Users },
  { href: '/staff-roles', label: 'Role Staff', desc: 'Hak akses staff', Icon: ShieldCheck },
  { href: '/services', label: 'Layanan', desc: 'Jenis cucian & harga', Icon: TShirt },
  { href: '/membership-tiers', label: 'Tier Membership', desc: 'Paket member', Icon: Crown },
  { href: '/promotions', label: 'Promo', desc: 'Kode diskon', Icon: Tag },
  { href: '/attendance', label: 'Presensi', desc: 'QR & log absensi', Icon: QrCode },
  { href: '/help', label: 'Bantuan', desc: 'Panduan & FAQ tiap fitur', Icon: Question },
];

export default function MasterPage() {
  return (
    <>
      <PageHeader title="Master Data" />
      <div className="space-y-3 p-md">
        {modules.map((m) => (
          <Link key={m.href} href={m.href}
            className="flex items-center gap-4 rounded-xl border border-border-subtle dark:border-outline-variant/20 glass p-md shadow-card transition-transform duration-150 active:scale-[0.98]">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-container p-2.5 text-on-primary-container"><m.Icon size={22} weight="duotone" /></div>
            <div className="flex-1">
              <p className="font-headline-md text-headline-md text-on-surface dark:text-inverse-on-surface">{m.label}</p>
              <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">{m.desc}</p>
            </div>
            <CaretRight size={20} className="text-outline dark:text-outline-variant" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </>
  );
}
