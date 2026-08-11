import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createGroup, fetchGroups, fetchTeachers } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { pickGroupColor } from '../lib/groupColors';
import { GROUP_DAY_TYPE_OPTIONS } from '../lib/groupDayTypes';
import { notificationMessages } from '../lib/notificationMessages';
import type { GroupDayType, GroupListItem } from '../types';

export interface NewGroupPayload {
  name: string;
  code: string;
  teacherId: string;
  roomNumber: number;
  startTime: string;
  endTime: string;
  dayType: GroupDayType;
  color: string;
}

interface AddGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (group: GroupListItem) => void;
}

function createEmptyForm(color: string): NewGroupPayload {
  return {
    name: '',
    code: '',
    teacherId: '',
    roomNumber: 1,
    startTime: '08:00',
    endTime: '10:00',
    dayType: 'even',
    color,
  };
}

export function AddGroupModal({ open, onClose, onCreated }: AddGroupModalProps) {
  const { notify } = useNotifications();
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<NewGroupPayload>(() => createEmptyForm(pickGroupColor()));

  useEffect(() => {
    if (!open) return;

    setError('');
    Promise.all([fetchTeachers(), fetchGroups()])
      .then(([teacherList, groups]) => {
        setTeachers(teacherList);
        setForm(createEmptyForm(pickGroupColor(groups.map((group) => group.color))));
      })
      .catch(() => {
        setForm(createEmptyForm(pickGroupColor()));
      });
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.teacherId) {
      setError("Guruh nomi va o'qituvchini tanlang");
      return;
    }

    setSaving(true);
    setError('');
    const { group: created, error: apiError } = await createGroup(form);
    setSaving(false);

    if (created) {
      notify(notificationMessages.groupAdded(created.name, created.code));
      onCreated(created);
      onClose();
    } else {
      setError(apiError ?? "Guruh qo'shishda xatolik yuz berdi");
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Yangi guruh qo'shish</h2>
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
              <span>Kod (ixtiyoriy)</span>
              <input
                className="edit-input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
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

            <div className="modal-field group-color-field">
              <span>Rang</span>
              <div className="group-color-preview">
                <span className="group-color-preview-bar" style={{ backgroundColor: form.color }} />
                <span className="group-color-preview-code">{form.color.toUpperCase()}</span>
              </div>
              <p className="group-color-hint">Har yangi guruh uchun avtomatik chiroyli rang tanlanadi</p>
            </div>
          </div>

          {error && <p className="account-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : "Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
