'use client';
import { useMemo, useState } from 'react';
import PageHeader from '@/components/page-header';
import SearchInput from '@/components/search-input';
import {
  CaretDown, SquaresFour, Receipt, UsersThree, Stack, ChartLineUp,
  QrCode, House, Question,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

interface Faq {
  q: string;
  a: string;
  tags?: string; // kata kunci tambahan untuk pencarian
}
interface Section {
  id: string;
  title: string;
  Icon: Icon;
  color: string;
  faqs: Faq[];
}

const SECTIONS: Section[] = [
  {
    id: 'dashboard', title: 'Dashboard', Icon: SquaresFour,
    color: 'bg-primary-container text-on-primary-container',
    faqs: [
      { q: 'Apa isi halaman Dashboard?', a: 'Ringkasan cepat bisnis: revenue hari ini, revenue bulan ini, jumlah order, member aktif, grafik revenue per bulan, performa kasir, penjualan membership per tier, dan promo terpopuler.' },
      { q: 'Kenapa revenue hari ini Rp 0 padahal ada order?', a: 'Revenue hanya dihitung dari order berstatus "Selesai" (SELESAI) atau "Diambil" (DIAMBIL). Order yang masih Diproses belum masuk hitungan revenue. Ubah status order ke Selesai agar terhitung.', tags: 'revenue nol kosong 0' },
      { q: 'Bagaimana buka laporan lengkap?', a: 'Tekan tautan "Laporan lengkap →" pada kartu Revenue per bulan, atau buka menu Master → Laporan.' },
    ],
  },
  {
    id: 'orders', title: 'Order / Transaksi', Icon: Receipt,
    color: 'bg-primary-container text-on-primary-container',
    faqs: [
      { q: 'Bagaimana mencari order tertentu?', a: 'Gunakan kolom pencarian di halaman Order. Ketik nomor invoice, nama pelanggan, atau nomor telepon. Tekan ikon X untuk menghapus pencarian.' },
      { q: 'Bagaimana memfilter order?', a: 'Gunakan chip status cepat (Semua, Menunggu, Diproses, dst) di bawah kolom pencarian untuk menyaring berdasarkan status.', tags: 'filter status saring' },
      { q: 'Bagaimana mengubah status order?', a: 'Buka detail order dengan menekan kartunya, lalu pilih status berikutnya pada alur status. Setiap perubahan tercatat di riwayat (log) order.', tags: 'ubah status proses cuci selesai' },
      { q: 'Apa arti tiap status order?', a: 'Menunggu → Diproses → Dicuci → Dikeringkan → Disetrika → Siap Diambil → Selesai. Status "Dibatalkan" berarti order tidak dilanjutkan.' },
    ],
  },
  {
    id: 'members', title: 'Membership', Icon: UsersThree,
    color: 'bg-primary-container text-on-primary-container',
    faqs: [
      { q: 'Apa itu member dan tier?', a: 'Member adalah pelanggan dengan saldo prabayar. Tier (mis. Silver/Gold/Platinum) menentukan harga paket, jumlah saldo, dan masa berlaku.', tags: 'tier paket saldo' },
      { q: 'Bagaimana melihat riwayat saldo member?', a: 'Buka detail member, lalu pilih tab "Saldo" untuk log pemakaian/penyesuaian, atau tab "Transaksi" untuk riwayat pembelian paket.' },
      { q: 'Apa arti status member?', a: 'Aktif = saldo & masa berlaku masih berlaku. Kedaluwarsa = masa berlaku habis. Diblokir = tidak bisa dipakai transaksi.' },
    ],
  },
  {
    id: 'reports', title: 'Laporan & Ekspor', Icon: ChartLineUp,
    color: 'bg-primary-container text-on-primary-container',
    faqs: [
      { q: 'Bagaimana membuat laporan periode tertentu?', a: 'Buka Master → Laporan. Pilih periode cepat (Hari ini, 7 hari, 30 hari, Bulan ini) atau "Custom" untuk memilih rentang tanggal sendiri. Bisa juga difilter per cabang.', tags: 'periode tanggal rentang custom' },
      { q: 'Apa saja isi laporan?', a: 'KPI (total revenue, total order, rata-rata order, pelanggan unik), grafik revenue harian, breakdown per metode pembayaran/status/kasir, dan tabel transaksi.' },
      { q: 'Bagaimana mengekspor laporan?', a: 'Tekan tombol "Ekspor" di kanan atas halaman Laporan, lalu pilih format: CSV, Excel (.xlsx), atau PDF/Cetak.', tags: 'export unduh download csv excel pdf' },
      { q: 'Apa beda format CSV, Excel, dan PDF?', a: 'CSV: file ringan, langsung dibuka di Excel/Google Sheets. Excel (.xlsx): rapi dengan beberapa sheet terpisah (Ringkasan, Per Status, Per Pembayaran, Per Kasir, Per Cabang, Transaksi). PDF: hasil cetak/print untuk arsip fisik.', tags: 'format perbedaan xlsx' },
      { q: 'Kenapa angka di laporan berbeda dengan dashboard?', a: 'Laporan mengikuti periode & filter yang Anda pilih, sedangkan dashboard menampilkan ringkasan bawaan (hari ini / bulan berjalan). Pastikan periode laporan sesuai yang diharapkan.' },
    ],
  },
  {
    id: 'attendance', title: 'Presensi (QR)', Icon: QrCode,
    color: 'bg-primary-container text-on-primary-container',
    faqs: [
      { q: 'Bagaimana membuat QR presensi?', a: 'Buka Master → Presensi → QR. Pilih cabang dan masa berlaku QR (jam), lalu buat. Staff memindai QR ini untuk check-in/check-out.', tags: 'qr code absen scan' },
      { q: 'Di mana melihat log kehadiran staff?', a: 'Halaman Presensi menampilkan daftar check-in/check-out. Bisa difilter per staff, cabang, jenis, dan tanggal.' },
    ],
  },
  {
    id: 'master', title: 'Master Data', Icon: Stack,
    color: 'bg-primary-container text-on-primary-container',
    faqs: [
      { q: 'Apa itu Master Data?', a: 'Kumpulan data dasar yang dipakai di seluruh app: Cabang, Staff, Role Staff, Layanan, Tier Membership, Promo, dan Presensi.' },
      { q: 'Bagaimana menambah / mengubah / menghapus data?', a: 'Di tiap halaman master, tekan tombol + (kanan bawah) untuk menambah. Untuk mengubah/menghapus, buka item lalu gunakan aksi yang tersedia. Perubahan langsung tersimpan ke server.', tags: 'tambah edit hapus crud' },
      { q: 'Bagaimana mengatur harga layanan?', a: 'Buka Master → Layanan, tambah atau ubah layanan lalu isi harga, tipe, dan estimasi jam pengerjaan.', tags: 'harga layanan servis' },
      { q: 'Bagaimana membuat kode promo?', a: 'Buka Master → Promo. Buat kode, pilih tipe diskon (persen atau nominal), nilai, minimum pembelian, dan rentang tanggal berlaku.', tags: 'diskon voucher kupon' },
    ],
  },
  {
    id: 'general', title: 'Umum & Akun', Icon: House,
    color: 'bg-primary-container text-on-primary-container',
    faqs: [
      { q: 'Bagaimana mengganti tema (terang/gelap)?', a: 'Buka Pengaturan, pilih Terang, Gelap, atau Ikuti Sistem pada bagian Tema Tampilan.', tags: 'dark mode gelap terang tema' },
      { q: 'Bagaimana keluar (logout)?', a: 'Buka Pengaturan, tekan tombol "Keluar" di bagian bawah.' },
      { q: 'Aplikasi bisa dipasang di HP?', a: 'Ya. Londri POS adalah PWA — buka di browser HP, lalu pilih "Tambah ke Layar Utama" untuk memasang seperti aplikasi biasa.', tags: 'pwa install pasang aplikasi home screen' },
    ],
  },
];

function FaqItem({ faq, highlight }: { faq: Faq; highlight: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border-subtle dark:border-outline-variant/20 first:border-t-0">
      <button onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 py-3 text-left">
        <span className="flex-1 text-sm font-medium">{mark(faq.q, highlight)}</span>
        <CaretDown size={16} className={`shrink-0 text-outline dark:text-outline-variant transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <p className="pb-3 font-body-md text-body-md leading-relaxed text-on-surface-variant dark:text-outline-variant">{faq.a}</p>
        </div>
      </div>
    </div>
  );
}

// Tandai potongan yang cocok dengan query (sederhana, case-insensitive).
function mark(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary-container px-0.5 text-on-primary-container">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function HelpPage() {
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return SECTIONS;
    return SECTIONS
      .map((s) => ({
        ...s,
        faqs: s.faqs.filter((f) =>
          f.q.toLowerCase().includes(q) ||
          f.a.toLowerCase().includes(q) ||
          (f.tags || '').toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.faqs.length > 0);
  }, [q]);

  const totalHits = filtered.reduce((n, s) => n + s.faqs.length, 0);

  return (
    <>
      <PageHeader title="Bantuan" back />
      <div className="space-y-4 p-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Question size={20} weight="duotone" className="text-primary dark:text-inverse-primary" />
            <h2 className="font-semibold">Pusat Bantuan</h2>
          </div>
          <p className="font-label-md text-label-md text-on-surface-variant dark:text-outline-variant">
            Panduan singkat tiap fitur. Ketik untuk mencari, atau ketuk pertanyaan untuk melihat jawaban.
          </p>
        </div>

        <SearchInput value={search} onChange={setSearch} placeholder="Cari bantuan… (mis. ekspor, status, promo)" />

        {q && (
          <p className="font-label-md text-label-md text-outline dark:text-outline-variant">
            {totalHits ? `${totalHits} hasil untuk "${search}"` : `Tidak ada hasil untuk "${search}"`}
          </p>
        )}

        {filtered.map((s) => (
          <section key={s.id} className="glass rounded-xl border border-border-subtle dark:border-outline-variant/20 p-md shadow-card">
            <div className="mb-1 flex items-center gap-2.5">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.color}`}>
                <s.Icon size={16} weight="duotone" />
              </span>
              <h3 className="font-semibold">{s.title}</h3>
            </div>
            <div>
              {s.faqs.map((f) => <FaqItem key={f.q} faq={f} highlight={q} />)}
            </div>
          </section>
        ))}

        {!filtered.length && (
          <p className="py-12 text-center font-body-md text-body-md text-outline dark:text-outline-variant">
            Tidak menemukan yang dicari. Coba kata kunci lain seperti “order”, “laporan”, atau “member”.
          </p>
        )}

        <p className="pt-2 text-center font-label-md text-label-md text-outline dark:text-outline-variant">
          Butuh bantuan lain? Hubungi admin sistem Anda.
        </p>
      </div>
    </>
  );
}
