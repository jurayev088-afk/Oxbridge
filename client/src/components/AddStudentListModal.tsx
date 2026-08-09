import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createStudentRecord, fetchGroups } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getPhoneForSubmit } from '../lib/formatInputs';
import { resolveMonthlyFee } from './MonthlyFeeFields';
import { PhoneInput } from './PhoneInput';
import { MonthlyFeeFields } from './MonthlyFeeFields';
import type { GroupListItem, StudentListItem } from '../types';

interface AddStudentListModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (student: StudentListItem) => void;
}

export function AddStudentListModal({ open, onClose, onCreated }: AddStudentListModalProps) {
  const { notify } = useNotifications();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    groupId: '',
    monthlyFee: '',
    login: '',
    password: '',
  });

  useEffect(() => {
    if (!open) return;
    fetchGroups().then(setGroups);
    setForm({ name: '', phone: '', email: '', groupId: '', monthlyFee: '', login: '', password: '' });
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
    const fee = resolveMonthlyFee(form.monthlyFee);
    try {
      const payload: Parameters<typeof createStudentRecord>[0] = {
        name: form.name,
        phone: getPhoneForSubmit(form.phone),
        email: form.email,
        groupId: form.groupId || undefined,
        monthlyFee: fee || undefined,
        paymentDue: fee || undefined,
      };
      if (form.login.trim() && form.password) {
        payload.login = form.login.trim();
        payload.password = form.password;
      }
      const created = await createStudentRecord(payload);
      const groupName = groups.find((g) => g.id === created.groupId)?.name;
      notify(notificationMessages.studentAdded(created.name, groupName));
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
          <h2 className="modal-title">Yangi o'quvchi qo'shish</h2>
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
                placeholder="Masalan: Sardor Karimov"
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
                placeholder="email@mail.uz"
              />
            </label>
            <label className="modal-field">
              <span>Guruh</span>
              <select
                className="edit-input"
                value={form.groupId}
                onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              >
                <option value="">Guruhsiz</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
            <MonthlyFeeFields
              value={form.monthlyFee}
              onChange={(monthlyFee) => setForm({ ...form, monthlyFee })}
            />
            <label className="modal-field">
              <span>Login (ixtiyoriy)</span>
              <input
                className="edit-input"
                value={form.login}
                onChange={(e) => setForm({ ...form, login: e.target.value })}
                placeholder="Masalan: sardor"
                autoComplete="off"
              />
            </label>
            <label className="modal-field">
              <span>Parol (ixtiyoriy)</span>
              <input
                className="edit-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Kamida 4 ta belgi"
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
