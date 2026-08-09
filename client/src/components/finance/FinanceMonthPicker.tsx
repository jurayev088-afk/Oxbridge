import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_LABELS_FULL, getFinanceStartMonth } from '../../lib/monthLabels';

interface FinanceMonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);

function clampMonth(year: number, month: number) {
  const startMonth = getFinanceStartMonth(year);
  return Math.max(startMonth, Math.min(12, month));
}

export function FinanceMonthPicker({ year, month, onChange }: FinanceMonthPickerProps) {
  const startMonth = getFinanceStartMonth(year);
  const canGoPrev = year > currentYear - 2 || month > startMonth;

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    onChange(date.getFullYear(), clampMonth(date.getFullYear(), date.getMonth() + 1));
  }

  function handleYearChange(nextYear: number) {
    onChange(nextYear, clampMonth(nextYear, month));
  }

  return (
    <div className="finance-month-picker">
      <button
        type="button"
        className="finance-month-nav"
        onClick={() => shiftMonth(-1)}
        disabled={!canGoPrev}
        aria-label="Oldingi oy"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="finance-month-selects">
        <select
          className="finance-month-select"
          value={month}
          onChange={(e) => onChange(year, Number(e.target.value))}
          aria-label="Oy tanlash"
        >
          {MONTH_LABELS_FULL.map((label, index) => {
            const monthValue = index + 1;
            if (monthValue < startMonth) return null;
            return (
              <option key={label} value={monthValue}>
                {label}
              </option>
            );
          })}
        </select>

        <select
          className="finance-month-select"
          value={year}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          aria-label="Yil tanlash"
        >
          {yearOptions.map((optionYear) => (
            <option key={optionYear} value={optionYear}>
              {optionYear}
            </option>
          ))}
        </select>
      </div>

      <button type="button" className="finance-month-nav" onClick={() => shiftMonth(1)} aria-label="Keyingi oy">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
