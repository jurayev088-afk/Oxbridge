import { useEffect, useMemo, useState } from 'react';
import { Wallet, X } from 'lucide-react';
import { fetchStudentsList } from '../api/client';
import { recordStudentPayment } from '../api/finance';
import { PAYMENT_METHODS } from '../config/paymentConfig';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import type { StudentListItem } from '../types';
import { AmountInput } from './AmountInput';
import { parseAmountNumber } from '../lib/formatInputs';
import { getStudentDebtAmount } from '../lib/studentFilters';
import { formatMoney } from '../lib/formatDisplay';

interface QuickPaymentModalProps {
  open: boolean;
  initialStudentId?: string;
  billYear?: number;
  billMonth?: number;
  onClose: () => void;
}

function getDefaultPayAmount(student: StudentListItem) {
  const debt = getStudentDebtAmount(student);
  return debt > 0 ? String(debt) : '';
}

function todayIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function QuickPaymentModal({
  open,
  initialStudentId,
  billYear,
  billMonth,
  onClose,
}: QuickPaymentModalProps) {
  const { notify } = useNotifications();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    studentId: '',
    amount: '',
    method: 'naxt',
    paymentDate: todayIsoDate(),
    note: '',
  });

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError('');
    setForm({
      studentId: initialStudentId ?? '',
      amount: '',
      method: 'naxt',
      paymentDate: todayIsoDate(),
      note: '',
    });

    fetchStudentsList()
      .then((list) => {
        setStudents(list);
        if (initialStudentId) {
          const student = list.find((s) => s.id === initialStudentId);
          if (student) {
            setForm((prev) => ({
              ...prev,
              studentId: initialStudentId,
              amount: getDefaultPayAmount(student),
            }));
          }
        }
      })
      .catch(() => setError("O'quvchilar ro'yxatini yuklab bo'lmadi"))
      .finally(() => setLoading(false));
  }, [open, initialStudentId]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === form.studentId),
    [students, form.studentId]
  );

  function handleStudentChange(studentId: string) {
    const student = students.find((s) => s.id === studentId);
    setForm((prev) => ({
      ...prev,
      studentId,
      amount: student ? getDefaultPayAmount(student) : prev.amount,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId) {
      setError("O'quvchini tanlang");
      return;
    }
    const amount = parseAmountNumber(form.amount);
    if (!amount || amount <= 0) {
      setError("To'g'ri summa kiriting");
      return;
    }

    const debt = selectedStudent ? getStudentDebtAmount(selectedStudent) : null;
    if (debt != null && debt > 0 && amount > debt) {
      setError(`Qolgan summa ${formatMoney(debt)} — undan oshmasligi kerak`);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payment = await recordStudentPayment({
        studentId: form.studentId,
        amount,
        method: form.method,
        paymentDate: form.paymentDate,
        note: form.note.trim() || undefined,
        billYear,
        billMonth,
      });
      notify(notificationMessages.paymentRecorded(payment.studentName, amount));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "To'lovni saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="payment-modal-title">
            <Wallet size={20} />
            <h2 className="modal-title">To&apos;lov qabul qilish</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="payment-modal-loading">Yuklanmoqda...</p>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="modal-grid">
              <label className="modal-field modal-field-full">
                <span>O&apos;quvchi</span>
                <select
                  className="edit-input"
                  value={form.studentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                >
                  <option value="">Tanlang...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                      {student.groupName ? ` — ${student.groupName}` : ''}
                      {student.paymentDue ? ` (${formatMoney(student.paymentDue)})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {selectedStudent && getStudentDebtAmount(selectedStudent) > 0 && (
                <div className="payment-due-hint modal-field-full">
                  {selectedStudent.paymentStatus === 'partial' ? (
                    <>
                      Qisman to&apos;langan: <strong>{formatMoney(selectedStudent.paidAmount ?? 0)}</strong>
                      {' · '}
                      Qolgan: <strong>{formatMoney(getStudentDebtAmount(selectedStudent))}</strong>
                    </>
                  ) : (
                    <>
                      Qolgan to&apos;lov: <strong>{formatMoney(getStudentDebtAmount(selectedStudent))}</strong>
                    </>
                  )}
                </div>
              )}

              <label className="modal-field">
                <span>Summa</span>
                <AmountInput
                  value={form.amount}
                  onChange={(amount) => setForm({ ...form, amount })}
                  placeholder="850 000"
                />
              </label>

              <label className="modal-field">
                <span>To&apos;lov usuli</span>
                <select
                  className="edit-input"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="modal-field">
                <span>Sana</span>
                <input
                  className="edit-input"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                />
              </label>

              <label className="modal-field modal-field-full">
                <span>Izoh (ixtiyoriy)</span>
                <input
                  className="edit-input"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Masalan: Yanvar oyi uchun"
                />
              </label>
            </div>

            {error && <p className="modal-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Bekor qilish
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saqlanmoqda...' : "To'lovni saqlash"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
