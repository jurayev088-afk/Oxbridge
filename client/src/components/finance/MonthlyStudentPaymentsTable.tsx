import { useState } from 'react';
import { CheckCircle2, CircleDashed, Download, Wallet } from 'lucide-react';
import { recordStudentPayment, updateMonthlyBillAmount } from '../../api/finance';
import { useNotifications } from '../../context/NotificationContext';
import { notificationMessages } from '../../lib/notificationMessages';
import { exportPaidStudentsPdf } from '../../lib/exportPdf';
import { parseAmountDigits, parseAmountNumber } from '../../lib/formatInputs';
import type { MonthlyStudentBill } from '../../types/finance';
import { AmountInput } from '../AmountInput';
import { formatMoney } from '../../lib/formatDisplay';

interface MonthlyStudentPaymentsTableProps {
  periodLabel: string;
  year: number;
  month: number;
  bills: MonthlyStudentBill[];
  onChanged: () => void;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('uz-UZ');
}

function getExpectedAmount(bill: MonthlyStudentBill, expectedAmounts: Record<number, string>) {
  if (bill.id in expectedAmounts) return expectedAmounts[bill.id];
  return String(bill.expectedAmount ?? '');
}

function getPayAmount(bill: MonthlyStudentBill, payAmounts: Record<number, string>) {
  if (bill.id in payAmounts) return payAmounts[bill.id];
  const remaining = bill.remainingAmount ?? Math.max(0, bill.expectedAmount - (bill.paidAmount ?? 0));
  return remaining > 0 ? String(remaining) : String(bill.expectedAmount || '');
}

