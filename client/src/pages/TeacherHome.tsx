import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Clock, DoorOpen, Layers, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { fetchMyGroups } from '../api/auth';
import { useAuth } from '../context/AuthContext';

import { GROUP_DAY_TYPE_SHORT } from '../lib/groupDayTypes';
import type { GroupDayType } from '../types';

interface TeacherGroup {
  id: string;
  code: string;
  name: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  dayType: GroupDayType;
  color: string;
  studentsCount: number;
}

const dayLabels = GROUP_DAY_TYPE_SHORT;

export function TeacherHome() {
  const { user, token } = useAuth();
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchMyGroups(token)
      .then(setGroups)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="dashboard">
      <Header />
      <main className="dashboard-main">
        <div className="portal-page">
          <div className="portal-hero">
            <h1>Salom, {user?.name}</h1>
            <p>O&apos;qituvchi kabineti — gurhingiz va davomat</p>
          </div>

          {loading ? (
            <p className="portal-empty">Yuklanmoqda...</p>
          ) : groups.length === 0 ? (
            <div className="portal-card portal-empty-card">
              <Layers size={24} />
              <p>Sizga biriktirilgan guruh yo&apos;q. Admin bilan bog&apos;laning.</p>
            </div>
          ) : (
            <div className="portal-grid">
              {groups.map((group) => (
                <article key={group.id} className="portal-card" style={{ '--portal-accent': group.color } as React.CSSProperties}>
                  <div className="portal-card-top">
                    <span className="portal-badge">Guruh {group.code}</span>
                    <h2>{group.name}</h2>
                  </div>

                  <div className="portal-meta-list">
                    <span><Clock size={14} /> {group.startTime} — {group.endTime}</span>
                    <span><DoorOpen size={14} /> Xona {group.roomNumber}</span>
                    <span><CalendarCheck size={14} /> {dayLabels[group.dayType]}</span>
                    <span><Users size={14} /> {group.studentsCount} ta o&apos;quvchi</span>
                  </div>

                  <Link to={`/guruh/${group.id}`} className="btn-primary portal-action-btn">
                    Davomat qilish
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
