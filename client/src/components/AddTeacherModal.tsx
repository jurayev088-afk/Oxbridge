import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createTeacher } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getPhoneForSubmit } from '../lib/formatInputs';
import { PhoneInput } from './PhoneInput';
import { PasswordInput } from './PasswordInput';
import type { TeacherListItem } from '../types';

interface AddTeacherModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (teacher: TeacherListItem) => void;
}

export function AddTeacherModal({ open, onClose, onCreated }: AddTeacherModalProps) {
  const { notify } = useNotifications();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', login: '', password: '' });

  useEffect(() => {
    if (!open) return;
    setForm({ name: '', phone: '', email: '', login: '', password: '' });
    setError('');
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Ism kiritilishi shart');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload: Parameters<typeof createTeacher>[0] = {
        ...form,
        phone: getPhoneForSubmit(form.phone),
      };
      if (form.login.trim() && form.password) {
        payload.login = form.login.trim();
        payload.password = form.password;
      }
      const created = await createTeacher(payload);
      notify(notificationMessages.teacherAdded(created.name));
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Yangi o'qituvchi qo'shish</h2>
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
            <label className="modal-field">
              <span>Login (ixtiyoriy)</span>
              <input
                className="edit-input"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                autoComplete="off"
              />
            </label>
            <label className="modal-field">
              <span>Parol (ixtiyoriy)</span>
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
            </label>
          </div>

          <p className="portal-hint">Login va parolni hozir berishingiz yoki keyin profildan berishingiz mumkin.</p>

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