export function MonthlyStudentPaymentsTable({
  periodLabel,
  year,
  month,
  bills,
  onChanged,
}: MonthlyStudentPaymentsTableProps) {
  const { notify } = useNotifications();
  const [savingId, setSavingId] = useState<number | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [expectedAmounts, setExpectedAmounts] = useState<Record<number, string>>({});
  const [payAmounts, setPayAmounts] = useState<Record<number, string>>({});

  const paidCount = bills.filter((b) => b.status === 'paid').length;
  const partialCount = bills.filter((b) => b.status === 'partial').length;
  const pendingCount = bills.filter((b) => b.status === 'pending').length;
  const collectedTotal = bills.reduce((sum, b) => sum + (b.paidAmount ?? 0), 0);

  async function handleExpectedAmountSave(bill: MonthlyStudentBill) {
    const raw = getExpectedAmount(bill, expectedAmounts);
    if (parseAmountDigits(raw) === '') {
      window.alert("To'g'ri summa kiriting");
      return;
    }
    const amount = parseAmountNumber(raw);
    if (amount === bill.expectedAmount) return;

    setSavingId(bill.id);
    try {
      await updateMonthlyBillAmount(bill.id, amount);
      setExpectedAmounts((prev) => {
        const next = { ...prev };
        delete next[bill.id];
        return next;
      });
      onChanged();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Summani saqlashda xatolik');
    } finally {
      setSavingId(null);
    }
  }

  async function handlePay(bill: MonthlyStudentBill) {
    if (bill.status === 'paid' || !bill.expectedAmount) return;

    const remaining = bill.remainingAmount ?? Math.max(0, bill.expectedAmount - (bill.paidAmount ?? 0));
    const amount = parseAmountNumber(getPayAmount(bill, payAmounts));
    if (!amount || amount <= 0) {
      window.alert("To'g'ri summa kiriting");
      return;
    }
    if (amount > remaining) {
      window.alert(`Qolgan summa ${formatMoney(remaining)} — undan oshmasligi kerak`);
      return;
    }

    const confirmed = window.confirm(
      `${bill.studentName} uchun ${formatMoney(amount)} to'lovni qabul qilasizmi?${
        bill.status === 'partial' ? `\n(Jami ${formatMoney(bill.expectedAmount)}, qolgan ${formatMoney(remaining)})` : ''
      }`
    );
    if (!confirmed) return;

    setPayingId(bill.id);
    try {
      const payment = await recordStudentPayment({
        studentId: bill.studentId,
        amount,
        method: 'naxt',
        billYear: year,
        billMonth: month,
        note: `${periodLabel} oylik to'lov`,
      });
      notify(notificationMessages.paymentRecorded(payment.studentName, payment.amount));
      setPayAmounts((prev) => {
        const next = { ...prev };
        delete next[bill.id];
        return next;
      });
      onChanged();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "To'lovni saqlashda xatolik");
    } finally {
      setPayingId(null);
    }
  }

  function handlePdf() {
    const exportRows = bills.filter((b) => b.status === 'paid' || b.status === 'partial');
    exportPaidStudentsPdf({
      periodLabel,
      rows: exportRows.map((row) => ({
        studentName: row.studentName,
        groupName: row.groupName,
        expectedAmount: row.expectedAmount,
        paidAmount: row.paidAmount ?? (row.status === 'paid' ? row.expectedAmount : 0),
        remainingAmount:
          row.remainingAmount ??
          Math.max(0, row.expectedAmount - (row.paidAmount ?? 0)),
        status: row.status === 'partial' ? 'partial' : 'paid',
        methodLabel: row.paymentMethodLabel ?? 'Naqt',
        paymentDate: row.paymentDate ?? '',
      })),
    });
  }

  function renderStatus(bill: MonthlyStudentBill) {
    if (bill.status === 'paid') {
      return (
        <span className="monthly-bill-status paid">
          <CheckCircle2 size={14} />
          To&apos;lov qilindi
          {bill.paymentDate && <small>{formatDate(bill.paymentDate)}</small>}
        </span>
      );
    }

    if (bill.status === 'partial') {
      const paid = bill.paidAmount ?? 0;
      const remaining = bill.remainingAmount ?? Math.max(0, bill.expectedAmount - paid);
      return (
        <span className="monthly-bill-status partial">
          <Wallet size={14} />
          Qisman to&apos;langan
          <small>
            {formatMoney(paid)} / {formatMoney(bill.expectedAmount)} · qolgan {formatMoney(remaining)}
          </small>
        </span>
      );
    }

    return (
      <span className="monthly-bill-status pending">
        <CircleDashed size={14} />
        To&apos;lov qilinmagan
      </span>
    );
  }

  return (
    <section className="finance-card finance-card-wide finance-details-section">
      <div className="finance-section-header">
        <div>
          <h3 className="finance-card-title">{periodLabel} — oylik to&apos;lovlar</h3>
          <p className="finance-section-subtitle">
            {paidCount} ta to&apos;liq · {partialCount} ta qisman · {pendingCount} ta qilinmagan · Yig&apos;ilgan{' '}
            {formatMoney(collectedTotal)}
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary finance-pdf-btn"
          onClick={handlePdf}
          disabled={paidCount === 0 && partialCount === 0}
        >
          <Download size={16} />
          PDF yuklab olish
        </button>
      </div>

      <div className="finance-table-wrap">
        <table className="finance-table monthly-bills-table">
          <thead>
            <tr>
              <th>#</th>
              <th>O&apos;quvchi</th>
              <th>Guruh</th>
              <th>Oylik summa</th>
              <th>Holat</th>
              <th>Amal</th>
            </tr>
          </thead>
          <tbody>
            {bills.length === 0 ? (
              <tr>
                <td colSpan={6} className="finance-table-empty">
                  O&apos;quvchilar yo&apos;q
                </td>
              </tr>
            ) : (
              bills.map((bill, index) => {
                const canPay = bill.status !== 'paid' && bill.expectedAmount > 0;
                const remaining = bill.remainingAmount ?? Math.max(0, bill.expectedAmount - (bill.paidAmount ?? 0));

                return (
                  <tr key={bill.id} className={bill.status === 'paid' ? 'monthly-bill-row-paid' : ''}>
                    <td>{index + 1}</td>
                    <td>{bill.studentName}</td>
                    <td>{bill.groupName}</td>
                    <td>
                      {bill.status === 'paid' ? (
                        <span className="finance-table-income">{formatMoney(bill.expectedAmount)}</span>
                      ) : (
                        <div className="monthly-bill-amount-cell">
                          <div className="monthly-bill-custom-row">
                            <AmountInput
                              className="edit-input"
                              value={getExpectedAmount(bill, expectedAmounts)}
                              onChange={(raw) =>
                                setExpectedAmounts((prev) => ({
                                  ...prev,
                                  [bill.id]: raw,
                                }))
                              }
                            />
                            <button
                              type="button"
                              className="btn-secondary monthly-bill-save-btn"
                              onClick={() => handleExpectedAmountSave(bill)}
                              disabled={savingId === bill.id}
                            >
                              Saqlash
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                    <td>{renderStatus(bill)}</td>
                    <td>
                      {canPay ? (
                        <div className="monthly-bill-pay-row">
                          <AmountInput
                            className="edit-input monthly-bill-pay-input"
                            value={getPayAmount(bill, payAmounts)}
                            onChange={(raw) =>
                              setPayAmounts((prev) => ({
                                ...prev,
                                [bill.id]: raw,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="btn-primary monthly-bill-pay-btn"
                            disabled={payingId === bill.id}
                            onClick={() => handlePay(bill)}
                          >
                            {payingId === bill.id ? 'Saqlanmoqda...' : "To'lov qilish"}
                          </button>
                        </div>
                      ) : (
                        <span className="table-muted">{bill.paymentMethodLabel ?? 'Naqt'}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
