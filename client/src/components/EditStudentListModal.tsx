import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchGroups, updateStudentRecord } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getPhoneForSubmit } from '../lib/formatInputs';
import { resolveMonthlyFee } from './MonthlyFeeFields';
import { PhoneInput } from './PhoneInput';
import { MonthlyFeeFields } from './MonthlyFeeFields';
import type { GroupListItem, StudentListItem } from '../types';

interface EditStudentListModalProps {
  student: StudentListItem | null;
  onClose: () => void;
  onUpdated: (student: StudentListItem) => void;
}

export function EditStudentListModal({ student, onClose, onUpdated }: EditStudentListModalProps) {
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
  });

  useEffect(() => {
    if (!student) return;
    fetchGroups().then(setGroups);
    setForm({
      name: student.name,
      phone: student.phone,
      email: student.email,
      groupId: student.groupId ?? '',
      monthlyFee: String(student.monthlyFee ?? student.paymentDue ?? ''),
    });
    setError('');
  }, [student]);

  if (!student) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Ism kiritilishi shart');
      return;
    }

    setSaving(true);
    setError('');
    const fee = resolveMonthlyFee(form.monthlyFee);
    const updated = await updateStudentRecord(student!.id, {
      name: form.name,
      phone: getPhoneForSubmit(form.phone),
      email: form.email,
      groupId: form.groupId,
      monthlyFee: fee,
      paymentDue: fee,
    });
    setSaving(false);

    if (updated) {
      notify(notificationMessages.studentUpdated(updated.name));
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
          <h2 className="modal-title">O'quvchini tahrirlash</h2>
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
