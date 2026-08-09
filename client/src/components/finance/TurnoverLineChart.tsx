import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  ComposedChart,
  Line,
} from 'recharts';
import type { MonthlyTurnover } from '../../types/finance';
import { formatMoney } from '../../lib/formatDisplay';

interface TurnoverLineChartProps {
  data: MonthlyTurnover[];
  year: number;
  selectedMonth: number;
  onSelectMonth: (month: number) => void;
}

function formatAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip chart-tooltip-premium">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.name} style={{ color: item.color }}>
          {item.name}: {formatMoney(item.value)}
        </span>
      ))}
    </div>
  );
}

export function TurnoverLineChart({ data, year, selectedMonth, onSelectMonth }: TurnoverLineChartProps) {
  const monthCount = data.length;

  return (
    <section className="finance-card finance-card-wide finance-card-premium">
      <div className="finance-card-head">
        <h3 className="finance-card-title">{year} yil — oylik aylanmalar</h3>
        <span className="finance-card-badge">{monthCount} oy</span>
      </div>

      <div className="line-chart-wrap line-chart-wrap-premium">
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="profitArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 8" stroke="rgba(99, 116, 170, 0.15)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
              axisLine={{ stroke: 'rgba(99, 116, 170, 0.2)' }}
              tickLine={false}
              dy={8}
            />
            <YAxis
              tickFormatter={formatAxis}
              tick={{ fill: '#64748b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(59, 130, 246, 0.25)', strokeWidth: 1 }} />
            <Legend
              wrapperStyle={{ paddingTop: 20 }}
              formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{value}</span>}
              iconType="circle"
            />
            <Area type="monotone" dataKey="income" stroke="none" fill="url(#incomeArea)" legendType="none" />
            <Area type="monotone" dataKey="profit" stroke="none" fill="url(#profitArea)" legendType="none" />
            <Line
              type="monotone"
              dataKey="income"
              name="Tushumlar"
              stroke="#22c55e"
              strokeWidth={3}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const isActive = payload.monthNum === selectedMonth;
                return (
                  <circle
                    key={`income-${payload.monthNum}`}
                    cx={cx}
                    cy={cy}
                    r={isActive ? 7 : 4}
                    fill="#22c55e"
                    stroke={isActive ? '#ffffff' : 'rgba(34, 197, 94, 0.3)'}
                    strokeWidth={isActive ? 3 : 1}
                    style={{ cursor: 'pointer', filter: isActive ? 'drop-shadow(0 0 8px rgba(34,197,94,0.6))' : undefined }}
                    onClick={() => onSelectMonth(payload.monthNum)}
                  />
                );
              }}
              activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Chiqimlar"
              stroke="#f87171"
              strokeWidth={2.5}
              strokeDasharray="6 4"
              dot={{ r: 3, fill: '#f87171', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="profit"
              name="Foyda"
              stroke="#60a5fa"
              strokeWidth={3}
              dot={{ r: 4, fill: '#60a5fa', strokeWidth: 0 }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
