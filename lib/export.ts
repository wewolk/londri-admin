// Utilitas ekspor. CSV tetap ringan; workbook finance memakai ExcelJS agar
// hasilnya memiliki struktur, format angka, filter, freeze pane, dan print setup.

export type Cell = string | number | null | undefined;
export type CellFormat = 'text' | 'currency' | 'count' | 'percent';
export interface Sheet {
  name: string;
  columns: string[];
  rows: Cell[][];
  /** Format per kolom; berguna untuk sheet tabel. */
  formats?: CellFormat[];
  /** Override format per baris (zero-based pada rows); penting untuk Ringkasan. */
  rowFormats?: Record<number, CellFormat[]>;
}

export interface WorkbookOptions {
  title: string;
  subtitle: string;
  metadata: Array<[string, string]>;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvEscape(v: Cell): string {
  const s = v == null ? '' : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Ekspor satu sheet ke CSV. BOM menjaga karakter Indonesia terbaca di Excel. */
export function exportCsv(sheet: Sheet, filename: string) {
  const lines = [sheet.columns.map(csvEscape).join(','), ...sheet.rows.map((r) => r.map(csvEscape).join(','))];
  triggerDownload(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

const INK = '1E293B';
const BRAND = '006591';
const BRAND_LIGHT = 'E0F2FE';
const SLATE = 'F1F5F9';
const BORDER = 'CBD5E1';
const SUCCESS = 'DCFCE7';
const DANGER = 'FEE2E2';
const MUTED = '64748B';
const CURRENCY_HEADERS = /nilai|kas|uang|revenue|omset|subtotal|diskon|total|bruto|biaya|netto|piutang|selisih|diterima|dibayar|harga|saldo/i;
const COUNT_HEADERS = /jumlah|order|nota|pelanggan|transaksi/i;

function asTitle(value: Cell) { return String(value ?? '').trim(); }
function isSectionLabel(value: Cell) { return /^—.+—$/.test(asTitle(value)); }
function isCurrencyHeader(header: string) { return CURRENCY_HEADERS.test(header); }
function defaultFormat(header: string): CellFormat {
  if (isCurrencyHeader(header)) return 'currency';
  if (COUNT_HEADERS.test(header)) return 'count';
  return 'text';
}
function numberFormat(format: CellFormat) {
  if (format === 'currency') return '[$Rp-421] #,##0;[Red]([$Rp-421] #,##0);-';
  if (format === 'percent') return '0"%";[Red](0"%");-';
  return '#,##0;[Red](#,##0);-';
}

/**
 * Workbook laporan finance: bukan data dump.
 * Semua angka berasal dari agregasi laporan aktif; formula total diberi nilai
 * cache agar tetap terbaca langsung dan dapat dihitung ulang ketika dibuka Excel.
 */
export async function exportXlsx(sheets: Sheet[], filename: string, options?: WorkbookOptions) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Londri POS';
  workbook.lastModifiedBy = 'Londri POS';
  workbook.created = new Date();
  workbook.modified = new Date();

  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
    const sheet = sheets[sheetIndex];
    const ws = workbook.addWorksheet(sheet.name.slice(0, 31), {
      pageSetup: { orientation: sheet.name === 'Transaksi' ? 'landscape' : 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } },
      properties: { defaultRowHeight: 18 },
      views: [{ showGridLines: false }],
    });
    const width = Math.max(2, sheet.columns.length);
    const lastColumn = Math.min(width, 26);
    const right = String.fromCharCode(64 + lastColumn);
    const title = options?.title || 'LAPORAN LONDRI POS';
    const subtitle = options?.subtitle || '';

    ws.mergeCells(`A1:${right}1`);
    ws.getCell('A1').value = title.toUpperCase();
    ws.getCell('A1').font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND}` } };
    ws.getCell('A1').alignment = { vertical: 'middle' };
    ws.getRow(1).height = 28;

    ws.mergeCells(`A2:${right}2`);
    ws.getCell('A2').value = `${sheetIndex === 0 ? subtitle : sheet.name} • LONDRI POS`;
    ws.getCell('A2').font = { name: 'Arial', size: 10, color: { argb: `FF${MUTED}` } };
    ws.getCell('A2').alignment = { vertical: 'middle' };

    const metadata = options?.metadata || [];
    const metaRows = Math.ceil(metadata.length / 2);
    for (let i = 0; i < metadata.length; i += 2) {
      const row = 3 + Math.floor(i / 2);
      const left = metadata[i];
      const rightMeta = metadata[i + 1];
      ws.getCell(row, 1).value = left[0];
      ws.getCell(row, 2).value = left[1];
      ws.getCell(row, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: `FF${MUTED}` } };
      ws.getCell(row, 2).font = { name: 'Arial', size: 9, color: { argb: `FF${INK}` } };
      if (rightMeta && width >= 4) {
        ws.getCell(row, Math.ceil(width / 2) + 1).value = rightMeta[0];
        ws.getCell(row, Math.ceil(width / 2) + 2).value = rightMeta[1];
        ws.getCell(row, Math.ceil(width / 2) + 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: `FF${MUTED}` } };
        ws.getCell(row, Math.ceil(width / 2) + 2).font = { name: 'Arial', size: 9, color: { argb: `FF${INK}` } };
      }
    }

    const headerRowNumber = 4 + metaRows;
    const header = ws.getRow(headerRowNumber);
    header.values = sheet.columns;
    header.height = 22;
    header.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND}` } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: `FF${BORDER}` } } };
    });

    let dataRowCount = 0;
    sheet.rows.forEach((sourceRow, sourceIndex) => {
      const row = ws.addRow(sourceRow);
      dataRowCount += 1;
      row.height = 18;
      const rowFormats = sheet.rowFormats?.[sourceIndex] || sheet.formats || sheet.columns.map(defaultFormat);
      const section = isSectionLabel(sourceRow[0]);
      if (section) {
        ws.mergeCells(`A${row.number}:${right}${row.number}`);
        const cell = row.getCell(1);
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: `FF${BRAND}` } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_LIGHT}` } };
        cell.alignment = { vertical: 'middle' };
      } else {
        row.eachCell((cell, col) => {
          const head = sheet.columns[col - 1] || '';
          cell.font = { name: 'Arial', size: 9, color: { argb: `FF${INK}` } };
          cell.alignment = { vertical: 'middle', wrapText: col <= 8 };
          cell.border = { bottom: { style: 'hair', color: { argb: `FF${BORDER}` } } };
          const format = rowFormats[col - 1] || defaultFormat(head);
          if (typeof cell.value === 'number' && format !== 'text') {
            cell.numFmt = numberFormat(format);
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          }
        });
        if (dataRowCount % 2 === 0) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${SLATE}` } }; });
        const statusColumn = sheet.columns.findIndex((h) => /status/i.test(h));
        if (statusColumn >= 0) {
          const statusCell = row.getCell(statusColumn + 1);
          const value = String(statusCell.value || '').toUpperCase();
          if (value.includes('COCOK') || value.includes('SELESAI') || value.includes('DIAMBIL')) statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${SUCCESS}` } };
          if (value.includes('SELISIH') || value.includes('BATAL')) statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${DANGER}` } };
        }
      }
    });

    const firstDataRow = headerRowNumber + 1;
    const lastDataRow = headerRowNumber + dataRowCount;
    if (dataRowCount > 0 && sheet.name !== 'Ringkasan') {
      const totalRow = ws.addRow(sheet.columns.map((headerName, index) => {
        if (index === 0) return 'TOTAL';
        const format = sheet.formats?.[index] || defaultFormat(headerName);
        if (format === 'currency' || format === 'count') {
          const col = String.fromCharCode(65 + index);
          const result = sheet.rows.reduce((sum, r) => sum + (typeof r[index] === 'number' ? r[index] as number : 0), 0);
          return { formula: `SUM(${col}${firstDataRow}:${col}${lastDataRow})`, result };
        }
        return '';
      }));
      totalRow.eachCell((cell, col) => {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: `FF${INK}` } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${BRAND_LIGHT}` } };
        cell.border = { top: { style: 'medium', color: { argb: `FF${BRAND}` } } };
        const head = sheet.columns[col - 1] || '';
        const format = sheet.formats?.[col - 1] || defaultFormat(head);
        if (format !== 'text') cell.numFmt = numberFormat(format);
      });
    }

    ws.autoFilter = { from: { row: headerRowNumber, column: 1 }, to: { row: Math.max(lastDataRow, headerRowNumber), column: width } };
    ws.views = [{ state: 'frozen', ySplit: headerRowNumber, showGridLines: false }];
    ws.pageSetup.printTitlesRow = `${headerRowNumber}:${headerRowNumber}`;
    ws.headerFooter.oddFooter = '&L LONDRI POS &C ' + (options?.subtitle || '') + ' &R Halaman &P dari &N';

    sheet.columns.forEach((column, colIndex) => {
      const longest = Math.max(column.length, ...sheet.rows.map((row) => String(row[colIndex] ?? '').length));
      ws.getColumn(colIndex + 1).width = Math.min(Math.max(longest + 2, colIndex === 0 ? 16 : 11), colIndex > 7 ? 22 : 34);
    });
  }

  const bytes = await workbook.xlsx.writeBuffer();
  triggerDownload(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}
