import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  DoorOpen,
  Calendar,
  Users,
  GraduationCap,
  Pencil,
  Save,
  X,
  Plus,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { AddStudentModal } from '../components/AddStudentModal';
import { GroupAttendanceSection } from '../components/GroupAttendanceSection';
import { fetchGroup, updateGroup } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { useAuth } from '../context/AuthContext';
import { hasAdminAccess } from '../lib/roles';
import { GROUP_DAY_TYPE_LABELS, GROUP_DAY_TYPE_OPTIONS } from '../lib/groupDayTypes';
import type { Group, GroupDayType } from '../types';
import { UserAvatar } from '../components/UserAvatar';

const dayLabels = GROUP_DAY_TYPE_LABELS;

export function GroupAccount() {
  const { notify } = useNotifications();
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher';
  const isAdmin = hasAdminAccess(user?.role);
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [form, setForm] = useState<Group | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchGroup(id)
      .then((data) => {
        setGroup(data);
        setForm(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function startEdit() {
    setForm(group);
    setEditing(true);
  }

  function cancelEdit() {
    setForm(group);
    setEditing(false);
  }

  async function saveEdit() {
    if (!id || !form) return;
    setSaving(true);

    const updated = await updateGroup(id, {
      name: form.name,
      roomNumber: form.roomNumber,
      startTime: form.startTime,
      endTime: form.endTime,
      dayType: form.dayType,
      color: form.color,
    });

    if (updated) {
      notify(notificationMessages.groupUpdated(updated.name));
      setGroup(updated);
      setForm(updated);
      setEditing(false);
    }
    setSaving(false);
  }

  function updateField<K extends keyof Group>(key: K, value: Group[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loader">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!group || !form) {
    return (
      <div className="dashboard">
        <Header />
        <main className="dashboard-main">
          <div className="account-page">
            <p className="account-error">Guruh topilmadi</p>
            <Link to={isTeacher ? '/oqituvchi-kabinet' : '/'} className="back-link">
              <ArrowLeft size={16} /> {isTeacher ? 'Kabinetga qaytish' : 'Bosh sahifaga qaytish'}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const display = editing ? form : group;

  return (
    <div className="dashboard">
      <Header />
      <Navbar />
      <main className="dashboard-main">
        <div className="account-page">
          <div className="account-top-bar">
            <Link to={isTeacher ? '/oqituvchi-kabinet' : '/'} className="back-link">
              <ArrowLeft size={16} /> {isTeacher ? 'Kabinetga qaytish' : 'Bosh sahifaga qaytish'}
            </Link>
            {isAdmin && !editing ? (
              <button type="button" className="edit-btn" onClick={startEdit}>
                <Pencil size={14} /> Tahrirlash
              </button>
            ) : isAdmin && editing ? (
              <div className="edit-actions">
                <button type="button" className="cancel-btn" onClick={cancelEdit}>
                  <X size={14} /> Bekor qilish
                </button>
                <button type="button" className="save-btn" onClick={saveEdit} disabled={saving}>
                  <Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="account-header">
            <div className="account-badge" style={{ backgroundColor: display.color }}>
              {group.code}
            </div>
            <div className="account-header-info">
              {editing ? (
                <input
                  className="edit-input title-input"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              ) : (
                <h1 className="account-title">{group.name}</h1>
              )}
              <p className="account-subtitle">Guruh akkaunti</p>
            </div>
          </div>

          <div className="account-info-grid">
            <div className="account-info-card">
              <Clock size={18} />
              <div className="info-field">
                <span className="info-label">Dars vaqti</span>
                {editing ? (
                  <div className="time-inputs">
                    <input
                      className="edit-input"
                      type="time"
                      value={form.startTime}
                      onChange={(e) => updateField('startTime', e.target.value)}
                    />
                    <span>—</span>
                    <input
                      className="edit-input"
                      type="time"
                      value={form.endTime}
                      onChange={(e) => updateField('endTime', e.target.value)}
                    />
                  </div>
                ) : (
                  <span className="info-value">{group.startTime} — {group.endTime}</span>
                )}
              </div>
            </div>

            <div className="account-info-card">
              <Calendar size={18} />
              <div className="info-field">
                <span className="info-label">Dars kunlari</span>
                {editing ? (
                  <select
                    className="edit-input"
                    value={form.dayType}
                    onChange={(e) => updateField('dayType', e.target.value as GroupDayType)}
                  >
                    {GROUP_DAY_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="info-value">{dayLabels[group.dayType]}</span>
                )}
              </div>
            </div>

            <div className="account-info-card">
              <DoorOpen size={18} />
              <div className="info-field">
                <span className="info-label">Xona</span>
                {editing ? (
                  <select
                    className="edit-input"
                    value={form.roomNumber}
                    onChange={(e) => updateField('roomNumber', Number(e.target.value))}
                  >
                    <option value={1}>1-xona</option>
                    <option value={2}>2-xona</option>
                  </select>
                ) : (
                  <span className="info-value">{group.roomNumber}-xona</span>
                )}
              </div>
            </div>

            <div className="account-info-card">
              <GraduationCap size={18} />
              <div className="info-field">
                <span className="info-label">O'qituvchi</span>
                <Link to={`/foydalanuvchi/${group.teacherId}`} className="info-link">
                  {group.teacherName}
                </Link>
              </div>
            </div>

            {editing && (
              <div className="account-info-card">
                <div className="color-dot" style={{ backgroundColor: form.color }} />
                <div className="info-field">
                  <span className="info-label">Rang</span>
                  <input
                    className="edit-input"
                    type="color"
                    value={form.color}
                    onChange={(e) => updateField('color', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="account-section">
            <div className="section-header-row">
              <h2 className="section-title">
                <Users size={18} />
                O&apos;quvchilar ({group.students.length})
              </h2>
              {isAdmin && (
                <button
                  type="button"
                  className="section-add-btn"
                  onClick={() => setStudentModalOpen(true)}
                >
                  <Plus size={14} />
                  O&apos;quvchi qo&apos;shish
                </button>
              )}
            </div>
            <div className="user-list">
              {group.students.length === 0 ? (
                <p className="students-empty">Hali o&apos;quvchi qo&apos;shilmagan</p>
              ) : (
                group.students.map((student) => (
                  <div key={student.id} className="user-list-item user-list-item-static">
                    <UserAvatar name={student.name} photoUrl={student.photoUrl} />
                    <span>{student.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <GroupAttendanceSection
            groupId={group.id}
            groupName={group.name}
            groupDayType={group.dayType}
            classStartTime={group.startTime}
            classEndTime={group.endTime}
            students={group.students}
          />
        </div>
      </main>

      {isAdmin && (
      <AddStudentModal
        open={studentModalOpen}
        groupId={group.id}
        onClose={() => setStudentModalOpen(false)}
        onAdded={(updated) => {
          setGroup(updated);
          setForm(updated);
        }}
      />
      )}
    </div>
  );
}
