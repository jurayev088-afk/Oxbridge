import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchTeachers, updateGroup } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import type { Group, GroupDayType, GroupListItem } from '../types';
import { GROUP_DAY_TYPE_OPTIONS } from '../lib/groupDayTypes';

interface EditGroupModalProps {
  group: GroupListItem | null;
  onClose: () => void;
  onUpdated: (group: GroupListItem) => void;
}

function toListItem(g: Group, studentsCount: number): GroupListItem {
  return {
    id: g.id,
    code: g.code,
    name: g.name,
    teacherId: g.teacherId,
    teacherName: g.teacherName,
    roomNumber: g.roomNumber,
    startTime: g.startTime,
    endTime: g.endTime,
    dayType: g.dayType,
    color: g.color,
    studentsCount,
  };
}

export function EditGroupModal({ group, onClose, onUpdated }: EditGroupModalProps) {
  const { notify } = useNotifications();
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    teacherId: '',
    roomNumber: 1,
    startTime: '08:00',
    endTime: '10:00',
    dayType: 'even' as GroupDayType,
    color: '#64b5f6',
  });

  useEffect(() => {
    if (!group) return;
    fetchTeachers().then(setTeachers);
    setForm({
      name: group.name,
      teacherId: group.teacherId,
      roomNumber: group.roomNumber,
      startTime: group.startTime,
      endTime: group.endTime,
      dayType: group.dayType,
      color: group.color,
    });
    setError('');
  }, [group]);

  if (!group) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.teacherId) {
      setError("Guruh nomi va o'qituvchini tanlang");
      return;
    }

    setSaving(true);
    setError('');
    const updated = await updateGroup(group!.id, form);
    setSaving(false);

    if (updated) {
      notify(notificationMessages.groupUpdated(updated.name));
      onUpdated(toListItem(updated, group!.studentsCount));
      onClose();
    } else {
      setError('Saqlashda xatolik yuz berdi');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Guruhni tahrirlash</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <label className="modal-field">
              <span>Guruh nomi</span>
              <input
                className="edit-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label className="modal-field">
              <span>Kod</span>
              <input className="edit-input" value={group.code} disabled />
            </label>

            <label className="modal-field">
              <span>O'qituvchi</span>
              <select
                className="edit-input"
                value={form.teacherId}
                onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              >
                <option value="">Tanlang...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>Xona</span>
              <select
                className="edit-input"
                value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: Number(e.target.value) })}
              >
                <option value={1}>1-xona</option>
                <option value={2}>2-xona</option>
              </select>
            </label>

            <label className="modal-field">
              <span>Boshlanish</span>
              <input
                className="edit-input"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              />
            </label>

            <label className="modal-field">
              <span>Tugash</span>
              <input
                className="edit-input"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </label>

            <label className="modal-field">
              <span>Dars kunlari</span>
              <select
                className="edit-input"
                value={form.dayType}
                onChange={(e) => setForm({ ...form, dayType: e.target.value as GroupDayType })}
              >
                {GROUP_DAY_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>Rang</span>
              <input
                className="edit-input"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </label>
          </div>

          {error && <p className="account-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
