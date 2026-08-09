import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Clock, DoorOpen, ChevronRight, Plus, Layers, Pencil, Trash2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { AddGroupModal } from '../components/AddGroupModal';
import { EditGroupModal } from '../components/EditGroupModal';
import { fetchGroups, deleteGroup } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { GROUP_DAY_TYPE_SHORT } from '../lib/groupDayTypes';
import type { GroupListItem } from '../types';

const dayLabels = GROUP_DAY_TYPE_SHORT;

export function Groups() {
  const { notify } = useNotifications();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups()
      .then(setGroups)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.code.includes(q) ||
        g.teacherName.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const stats = useMemo(() => ({
    total: groups.length,
    students: groups.reduce((s, g) => s + g.studentsCount, 0),
    even: groups.filter((g) => g.dayType === 'even').length,
    odd: groups.filter((g) => g.dayType === 'odd').length,
    weekdays: groups.filter((g) => g.dayType === 'weekdays').length,
    daily: groups.filter((g) => g.dayType === 'daily').length,
  }), [groups]);

  async function handleDelete(group: GroupListItem) {
    const confirmed = window.confirm(`"${group.name}" guruhini o'chirmoqchimisiz?`);
    if (!confirmed) return;

    const ok = await deleteGroup(group.id);
    if (ok) {
      notify(notificationMessages.groupDeleted(group.name));
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    } else {
      window.alert("Guruhni o'chirishda xatolik yuz berdi");
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
              <h1 className="groups-title">Guruhlar</h1>
              <p className="groups-subtitle">Barcha guruhlarni boshqaring va yangilarini qo'shing</p>
            </div>
            <div className="groups-toolbar">
              <div className="groups-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Guruh yoki o'qituvchi qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="groups-add-btn" onClick={() => setModalOpen(true)}>
                <Plus size={16} />
                Guruh qo'shish
              </button>
            </div>
          </div>

          <div className="groups-stats-row">
            <div className="groups-stat-card">
              <Layers size={18} />
              <div>
                <span className="groups-stat-value">{stats.total}</span>
                <span className="groups-stat-label">Jami guruhlar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <Users size={18} />
              <div>
                <span className="groups-stat-value">{stats.students}</span>
                <span className="groups-stat-label">O'quvchilar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-dot even" />
              <div>
                <span className="groups-stat-value">{stats.even}</span>
                <span className="groups-stat-label">Juft kunlar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-dot odd" />
              <div>
                <span className="groups-stat-value">{stats.odd}</span>
                <span className="groups-stat-label">Toq kunlar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-dot weekdays" />
              <div>
                <span className="groups-stat-value">{stats.weekdays}</span>
                <span className="groups-stat-label">Dush–shanba</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <span className="groups-stat-dot daily" />
              <div>
                <span className="groups-stat-value">{stats.daily}</span>
                <span className="groups-stat-label">Har kuni</span>
              </div>
            </div>
          </div>

          <div className="groups-table-wrap">
            <table className="groups-table">
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Guruh nomi</th>
                  <th>O'qituvchi</th>
                  <th>Xona</th>
                  <th>Vaqt</th>
                  <th>Kunlar</th>
                  <th>O'quvchilar</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((group) => (
                  <tr key={group.id}>
                    <td>
                      <span className="group-code-badge" style={{ backgroundColor: group.color }}>
                        {group.code}
                      </span>
                    </td>
                    <td className="group-name-cell">{group.name}</td>
                    <td>
                      <Link to={`/foydalanuvchi/${group.teacherId}`} className="table-link">
                        {group.teacherName}
                      </Link>
                    </td>
                    <td>
                      <span className="table-meta">
                        <DoorOpen size={14} />
                        {group.roomNumber}-xona
                      </span>
                    </td>
                    <td>
                      <span className="table-meta">
                        <Clock size={14} />
                        {group.startTime} — {group.endTime}
                      </span>
                    </td>
                    <td>
                      <span className={`day-badge day-badge-${group.dayType}`}>
                        {dayLabels[group.dayType]}
                      </span>
                    </td>
                    <td>
                      <span className="table-meta">
                        <Users size={14} />
                        {group.studentsCount}
                      </span>
                    </td>
                    <td>
                      <div className="group-actions">
                        <Link to={`/guruh/${group.id}`} className="group-open-btn">
                          Ochish
                          <ChevronRight size={14} />
                        </Link>
                        <button
                          type="button"
                          className="group-icon-btn group-edit-btn"
                          onClick={() => setEditingGroup(group)}
                          aria-label="Tahrirlash"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="group-icon-btn group-delete-btn"
                          onClick={() => handleDelete(group)}
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
              <p className="groups-empty">Guruh topilmadi</p>
            )}
          </div>
        </div>
      </main>

      <AddGroupModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(group) => setGroups((prev) => [...prev, group].sort((a, b) => a.code.localeCompare(b.code)))}
      />

      <EditGroupModal
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onUpdated={(updated) =>
          setGroups((prev) =>
            prev.map((g) => (g.id === updated.id ? updated : g)).sort((a, b) => a.code.localeCompare(b.code))
          )
        }
      />
    </div>
  );
}
