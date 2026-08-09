import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { FinanceSummaryCards } from '../components/finance/FinanceSummaryCards';
import { FinanceMonthPicker } from '../components/finance/FinanceMonthPicker';
import { IncomePieChart } from '../components/finance/IncomePieChart';
import { TurnoverLineChart } from '../components/finance/TurnoverLineChart';
import { MonthlyBreakdownTable } from '../components/finance/MonthlyBreakdownTable';
import { PaidStudentsTable } from '../components/finance/PaidStudentsTable';
import { MonthlyStudentPaymentsTable } from '../components/finance/MonthlyStudentPaymentsTable';
import { MonthlyExpensesSection } from '../components/finance/MonthlyExpensesSection';
import { fetchFinanceOverview, fetchMonthlyBills } from '../api/finance';
import type { FinanceOverview, MonthlyStudentBill } from '../types/finance';

export function Finance() {
  const location = useLocation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [monthlyBills, setMonthlyBills] = useState<MonthlyStudentBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([fetchFinanceOverview(year, month), fetchMonthlyBills(year, month)])
      .then(([overview, bills]) => {
        setData(overview);
        setMonthlyBills(bills);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Moliyani yuklab bo\'lmadi');
      })
      .finally(() => setLoading(false));
  }, [year, month, refreshKey]);

  useEffect(() => {
    if (loading) return;

    const hash = location.hash.replace('#', '');
    const anchors = ['oylik-tolovlar', 'tolov-qilgan', 'xarajatlar'];
    if (anchors.includes(hash)) {
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [loading, location.hash]);

  function handlePeriodChange(nextYear: number, nextMonth: number) {
    setYear(nextYear);
    setMonth(nextMonth);
  }

  function reloadOverview() {
    setRefreshKey((value) => value + 1);
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loader">Yuklanmoqda...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dashboard loading">
        <div className="loader">{error || 'Ma\'lumot topilmadi'}</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />
      <Navbar />
      <main className="dashboard-main">
        <div className="finance-toolbar">
          <FinanceMonthPicker year={year} month={month} onChange={handlePeriodChange} />
        </div>

        <FinanceSummaryCards summary={data.summary} periodLabel={data.selectedPeriod.label} />

        <div className="finance-charts-grid">
          <IncomePieChart methods={data.paymentMethods} periodLabel={data.selectedPeriod.label} />
          <TurnoverLineChart
            data={data.monthlyTurnover}
            year={data.selectedPeriod.year}
            selectedMonth={data.selectedPeriod.month}
            onSelectMonth={(nextMonth) => setMonth(nextMonth)}
          />
        </div>

        <MonthlyBreakdownTable
          rows={data.monthlyTurnover}
          selectedMonth={data.selectedPeriod.month}
          year={data.selectedPeriod.year}
          onSelectMonth={(nextMonth) => setMonth(nextMonth)}
        />

        <div id="oylik-tolovlar">
          <MonthlyStudentPaymentsTable
            periodLabel={data.selectedPeriod.label}
            year={year}
            month={month}
            bills={monthlyBills}
            onChanged={reloadOverview}
          />
        </div>

        <div id="tolov-qilgan">
          <PaidStudentsTable periodLabel={data.selectedPeriod.label} bills={monthlyBills} />
        </div>

        <div id="xarajatlar">
          <MonthlyExpensesSection
            year={year}
            month={month}
            periodLabel={data.selectedPeriod.label}
            onSaved={reloadOverview}
          />
        </div>
      </main>
    </div>
  );
}
