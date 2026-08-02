# Migrasi tema → Stitch "Refined Glass"

Sumber token: `~/Downloads/stitch_full_prd_implementation/refined_glass/DESIGN.md`
Branch: `theme/stitch-refined-glass`

Fondasi (`tailwind.config.ts`, `app/globals.css`) SUDAH selesai. Jangan diubah.
Yang tersisa: mengganti class off-palette (`slate-*`, `sky-*`) di file `.tsx`
dengan token semantik.

## Prinsip

Tema lama = glass + neomorphic + ambient bloom. Tema baru = **flat, tenang, hairline border**.
DESIGN.md: _"avoid heavy shadows; rely on borders and subtle background shifts"_.

- Latar halaman **rata** — tanpa gradient, tanpa orb, tanpa bloom.
- Kartu = putih + `border-border-subtle` + `shadow-card` (4% opacity).
- Frost **hanya** pada chrome fixed (header/nav/sheet) via `.glass-strong`.
- `.glass` dan `.neuo-inset` sudah didefinisi ulang di globals.css — **biarkan
  nama class itu apa adanya**, jangan hapus dari markup.

## Tabel pemetaan (WAJIB diikuti persis)

### Teks
| lama | baru |
|---|---|
| `text-slate-900`, `text-slate-800` | `text-on-surface` |
| `text-slate-600`, `text-slate-500` | `text-on-surface-variant` |
| `text-slate-400` | `text-outline` |
| `text-sky-600`, `text-sky-500` | `text-primary` |
| `dark:text-slate-100`, `dark:text-white` | `dark:text-inverse-on-surface` |
| `dark:text-slate-400`, `dark:text-slate-500` | `dark:text-outline-variant` |
| `dark:text-sky-400` | `dark:text-inverse-primary` |

### Latar
| lama | baru |
|---|---|
| `bg-white` (kartu) | `bg-surface-container-lowest` |
| `bg-slate-50` | `bg-surface-container-low` |
| `bg-slate-100` | `bg-surface-container` |
| `bg-slate-200` | `bg-surface-container-high` |
| `bg-sky-500`, `bg-sky-600` | `bg-primary` |
| `bg-sky-50`, `bg-sky-100` | `bg-primary-container` |
| `dark:bg-slate-800`, `dark:bg-slate-900` | `dark:bg-inverse-surface` |
| `dark:bg-slate-950` | `dark:bg-on-surface` |

### Border
| lama | baru |
|---|---|
| `border-slate-100`, `border-slate-200` | `border-border-subtle` |
| `border-slate-300` | `border-outline-variant` |
| `border-white/40` | `border-border-subtle` |
| `dark:border-slate-700`, `dark:border-slate-800` | `dark:border-outline-variant/20` |
| `focus:border-sky-500`, `focus:ring-sky-500` | `focus:border-primary`, `focus:ring-primary` |

### Status — pakai `.chip` (sudah ada di globals.css)
| makna | ganti seluruh class warna dengan |
|---|---|
| sukses / lunas / selesai | `chip chip-success` |
| menunggu / proses | `chip chip-warning` |
| gagal / batal | `chip chip-error` |
| info / netral-brand | `chip chip-info` |
| netral | `chip chip-neutral` |

Jangan pakai `text-green-*` / `bg-emerald-*` / `text-amber-*` lagi.

### Tipografi
| lama | baru |
|---|---|
| `text-2xl font-bold` (judul halaman) | `font-headline-lg text-headline-lg` |
| `text-lg font-semibold` (judul kartu) | `font-headline-md text-headline-md` |
| `text-base` | `font-body-lg text-body-lg` |
| `text-sm` | `font-body-md text-body-md` |
| `text-xs`, `text-[11px]` | `font-label-md text-label-md` |
| angka/uang | `font-data-tabular text-data-tabular tabular-nums` |

### Radius & spacing
| lama | baru |
|---|---|
| `rounded-2xl` | `rounded-xl` |
| `rounded-lg` (kartu) | `rounded-md` (=12px, standar DESIGN.md) |
| `max-w-md` (kolom app) | `max-w-max-mobile-width` |
| `p-4` | `p-md` |

### Bayangan
| lama | baru |
|---|---|
| `shadow-sm`, `shadow`, `shadow-md` | `shadow-card` |
| `hover:shadow-md`, `hover:shadow-lg` | `hover:shadow-card-hover` |
| `shadow-lg` pada FAB | `shadow-fab` |
| `shadow-xl`, `shadow-2xl` | `shadow-card-hover` |

## Aturan keras

1. **Jangan** menambah gradient, orb, blur dekoratif, atau glow. Kalau menemukannya, hapus.
2. **Jangan** memakai `!important`.
3. **Jangan** mengubah logika, panggilan API, hook, atau struktur JSX. Ini murni
   pekerjaan class. Satu-satunya penambahan non-class yang boleh: `aria-*`.
4. **Jangan** menyentuh `tailwind.config.ts` atau `app/globals.css`.
5. Warna berbeda harus berarti kategori berbeda. Jangan mewarnai satu metrik
   yang sama dengan dua warna berbeda.
6. Jangan mengarang data/metrik yang tidak dikirim backend.
7. Format uang Indonesia: `Intl.NumberFormat('id-ID')` → `14.500.000` (titik).
   Kalau menemukan format koma, perbaiki.

## Contoh acuan (sudah dikerjakan — tiru gayanya)

- `components/bottom-nav.tsx`
- `components/page-header.tsx`

## Verifikasi sebelum lapor selesai

```bash
cd ~/project-web/londri-fe
npx tsc --noEmit          # harus bersih
npx next build            # harus sukses
grep -rInE '(bg|text|border|ring)-(slate|sky|gray|zinc|neutral)-[0-9]+' --include='*.tsx' app components
# ^ harus kosong untuk file yang kamu pegang
```
