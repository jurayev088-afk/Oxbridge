import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  GraduationCap,
  Layers,
  Phone,
  Mail,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { UserAvatar } from '../components/UserAvatar';
import { AddTeacherModal } from '../components/AddTeacherModal';
import { EditTeacherModal } from '../components/EditTeacherModal';
import { deleteTeacher, fetchTeachers } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import type { TeacherListItem } from '../types';
import { formatPhoneOrDash, normalizePhoneForSearch } from '../lib/formatDisplay';

export function Teachers() {
  const { notify } = useNotifications();
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeachers()
      .then(setTeachers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = normalizePhoneForSearch(search);
    if (!q) return teachers;
    return teachers.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (qDigits && normalizePhoneForSearch(t.phone).includes(qDigits)) ||
        (!qDigits && t.phone.toLowerCase().includes(q)) ||
        t.email.toLowerCase().includes(q)
    );
  }, [teachers, search]);

  const stats = useMemo(() => ({
    total: teachers.length,
    withGroups: teachers.filter((t) => t.groupsCount > 0).length,
    groups: teachers.reduce((sum, t) => sum + t.groupsCount, 0),
  }), [teachers]);

  async function handleDelete(teacher: TeacherListItem) {
    const confirmed = window.confirm(`"${teacher.name}" o'qituvchisini o'chirmoqchimisiz?`);
    if (!confirmed) return;

    const ok = await deleteTeacher(teacher.id);
    if (ok) {
      notify(notificationMessages.teacherDeleted(teacher.name));
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
    } else {
      window.alert("O'qituvchini o'chirib bo'lmaydi. Avval guruhlarini o'zgartiring.");
    }
  }

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
      <main className="dashboard-main dashboard-main-full">
        <div className="groups-page">
          <div className="groups-top">
            <div className="groups-intro">
              <h1 className="groups-title">O'qituvchilar</h1>
              <p className="groups-subtitle">Barcha o'qituvchilarni boshqaring va yangilarini qo'shing</p>
            </div>
            <div className="groups-toolbar">
              <div className="groups-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Ism, telefon yoki email qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="groups-add-btn" onClick={() => setModalOpen(true)}>
                <Plus size={16} />
                O'qituvchi qo'shish
              </button>
            </div>
          </div>

          <div className="groups-stats-row">
            <div className="groups-stat-card">
              <GraduationCap size={18} />
              <div>
                <span className="groups-stat-value">{stats.total}</span>
                <span className="groups-stat-label">Jami o'qituvchilar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <Layers size={18} />
              <div>
                <span className="groups-stat-value">{stats.groups}</span>
                <span className="groups-stat-label">Guruhlar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-dot even" />
              <div>
                <span className="groups-stat-value">{stats.withGroups}</span>
                <span className="groups-stat-label">Faol o'qituvchilar</span>
              </div>
            </div>
          </div>

          <div className="groups-table-wrap">
            <table className="groups-table">
              <thead>
                <tr>
                  <th>O&apos;qituvchi</th>
                  <th>Telefon</th>
                  <th>Email</th>
                  <th>Guruhlar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher) => (
                  <tr key={teacher.id}>
                    <td>
                      <div className="table-user-cell">
                        <UserAvatar name={teacher.name} photoUrl={teacher.photoUrl} />
                        <span className="group-name-cell" title={teacher.name}>{teacher.name}</span>
                      </div>
                    </td>
                    <td className="cell-phone">
                      <span className="table-meta">
                        <Phone size={14} />
                        {formatPhoneOrDash(teacher.phone)}
                      </span>
                    </td>
                    <td>
                      <span className="table-meta">
                        <Mail size={14} />
                        {teacher.email || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="table-meta">
                        <Layers size={14} />
                        {teacher.groupsCount}
                      </span>
                    </td>
                    <td>
                      <div className="group-actions">
                        <Link to={`/foydalanuvchi/${teacher.id}`} className="group-open-btn">
                          Ochish
                          <ChevronRight size={14} />
                        </Link>
                        <button
                          type="button"
                          className="group-icon-btn group-edit-btn"
                          onClick={() => setEditingTeacher(teacher)}
                          aria-label="Tahrirlash"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="group-icon-btn group-delete-btn"
                          onClick={() => handleDelete(teacher)}
                          aria-label="O'chirish"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="groups-empty">O'qituvchi topilmadi</p>
            )}
          </div>
        </div>
      </main>

      <AddTeacherModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(teacher) => setTeachers((prev) => [...prev, teacher].sort((a, b) => a.name.localeCompare(b.name)))}
      />

      <EditTeacherModal
        teacher={editingTeacher}
        onClose={() => setEditingTeacher(null)}
        onUpdated={(updated) =>
          setTeachers((prev) =>
            prev.map((t) => (t.id === updated.id ? updated : t)).sort((a, b) => a.name.localeCompare(b.name))
          )
        }
      />
    </div>
  );
}
