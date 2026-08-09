import { CheckCircle2, Download, Wallet } from 'lucide-react';
import type { MonthlyStudentBill } from '../../types/finance';
import { exportPaidStudentsPdf } from '../../lib/exportPdf';
import { formatMoney } from '../../lib/formatDisplay';

interface PaidStudentsTableProps {
  periodLabel: string;
  bills: MonthlyStudentBill[];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('uz-UZ');
}

function toExportRows(bills: MonthlyStudentBill[]) {
  return bills
    .filter((bill) => bill.status === 'paid' || bill.status === 'partial')
    .map((row) => ({
      studentName: row.studentName,
      groupName: row.groupName,
      expectedAmount: row.expectedAmount,
      paidAmount: row.paidAmount ?? (row.status === 'paid' ? row.expectedAmount : 0),
      remainingAmount: row.remainingAmount ?? Math.max(0, row.expectedAmount - (row.paidAmount ?? 0)),
      status: row.status === 'partial' ? ('partial' as const) : ('paid' as const),
      methodLabel: row.paymentMethodLabel ?? 'Naqt',
      paymentDate: row.paymentDate ?? '',
    }));
}

export function PaidStudentsTable({ periodLabel, bills }: PaidStudentsTableProps) {
  const rows = bills.filter((bill) => bill.status === 'paid' || bill.status === 'partial');
  const paidTotal = rows.reduce((sum, row) => sum + (row.paidAmount ?? 0), 0);
  const remainingTotal = rows.reduce(
    (sum, row) => sum + (row.remainingAmount ?? Math.max(0, row.expectedAmount - (row.paidAmount ?? 0))),
    0
  );
  const fullCount = rows.filter((row) => row.status === 'paid').length;
  const partialCount = rows.filter((row) => row.status === 'partial').length;

  function handlePdf() {
    exportPaidStudentsPdf({
      periodLabel,
      rows: toExportRows(bills),
    });
  }

  return (
    <section className="finance-card finance-card-wide finance-details-section">
      <div className="finance-section-header">
        <div>
          <h3 className="finance-card-title">{periodLabel} — to&apos;lov qilgan o&apos;quvchilar</h3>
          <p className="finance-section-subtitle">
            {rows.length} ta o&apos;quvchi ({fullCount} to&apos;liq, {partialCount} qisman) · To&apos;langan{' '}
            {formatMoney(paidTotal)}
            {remainingTotal > 0 && <> · Qolgan {formatMoney(remainingTotal)}</>}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary finance-pdf-btn"
          onClick={handlePdf}
          disabled={rows.length === 0}
        >
          <Download size={16} />
          PDF yuklab olish
        </button>
      </div>

      <div className="finance-table-wrap">
        <table className="finance-table">
          <thead>
            <tr>
              <th>#</th>
              <th>O&apos;quvchi</th>
              <th>Guruh</th>
              <th>Oylik</th>
              <th>To&apos;langan</th>
              <th>Qolgan</th>
              <th>Holat</th>
              <th>Usul</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="finance-table-empty">
                  Bu oyda to&apos;lov qilgan o&apos;quvchilar yo&apos;q
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const paid = row.paidAmount ?? 0;
                const remaining = row.remainingAmount ?? Math.max(0, row.expectedAmount - paid);

                return (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>{row.studentName}</td>
                    <td>{row.groupName}</td>
                    <td>{formatMoney(row.expectedAmount)}</td>
                    <td className="finance-table-income">{formatMoney(paid)}</td>
                    <td>{remaining > 0 ? formatMoney(remaining) : '—'}</td>
                    <td>
                      {row.status === 'paid' ? (
                        <span className="monthly-bill-status paid">
                          <CheckCircle2 size={14} />
                          To&apos;liq
                        </span>
                      ) : (
                        <span className="monthly-bill-status partial">
                          <Wallet size={14} />
                          Qisman
                        </span>
                      )}
                    </td>
                    <td>{row.paymentMethodLabel ?? 'Naqt'}</td>
                    <td>{formatDate(row.paymentDate)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4}>Jami</td>
                <td>{formatMoney(paidTotal)}</td>
                <td>{remainingTotal > 0 ? formatMoney(remainingTotal) : '—'}</td>
                <td colSpan={3}>
                  {fullCount} to&apos;liq · {partialCount} qisman
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}
