import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  CircleDashed,
  Layers,
  Phone,
  Wallet,
} from 'lucide-react';
import { Header } from '../components/Header';
import { fetchMyAttendance } from '../api/auth';
import { fetchUser } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getMonthPeriodLabel } from '../lib/monthLabels';
import type { User } from '../types';
import { formatMoney, formatPhoneOrDash } from '../lib/formatDisplay';

const statusLabels: Record<string, string> = {
  present: 'Keldi',
  absent: 'Kelmadi',
  excused: 'Sababli',
  late: 'Kechikdi',
};

import { formatAttendanceDateLabel } from '../lib/dates';

export function StudentHome() {
  const { user, token } = useAuth();
  const now = new Date();
  const periodLabel = getMonthPeriodLabel(now.getFullYear(), now.getMonth() + 1);
  const [profile, setProfile] = useState<User | null>(null);
  const [attendance, setAttendance] = useState<
    Array<{ date: string; status: string; groupName: string; classTime?: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !token) return;

    Promise.all([fetchUser(user.id), fetchMyAttendance(token)])
      .then(([userData, attendanceData]) => {
        setProfile(userData);
        setAttendance(attendanceData);
      })
      .finally(() => setLoading(false));
  }, [user?.id, token]);

  const monthlyFee = profile?.monthlyFee ?? profile?.currentBillAmount ?? profile?.paymentDue ?? 0;

  return (
    <div className="dashboard">
      <Header />
      <main className="dashboard-main">
        <div className="portal-page">
          <div className="portal-hero">
            <h1>Salom, {user?.name}</h1>
            <p>O&apos;quvchi kabineti</p>
          </div>

          {loading ? (
            <p className="portal-empty">Yuklanmoqda...</p>
          ) : (
            <div className="portal-grid portal-grid-student">
              <article className="portal-card">
                <h2>Shaxsiy ma&apos;lumotlar</h2>
                <div className="portal-meta-list">
                  <span><Phone size={14} /> {formatPhoneOrDash(profile?.phone)}</span>
                  {profile?.groupName && (
                    <span><Layers size={14} /> {profile.groupName}</span>
                  )}
                  <span><Wallet size={14} /> Oylik to&apos;lov: {formatMoney(monthlyFee)}</span>
                </div>
                <Link to={`/foydalanuvchi/${user?.id}`} className="btn-secondary portal-action-btn">
                  Profilni ochish
                </Link>
              </article>

              <article className="portal-card">
                <h2>{periodLabel} to&apos;lov holati</h2>
                {profile?.paymentStatus === 'paid' ? (
                  <span className="monthly-bill-status paid account-payment-status">
                    <CheckCircle2 size={14} />
                    To&apos;lov qilindi
                  </span>
                ) : profile?.paymentStatus === 'partial' ? (
                  <span className="monthly-bill-status partial account-payment-status">
                    <Wallet size={14} />
                    Qisman to&apos;langan
                    <small>
                      {formatMoney(profile.paidAmount ?? 0)} / {formatMoney(profile.currentBillAmount ?? monthlyFee)}
                      {' · '}qolgan {formatMoney(profile.remainingAmount ?? 0)}
                    </small>
                  </span>
                ) : (
                  <span className="monthly-bill-status pending account-payment-status">
                    <CircleDashed size={14} />
                    To&apos;lov qilinmagan
                  </span>
                )}
              </article>

              <article className="portal-card portal-card-wide">
                <h2>
                  <CalendarCheck size={18} />
                  Davomat tarixi
                </h2>
                {attendance.length === 0 ? (
                  <p className="portal-empty">Hali davomat yozuvlari yo&apos;q</p>
                ) : (
                  <div className="portal-attendance-list">
                    {attendance.map((row, index) => (
                      <div key={`${row.date}-${index}`} className="portal-attendance-row">
                        <div>
                          <strong>{formatAttendanceDateLabel(row.date, row.classTime)}</strong>
                          <span>{row.groupName}</span>
                        </div>
                        <span className={`attendance-pill attendance-pill-${row.status}`}>
                          {statusLabels[row.status] ?? row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
