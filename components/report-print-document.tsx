import type { ClosingReport } from '@/lib/types';
import type { ReportStats } from '@/lib/reports';
import { formatRupiah, formatTanggal } from '@/lib/utils';
import { PAYMENT_LABEL, STATUS_LABEL } from '@/lib/labels';

const num = (value: string | number | null | undefined) => Number(value ?? 0);

function Metric({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'success' | 'danger' }) {
  return <div className={`report-print-metric report-print-metric--${tone}`}><p>{label}</p><strong>{value}</strong></div>;
}

function SummaryRow({ label, value, emphasis, negative }: { label: string; value: number | string; emphasis?: boolean; negative?: boolean }) {
  const rendered = typeof value === 'number' ? formatRupiah(Math.abs(value)) : value;
  return <div className={`report-print-row ${emphasis ? 'report-print-row--strong' : ''} ${negative ? 'report-print-row--negative' : ''}`}><span>{label}</span><strong>{negative && typeof value === 'number' ? '-' : ''}{rendered}</strong></div>;
}

export default function ReportPrintDocument({
  stats, closing, branchName, basis,
}: {
  stats: ReportStats;
  closing?: ClosingReport;
  branchName?: string;
  basis: 'cash' | 'accrual';
}) {
  const now = formatTanggal(new Date(), true);
  const rec = closing?.reconciliation;
  const cashMethods = closing?.cashIn.byMethod || [];
  const outstanding = num(closing?.summary.outstanding);
  const cashIn = num(closing?.cashIn.total);
  const status = rec?.isBalanced ? 'COCOK' : rec ? 'PERLU REVIEW' : 'BELUM TERSEDIA';

  return <article className="report-print-document" aria-hidden="true">
    <header className="report-print-header">
      <div><p className="report-print-kicker">LONDRI POS • LAPORAN OPERASIONAL</p><h1>Closing & Ringkasan Bisnis</h1><p>Periode {formatTanggal(stats.period.from)} – {formatTanggal(stats.period.to)}</p></div>
      <div className="report-print-meta"><p><b>Cabang</b>{branchName || 'Semua cabang'}</p><p><b>Basis</b>{basis === 'cash' ? 'Kas masuk' : 'Omset'}</p><p><b>Dibuat</b>{now} WIB</p></div>
    </header>

    <section className="report-print-status">
      <div><p>Status rekonsiliasi</p><strong className={status === 'COCOK' ? 'is-good' : status === 'PERLU REVIEW' ? 'is-alert' : ''}>{status}</strong></div>
      <p>{rec ? rec.isBalanced ? 'Nilai nota, saldo member, piutang, dan penerimaan tercatat sudah saling menjelaskan.' : 'Ada selisih yang perlu diperiksa sebelum closing dianggap final.' : 'Data closing belum tersedia untuk periode ini.'}</p>
    </section>

    <section className="report-print-metrics">
      <Metric label={basis === 'cash' ? 'Kas masuk' : 'Omset selesai'} value={formatRupiah(basis === 'cash' ? cashIn : stats.totalRevenue)} />
      <Metric label="Nilai nota" value={formatRupiah(num(closing?.summary.newOrderValue) || stats.orders.reduce((sum, order) => sum + num(order.totalAmount), 0))} />
      <Metric label="Piutang" value={formatRupiah(outstanding)} tone={outstanding > 0 ? 'danger' : 'default'} />
      <Metric label="Diskon" value={formatRupiah(stats.totalDiscount)} />
      <Metric label="Total order" value={String(stats.totalOrders)} />
      <Metric label="Pelanggan unik" value={String(stats.uniqueCustomers)} />
    </section>

    {closing && <section className="report-print-grid">
      <div className="report-print-panel">
        <h2>Rekonsiliasi nota ke uang</h2>
        <SummaryRow label="Nilai nota" value={num(closing.summary.newOrderValue)} />
        <SummaryRow label="Dibayar saldo membership" value={num(closing.membershipUsed.amount)} negative />
        <SummaryRow label="Belum dibayar / piutang" value={outstanding} negative />
        <SummaryRow label="Seharusnya diterima" value={num(closing.summary.newOrderValue) - num(closing.membershipUsed.amount) - outstanding} emphasis />
        <SummaryRow label="Tercatat diterima" value={num(rec?.paidOnNewOrders)} />
        <SummaryRow label="Selisih" value={num(rec?.difference)} emphasis />
      </div>
      <div className="report-print-panel">
        <h2>Dana diterima usaha</h2>
        {cashMethods.map((method) => <div key={method.method} className="report-print-payment">
          <SummaryRow label={method.method === 'CASH' ? 'Tunai di laci' : 'QRIS netto'} value={num(method.amount)} emphasis />
          {method.method === 'QRIS' && <><SummaryRow label="QRIS bruto customer" value={num(method.grossAmount)} /><SummaryRow label="Biaya gateway" value={num(method.feeAmount)} negative /></>}
        </div>)}
        {num(closing.cashIn.fromPreviousOrders) > 0 && <SummaryRow label="Pelunasan nota lama" value={num(closing.cashIn.fromPreviousOrders)} />}
        <SummaryRow label="Total dana diterima" value={cashIn} emphasis />
      </div>
    </section>}

    <section className="report-print-grid">
      <div className="report-print-panel">
        <h2>Setoran per kasir</h2>
        <table className="report-print-table"><thead><tr><th>Kasir</th><th>Nota</th><th>Piutang</th><th className="right">Kas masuk</th></tr></thead><tbody>
          {(closing?.byCashier || []).map((cashier) => <tr key={cashier.staffId}><td>{cashier.fullName}</td><td>{cashier.orderCount}</td><td>{formatRupiah(num(cashier.outstanding))}</td><td className="right">{formatRupiah(num(cashier.cashIn))}</td></tr>)}
          {!closing?.byCashier.length && <tr><td colSpan={4} className="muted">Belum ada data setoran kasir.</td></tr>}
        </tbody></table>
      </div>
      <div className="report-print-panel">
        <h2>Piutang per umur</h2>
        <table className="report-print-table"><thead><tr><th>Umur</th><th>Nota</th><th className="right">Nilai</th></tr></thead><tbody>
          {(closing?.receivablesAging || []).map((item) => <tr key={item.bucket}><td>{item.bucket}</td><td>{item.orderCount}</td><td className="right">{formatRupiah(num(item.amount))}</td></tr>)}
          {!closing?.receivablesAging.length && <tr><td colSpan={3} className="muted">Tidak ada piutang pada periode ini.</td></tr>}
        </tbody></table>
      </div>
    </section>

    <section className="report-print-panel report-print-transactions">
      <div className="report-print-section-title"><div><h2>Lampiran transaksi</h2><p>{stats.orders.length} transaksi pada periode terpilih</p></div><p>Data sumber • LONDRI POS</p></div>
      <table className="report-print-table report-print-transaction-table"><colgroup><col className="tx-invoice" /><col className="tx-date" /><col className="tx-customer" /><col className="tx-branch" /><col className="tx-cashier" /><col className="tx-method" /><col className="tx-order-status" /><col className="tx-payment-status" /><col className="tx-money" /><col className="tx-money" /><col className="tx-money" /><col className="tx-money" /><col className="tx-money" /></colgroup><thead><tr><th>Invoice</th><th>Tanggal</th><th>Pelanggan</th><th>Cabang</th><th>Kasir</th><th>Metode</th><th>Proses</th><th>Pembayaran</th><th className="right">Nilai</th><th className="right">Diskon</th><th className="right">Member</th><th className="right">Dibayar</th><th className="right">Sisa</th></tr></thead><tbody>
        {stats.orders.map((order) => {
          const membershipUsed = num(order.membershipAmountUsed);
          const amountPaid = num(order.amountPaid);
          const due = num(order.underPayment);
          const invoiceValue = num(order.totalAmount) + membershipUsed;
          const settled = order.paymentStatus === 'PAID' || (order.paymentStatus == null && due <= 0);
          return <tr key={order.id}><td className="mono">{order.invoiceNumber}</td><td>{formatTanggal(order.createdAt)}</td><td>{order.customerName}</td><td>{order.branch?.name || '—'}</td><td>{order.staff?.fullName || '—'}</td><td>{PAYMENT_LABEL[order.paymentMethod]}</td><td>{STATUS_LABEL[order.status]}</td><td><span className={`report-print-payment-state ${settled ? 'is-paid' : 'is-due'}`}>{settled ? 'Lunas' : 'Belum lunas'}</span></td><td className="right">{formatRupiah(invoiceValue)}</td><td className="right tx-discount-value">{formatRupiah(num(order.discountAmount))}</td><td className="right">{formatRupiah(membershipUsed)}</td><td className="right">{formatRupiah(amountPaid + membershipUsed)}</td><td className={`right ${due > 0 ? 'tx-outstanding' : ''}`}>{formatRupiah(due)}</td></tr>;
        })}
      </tbody><tfoot><tr><td colSpan={8}>TOTAL {stats.orders.length} TRANSAKSI</td><td className="right">{formatRupiah(stats.orders.reduce((sum, order) => sum + num(order.totalAmount) + num(order.membershipAmountUsed), 0))}</td><td className="right">{formatRupiah(stats.orders.reduce((sum, order) => sum + num(order.discountAmount), 0))}</td><td className="right">{formatRupiah(stats.orders.reduce((sum, order) => sum + num(order.membershipAmountUsed), 0))}</td><td className="right">{formatRupiah(stats.orders.reduce((sum, order) => sum + num(order.amountPaid) + num(order.membershipAmountUsed), 0))}</td><td className="right">{formatRupiah(stats.orders.reduce((sum, order) => sum + num(order.underPayment), 0))}</td></tr></tfoot></table>
      <p className="report-print-transaction-note">Nilai = total tagihan setelah diskon sebelum pemakaian saldo member. Dibayar mencakup pembayaran kas/QRIS dan saldo member yang dipakai. Sisa berasal dari tagihan order yang belum dibayar.</p>
    </section>

    <footer className="report-print-footer"><span>Londri POS • Dokumen operasional</span><span>Basis kas = tunai diterima + QRIS netto settlement. Basis omset = order Selesai/Diambil.</span></footer>
  </article>;
}
