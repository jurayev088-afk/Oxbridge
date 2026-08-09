import { useEffect, useState } from 'react';
import { Download, Save } from 'lucide-react';
import type { MonthlyExpenses } from '../../types/finance';
import { fetchMonthlyExpenses, saveMonthlyExpenses } from '../../api/finance';
import { exportMonthlyExpensesPdf } from '../../lib/exportPdf';
import { useNotifications } from '../../context/NotificationContext';
import { AmountInput } from '../AmountInput';
import { parseAmountNumber } from '../../lib/formatInputs';
import { formatMoney } from '../../lib/formatDisplay';

interface MonthlyExpensesSectionProps {
  year: number;
  month: number;
  periodLabel: string;
  onSaved?: () => void;
}

export function MonthlyExpensesSection({ year, month, periodLabel, onSaved }: MonthlyExpensesSectionProps) {
  const { notify } = useNotifications();
  const [data, setData] = useState<MonthlyExpenses | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchMonthlyExpenses(year, month)
      .then(setData)
      .finally(() => setLoading(false));
  }, [year, month]);

  function updateTotals(next: MonthlyExpenses) {
    const totalTeacherSalaries = next.teacherSalaries.reduce((sum, row) => sum + row.amount, 0);
    return {
      ...next,
      totalTeacherSalaries,
      totalExpenses: totalTeacherSalaries + next.electricity,
    };
  }

  async function handleSave() {
    if (!data) return;
    setSaving(true);
    try {
      const payload = updateTotals(data);
      const saved = await saveMonthlyExpenses(payload);
      setData(saved);
      notify({ kind: 'success', title: 'Xarajatlar saqlandi', message: `${periodLabel} oylik xarajatlar bazaga yozildi` });
      onSaved?.();
    } catch (err) {
      notify({
        kind: 'warning',
        title: 'Saqlashda xatolik',
        message: err instanceof Error ? err.message : 'Xarajatlarni saqlab bo\'lmadi',
      });
    } finally {
      setSaving(false);
    }
  }

  function handlePdf() {
    if (!data) return;
    exportMonthlyExpensesPdf({
      periodLabel,
      teacherSalaries: data.teacherSalaries,
      electricity: data.electricity,
      totalExpenses: data.totalExpenses,
    });
  }

  if (loading || !data) {
    return (
      <section className="finance-card finance-card-wide finance-details-section">
        <div className="finance-section-subtitle">Xarajatlar yuklanmoqda...</div>
      </section>
    );
  }

  const displayData = updateTotals(data);

  return (
    <section className="finance-card finance-card-wide finance-details-section">
      <div className="finance-section-header">
        <div>
          <h3 className="finance-card-title">{periodLabel} — oylik xarajatlar</h3>
          <p className="finance-section-subtitle">O&apos;qituvchi maoshlari va svet xarajatini kiriting</p>
        </div>
        <div className="finance-section-actions">
          <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
          <button type="button" className="btn-secondary finance-pdf-btn" onClick={handlePdf}>
            <Download size={16} />
            PDF yuklab olish
          </button>
        </div>
      </div>

      <div className="finance-expense-grid">
        <div className="finance-expense-block">
          <h4 className="finance-expense-title">O&apos;qituvchilarga berilgan pul</h4>
          <div className="finance-expense-rows">
            {displayData.teacherSalaries.map((teacher) => (
              <label key={teacher.teacherId} className="finance-expense-row">
                <span className="finance-expense-label">{teacher.teacherName}</span>
                <AmountInput
                  className="finance-expense-input edit-input"
                  value={teacher.amount || ''}
                  placeholder="0"
                  onChange={(raw) => {
                    const next = {
                      ...data,
                      teacherSalaries: data.teacherSalaries.map((row) =>
                        row.teacherId === teacher.teacherId
                          ? { ...row, amount: parseAmountNumber(raw) }
                          : row
                      ),
                    };
                    setData(updateTotals(next));
                  }}
                />
              </label>
            ))}
          </div>
          <div className="finance-expense-total">
            Jami maosh: <strong>{formatMoney(displayData.totalTeacherSalaries)}</strong>
          </div>
        </div>

        <div className="finance-expense-block">
          <h4 className="finance-expense-title">Kommunal xarajatlar</h4>
          <label className="finance-expense-row">
            <span className="finance-expense-label">Svet (elektr energiyasi)</span>
            <AmountInput
              className="finance-expense-input edit-input"
              value={displayData.electricity || ''}
              placeholder="0"
              onChange={(raw) => {
                const next = { ...data, electricity: parseAmountNumber(raw) };
                setData(updateTotals(next));
              }}
            />
          </label>
          <div className="finance-expense-total finance-expense-grand">
            Umumiy xarajat: <strong>{formatMoney(displayData.totalExpenses)}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
