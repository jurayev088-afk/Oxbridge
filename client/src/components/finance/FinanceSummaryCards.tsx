import type { CSSProperties } from 'react';
import { TrendingUp, TrendingDown, PiggyBank, CalendarDays } from 'lucide-react';
import type { FinanceSummary } from '../../types/finance';
import { formatMoney } from '../../lib/formatDisplay';

interface FinanceSummaryCardsProps {
  summary: FinanceSummary;
  periodLabel: string;
}

const cards = [
  { key: 'income' as const, label: 'Oylik tushum', icon: TrendingUp, color: '#22c55e', glow: 'rgba(34, 197, 94, 0.15)' },
  { key: 'expense' as const, label: 'Oylik chiqim', icon: TrendingDown, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.15)' },
  { key: 'profit' as const, label: 'Oylik foyda', icon: PiggyBank, color: '#3b82f6', glow: 'rgba(59, 130, 246, 0.15)' },
  { key: 'yearToDateIncome' as const, label: 'Yillik jami tushum', icon: CalendarDays, color: '#a855f7', glow: 'rgba(168, 85, 247, 0.15)' },
];

export function FinanceSummaryCards({ summary, periodLabel }: FinanceSummaryCardsProps) {
  return (
    <section className="finance-summary">
      <h2 className="finance-section-title">{periodLabel} — oylik ko&apos;rsatkichlar</h2>
      <div className="finance-summary-grid">
        {cards.map((card) => (
          <div
            key={card.key}
            className="finance-summary-card"
            style={{ '--card-glow': card.glow, '--card-accent': card.color } as CSSProperties}
          >
            <div className="finance-summary-icon">
              <card.icon size={20} />
            </div>
            <span className="finance-summary-label">{card.label}</span>
            <span className="finance-summary-value">{formatMoney(summary[card.key])}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
