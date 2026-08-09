import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Layers,
  AlertCircle,
  Users,
  Clock,
  UserCheck,
  GraduationCap,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { DashboardStats } from '../types';
import { formatMoney, formatNumber } from '../lib/formatDisplay';

interface StatCardsProps {
  stats: DashboardStats;
}

function formatStatValue(value: number, hidden: boolean, asMoney = false): string {
  if (hidden) return '•••';
  return asMoney ? formatMoney(value) : formatNumber(value);
}

export function StatCards({ stats }: StatCardsProps) {
  const [hidden, setHidden] = useState(false);

  const cards = [
    { label: 'Faol lidlar', value: stats.activeLeads, icon: UserPlus, color: '#60a5fa', to: '/lidlar' },
    { label: 'Guruhlar', value: stats.groupsCount, icon: Layers, color: '#a78bfa', to: '/guruhlar' },
    {
      label: 'Qolgan qarzlar',
      value: stats.remainingDebts,
      icon: AlertCircle,
      color: '#f87171',
      fullValue: formatMoney(stats.remainingDebts),
      asMoney: true,
      to: '/oquvchilar?filter=unpaid',
    },
    { label: 'Qarzdorlar', value: stats.debtors, icon: Users, color: '#fb923c', to: '/oquvchilar?filter=unpaid' },
    { label: "To'lov yaqin", value: stats.paymentNear, icon: Clock, color: '#fbbf24', to: '/oquvchilar?filter=payment-near' },
    { label: "Faol o'quvchilar", value: stats.activeStudents, icon: UserCheck, color: '#4ade80', to: '/oquvchilar?filter=active' },
    { label: "O'qituvchilar", value: stats.teachersCount, icon: GraduationCap, color: '#c084fc', to: '/oqituvchilar' },
  ];

  return (
    <section className="stats-section">
      <div className="stats-actions">
        <button
          type="button"
          className="stats-action-btn"
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          Raqamlarni yopish
        </button>
      </div>

      <div className="stats-grid">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="stat-card" title={card.fullValue}>
            <div className="stat-icon" style={{ color: card.color }}>
              <card.icon size={18} />
            </div>
            <span className="stat-label">{card.label}</span>
            <span className="stat-value">{formatStatValue(card.value, hidden, 'asMoney' in card && card.asMoney)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
