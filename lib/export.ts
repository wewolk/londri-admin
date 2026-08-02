// Utilitas ekspor generik. CSV zero-dependency; XLSX via dynamic import (SheetJS)
// agar chunk-nya tidak masuk bundle utama.

export type Cell = string | number | null | undefined;
export interface Sheet {
  name: string;         // nama sheet (dipakai di xlsx)
  columns: string[];    // header
  rows: Cell[][];       // baris data
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Beri jeda sebelum revoke agar unduhan sempat terpicu.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(v: Cell): string {
  const s = v == null ? '' : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Ekspor satu sheet ke CSV. BOM ditambahkan agar Excel membaca UTF-8 dengan benar. */
export function exportCsv(sheet: Sheet, filename: string) {
  const lines = [
    sheet.columns.map(csvEscape).join(','),
    ...sheet.rows.map((r) => r.map(csvEscape).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/** Ekspor beberapa sheet ke satu workbook .xlsx (SheetJS, dynamic import). */
export async function exportXlsx(sheets: Sheet[], filename: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const aoa = [sheet.columns, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Lebar kolom otomatis berdasarkan konten terpanjang.
    ws['!cols'] = sheet.columns.map((c, i) => {
      const maxLen = Math.max(
        c.length,
        ...sheet.rows.map((r) => (r[i] == null ? 0 : String(r[i]).length)),
      );
      return { wch: Math.min(Math.max(maxLen + 2, 8), 40) };
    });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)); // batas nama sheet Excel = 31
  }
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
