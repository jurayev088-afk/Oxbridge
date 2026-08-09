import type { MonthlyTurnover } from '../../types/finance';
import { formatMoney } from '../../lib/formatDisplay';

interface MonthlyBreakdownTableProps {
  rows: MonthlyTurnover[];
  selectedMonth: number;
  year: number;
  onSelectMonth: (month: number) => void;
}

export function MonthlyBreakdownTable({ rows, selectedMonth, year, onSelectMonth }: MonthlyBreakdownTableProps) {
  const totalIncome = rows.reduce((sum, row) => sum + row.income, 0);
  const totalExpense = rows.reduce((sum, row) => sum + row.expense, 0);
  const totalProfit = totalIncome - totalExpense;

  return (
    <section className="finance-card finance-card-wide">
      <h3 className="finance-card-title">{year} yil — oylik daromad jadvali</h3>

      <div className="finance-table-wrap">
        <table className="finance-table">
          <thead>
            <tr>
              <th>Oy</th>
              <th>Tushum</th>
              <th>Chiqim</th>
              <th>Foyda</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.monthNum}
                className={row.monthNum === selectedMonth ? 'finance-table-row-active' : 'finance-table-row-clickable'}
                onClick={() => onSelectMonth(row.monthNum)}
              >
                <td>{row.month}</td>
                <td className="finance-table-income">{formatMoney(row.income)}</td>
                <td className="finance-table-expense">{formatMoney(row.expense)}</td>
                <td className="finance-table-profit">{formatMoney(row.profit)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Jami</td>
              <td>{formatMoney(totalIncome)}</td>
              <td>{formatMoney(totalExpense)}</td>
              <td>{formatMoney(totalProfit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
