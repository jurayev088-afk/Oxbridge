import { useEffect, useState } from 'react';
import { UserCheck, X } from 'lucide-react';
import { fetchGroups } from '../api/client';
import { convertLeadToStudentWithError } from '../api/leads';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getLeadSourceLabel } from '../lib/leadConfig';
import { AmountInput } from './AmountInput';
import { formatPhoneOrDash } from '../lib/formatDisplay';
import type { GroupListItem, Lead, StudentListItem } from '../types';

interface ConvertLeadModalProps {
  open: boolean;
  lead: Lead | null;
  onClose: () => void;
  onConverted: (removedLeadId: string, student: StudentListItem) => void;
}

export function ConvertLeadModal({ open, lead, onClose, onConverted }: ConvertLeadModalProps) {
  const { notify } = useNotifications();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    groupId: '',
    paymentDue: '',
    email: '',
  });

  useEffect(() => {
    if (!open) return;
    fetchGroups().then(setGroups);
    setForm({ groupId: '', paymentDue: '', email: '' });
    setError('');
  }, [open]);

  if (!open || !lead) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const response = await convertLeadToStudentWithError(lead!.id, {
      groupId: form.groupId || undefined,
      paymentDue: form.paymentDue ? Number(form.paymentDue) : undefined,
      email: form.email.trim() || undefined,
    });

    setSaving(false);

    if (!response.ok) {
      setError(response.error);
      return;
    }

    const { student, removedLeadId } = response.result;
    notify(notificationMessages.leadConvertedToStudent(student.name, student.groupName));
    onConverted(removedLeadId, student);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card lead-convert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="lead-convert-title">
            <UserCheck size={20} />
            <h2 className="modal-title">O&apos;quvchi sifatida saqlash</h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        <div className="lead-convert-summary">
          <p>
            <strong>{lead.name}</strong> lidlar ro&apos;yxatidan olib tashlanadi va o&apos;quvchilar
            bo&apos;limiga qo&apos;shiladi.
          </p>
          <div className="lead-convert-meta">
            {lead.phone && <span>{formatPhoneOrDash(lead.phone)}</span>}
            {lead.courseInterest && <span>{lead.courseInterest}</span>}
            <span>{getLeadSourceLabel(lead.source)}</span>
          </div>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="modal-grid">
            <label className="modal-field">
              <span>Guruh</span>
              <select
                className="edit-input"
                value={form.groupId}
                onChange={(e) => setForm({ ...form, groupId: e.target.value })}
              >
                <option value="">Guruhsiz</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-field">
              <span>To&apos;lov summasi</span>
              <AmountInput
                value={form.paymentDue}
                onChange={(paymentDue) => setForm({ ...form, paymentDue })}
              />
            </label>
            <label className="modal-field modal-field-full">
              <span>Email (ixtiyoriy)</span>
              <input
                className="edit-input"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="btn-primary lead-convert-submit" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : "O'quvchi sifatida saqlash"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
