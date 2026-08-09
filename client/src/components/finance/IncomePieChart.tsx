import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from 'recharts';
import type { PaymentMethodStat } from '../../types/finance';
import { formatMoney } from '../../lib/formatDisplay';

interface IncomePieChartProps {
  methods: PaymentMethodStat[];
  periodLabel: string;
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PaymentMethodStat & { percent: number } }> }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="chart-tooltip chart-tooltip-premium">
      <strong>{data.label}</strong>
      <span>{formatMoney(data.amount)}</span>
      <span>{data.count} ta to&apos;lov · {data.percent}%</span>
    </div>
  );
}

function CenterLabel({ viewBox, total }: { viewBox?: { cx?: number; cy?: number }; total: number }) {
  if (!viewBox?.cx || !viewBox?.cy) return null;
  return (
    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={viewBox.cx} y={viewBox.cy - 6} fill="#94a3b8" fontSize="11" fontWeight="500">
        Jami
      </tspan>
      <tspan x={viewBox.cx} y={viewBox.cy + 14} fill="#eef2ff" fontSize="18" fontWeight="700">
        {formatCompact(total)}
      </tspan>
    </text>
  );
}

export function IncomePieChart({ methods, periodLabel }: IncomePieChartProps) {
  const total = methods.reduce((sum, m) => sum + m.amount, 0);
  const data = methods.map((m) => ({
    ...m,
    percent: total > 0 ? Math.round((m.amount / total) * 1000) / 10 : 0,
  }));

  return (
    <section className="finance-card finance-card-premium">
      <div className="finance-card-head">
        <h3 className="finance-card-title">{periodLabel} — tushumlar</h3>
        <span className="finance-card-badge">{methods.reduce((s, m) => s + m.count, 0)} ta to&apos;lov</span>
      </div>

      <div className="pie-chart-wrap pie-chart-wrap-premium">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <defs>
              {data.map((entry) => (
                <linearGradient key={entry.method} id={`pie-${entry.method}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                  <stop offset="100%" stopColor={entry.color} stopOpacity={0.65} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={3}
              dataKey="amount"
              stroke="rgba(10, 14, 26, 0.8)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.method} fill={`url(#pie-${entry.method})`} />
              ))}
              <Label
                content={(props) => (
                  <CenterLabel
                    viewBox={props.viewBox as { cx?: number; cy?: number } | undefined}
                    total={total}
                  />
                )}
                position="center"
              />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="pie-legend pie-legend-premium">
          {data.map((item) => (
            <div key={item.method} className="pie-legend-item">
              <span className="pie-dot pie-dot-lg" style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}55` }} />
              <span className="pie-legend-label">{item.label}</span>
              <span className="pie-legend-percent">{item.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="payment-list payment-list-premium">
        {methods.map((method) => (
          <div key={method.method} className="payment-list-item">
            <div className="payment-list-left">
              <span className="pie-dot pie-dot-lg" style={{ backgroundColor: method.color }} />
              <div>
                <span className="payment-method-name">{method.label}</span>
                <span className="payment-method-count">{method.count} ta to&apos;lov</span>
              </div>
            </div>
            <span className="payment-method-amount">{formatMoney(method.amount)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
