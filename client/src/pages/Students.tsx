import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  UserCheck,
  Layers,
  Phone,
  Wallet,
  ChevronRight,
  Pencil,
  Trash2,
  Users,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { UserAvatar } from '../components/UserAvatar';
import { AddStudentListModal } from '../components/AddStudentListModal';
import { EditStudentListModal } from '../components/EditStudentListModal';
import { deleteStudent, fetchStudentsList } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getMonthPeriodLabel } from '../lib/monthLabels';
import {
  applyStudentFilter,
  getStudentDebtAmount,
  isStudentListFilter,
  studentFilterLabels,
} from '../lib/studentFilters';
import type { StudentListItem } from '../types';
import { formatMoney, formatPhoneOrDash, normalizePhoneForSearch } from '../lib/formatDisplay';

export function Students() {
  const [searchParams] = useSearchParams();
  const rawFilter = searchParams.get('filter');
  const filter = isStudentListFilter(rawFilter) ? rawFilter : null;
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);
  const periodLabel = getMonthPeriodLabel(year, month);
  const { notify } = useNotifications();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentsList(year, month)
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [year, month]);

  function reloadStudents() {
    fetchStudentsList(year, month).then(setStudents);
  }

  const filtered = useMemo(() => {
    let list = applyStudentFilter(students, filter);

    const q = search.trim().toLowerCase();
    const qDigits = normalizePhoneForSearch(search);
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (qDigits && normalizePhoneForSearch(s.phone).includes(qDigits)) ||
        (!qDigits && s.phone.toLowerCase().includes(q)) ||
        s.email.toLowerCase().includes(q) ||
        (s.groupName?.toLowerCase().includes(q) ?? false)
    );
  }, [students, search, filter]);

  const filteredDebtTotal = useMemo(
    () => filtered.reduce((sum, student) => sum + getStudentDebtAmount(student), 0),
    [filtered]
  );

  const stats = useMemo(() => ({
    total: students.length,
    withGroup: students.filter((s) => s.groupId).length,
    withoutGroup: students.filter((s) => !s.groupId).length,
    paid: students.filter((s) => s.paymentStatus === 'paid').length,
    unpaid: students.filter((s) => s.paymentStatus !== 'paid').length,
  }), [students]);

  async function handleDelete(student: StudentListItem) {
    const confirmed = window.confirm(`"${student.name}" o'quvchisini o'chirmoqchimisiz?`);
    if (!confirmed) return;

    const ok = await deleteStudent(student.id);
    if (ok) {
      notify(notificationMessages.studentDeleted(student.name));
      setStudents((prev) => prev.filter((s) => s.id !== student.id));
    } else {
      window.alert("O'quvchini o'chirishda xatolik yuz berdi");
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
              <h1 className="groups-title">O&apos;quvchilar</h1>
              <p className="groups-subtitle">
                {filter
                  ? studentFilterLabels[filter]
                  : `${periodLabel} — oylik to'lov holati`}
              </p>
              {filter && (
                <Link to="/oquvchilar" className="table-link" style={{ fontSize: 13, marginTop: 6, display: 'inline-block' }}>
                  Barcha o&apos;quvchilarni ko&apos;rish
                </Link>
              )}
            </div>
            <div className="groups-toolbar">
              <div className="groups-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Ism, telefon yoki guruh qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="groups-add-btn" onClick={() => setModalOpen(true)}>
                <Plus size={16} />
                O'quvchi qo'shish
              </button>
            </div>
          </div>

          {filter ? (
            <div className="groups-stats-row">
              <div className="groups-stat-card">
                <Users size={18} />
                <div>
                  <span className="groups-stat-value">{filtered.length}</span>
                  <span className="groups-stat-label">{studentFilterLabels[filter]}</span>
                </div>
              </div>
              {(filter === 'unpaid' || filter === 'debtors' || filter === 'payment-near') && (
                <div className="groups-stat-card">
                  <Wallet size={18} />
                  <div>
                    <span className="groups-stat-value">{formatMoney(filteredDebtTotal)}</span>
                    <span className="groups-stat-label">Qolgan qarz</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="groups-stats-row">
            <div className="groups-stat-card">
              <UserCheck size={18} />
              <div>
                <span className="groups-stat-value">{stats.total}</span>
                <span className="groups-stat-label">Jami o'quvchilar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <Layers size={18} />
              <div>
                <span className="groups-stat-value">{stats.withGroup}</span>
                <span className="groups-stat-label">Guruhda</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <Users size={18} />
              <div>
                <span className="groups-stat-value">{stats.withoutGroup}</span>
                <span className="groups-stat-label">Guruhsiz</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <CheckCircle2 size={18} />
              <div>
                <span className="groups-stat-value">{stats.paid}</span>
                <span className="groups-stat-label">To&apos;lov qilindi</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <CircleDashed size={18} />
              <div>
                <span className="groups-stat-value">{stats.unpaid}</span>
                <span className="groups-stat-label">To&apos;lov qilinmagan</span>
              </div>
            </div>
            </div>
          )}

          <div className="groups-table-wrap">
            <table className="groups-table">
              <thead>
                <tr>
                  <th>O&apos;quvchi</th>
                  <th>Telefon</th>
                  <th>Guruh</th>
                  <th>Oylik to&apos;lov</th>
                  <th>Holat</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="table-user-cell">
                        <UserAvatar name={student.name} photoUrl={student.photoUrl} />
                        <span className="group-name-cell" title={student.name}>{student.name}</span>
                      </div>
                    </td>
                    <td className="cell-phone">
                      <span className="table-meta">
                        <Phone size={14} />
                        {formatPhoneOrDash(student.phone)}
                      </span>
                    </td>
                    <td>
                      {student.groupId ? (
                        <Link
                          to={`/guruh/${student.groupId}`}
                          className="table-link"
                          title={student.groupName ?? student.groupId}
                        >
                          {student.groupName ?? student.groupId}
                        </Link>
                      ) : (
                        <span className="table-muted">Guruhsiz</span>
                      )}
                    </td>
                    <td>
                      <span className="table-meta">
                        <Wallet size={14} />
                        {student.paymentStatus === 'partial' ? (
                          <>
                            {formatMoney(student.paidAmount ?? 0)}
                            {' / '}
                            {formatMoney(student.currentBillAmount ?? student.monthlyFee ?? 0)}
                          </>
                        ) : (
                          formatMoney(student.currentBillAmount ?? student.monthlyFee ?? student.paymentDue ?? 0)
                        )}
                      </span>
                    </td>
                    <td>
                      {student.paymentStatus === 'paid' ? (
                        <span className="day-badge day-badge-weekdays">
                          <CheckCircle2 size={12} />
                          To&apos;landi
                        </span>
                      ) : student.paymentStatus === 'partial' ? (
                        <span className="day-badge day-badge-even">
                          <Wallet size={12} />
                          Qisman
                        </span>
                      ) : (
                        <span className="day-badge day-badge-daily">
                          <CircleDashed size={12} />
                          To&apos;lanmagan
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="group-actions">
                        <Link to={`/foydalanuvchi/${student.id}`} className="group-open-btn">
                          Ochish
                          <ChevronRight size={14} />
                        </Link>
                        <button
                          type="button"
                          className="group-icon-btn group-edit-btn"
                          onClick={() => setEditingStudent(student)}
                          aria-label="Tahrirlash"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="group-icon-btn group-delete-btn"
                          onClick={() => handleDelete(student)}
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
              <p className="groups-empty">
                {filter ? 'Bu filtr bo\'yicha o\'quvchi topilmadi' : 'O\'quvchi topilmadi'}
              </p>
            )}
          </div>
        </div>
      </main>

      <AddStudentListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(student) => {
          setStudents((prev) => [...prev, student].sort((a, b) => a.name.localeCompare(b.name)));
          reloadStudents();
        }}
      />

      <EditStudentListModal
        student={editingStudent}
        onClose={() => setEditingStudent(null)}
        onUpdated={(updated) => {
          setStudents((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => a.name.localeCompare(b.name))
          );
          reloadStudents();
        }}
      />
    </div>
  );
}
