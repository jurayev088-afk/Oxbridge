import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { StatCards } from '../components/StatCards';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { fetchStats, fetchSchedule } from '../api/client';
import type { DashboardStats, ScheduleEntry, DayType } from '../types';

const defaultStats: DashboardStats = {
  activeLeads: 0,
  groupsCount: 0,
  remainingDebts: 0,
  debtors: 0,
  paymentNear: 0,
  activeStudents: 0,
  trialStudents: 0,
  leftStudents: 0,
  teachersCount: 0,
};

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [dayType, setDayType] = useState<DayType>('even');
  const [interval, setInterval] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchStats(), fetchSchedule('even')])
      .then(([statsData, scheduleData]) => {
        setStats(statsData);
        setSchedule(scheduleData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSchedule(dayType)
      .then(setSchedule)
      .catch(console.error);
  }, [dayType]);

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loader">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />
      <Navbar />
      <main className="dashboard-main">
        <StatCards stats={stats} />
        <ScheduleGrid
          entries={schedule}
          dayType={dayType}
          onDayTypeChange={setDayType}
          interval={interval}
          onIntervalChange={setInterval}
        />
      </main>
    </div>
  );
}
