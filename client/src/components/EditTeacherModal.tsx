import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { updateTeacher } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getPhoneForSubmit } from '../lib/formatInputs';
import { PhoneInput } from './PhoneInput';
import type { TeacherListItem } from '../types';

interface EditTeacherModalProps {
  teacher: TeacherListItem | null;
  onClose: () => void;
  onUpdated: (teacher: TeacherListItem) => void;
}

export function EditTeacherModal({ teacher, onClose, onUpdated }: EditTeacherModalProps) {
  const { notify } = useNotifications();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  useEffect(() => {
    if (!teacher) return;
    setForm({ name: teacher.name, phone: teacher.phone, email: teacher.email });
    setError('');
  }, [teacher]);

  if (!teacher) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teacher) return;
    if (!form.name.trim()) {
      setError('Ism kiritilishi shart');
      return;
    }

    setSaving(true);
    setError('');
    const updated = await updateTeacher(teacher.id, {
      ...form,
      phone: getPhoneForSubmit(form.phone),
    });
    setSaving(false);

    if (updated) {
      notify(notificationMessages.teacherUpdated(updated.name));
      onUpdated(updated);
      onClose();
    } else {
      setError('Saqlashda xatolik yuz berdi');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">O'qituvchini tahrirlash</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <label className="modal-field modal-field-full">
              <span>Ism familiya</span>
              <input
                className="edit-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="modal-field">
              <span>Telefon</span>
              <PhoneInput
                value={form.phone}
                onChange={(phone) => setForm({ ...form, phone })}
              />
            </label>
            <label className="modal-field">
              <span>Email</span>
              <input
                className="edit-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
