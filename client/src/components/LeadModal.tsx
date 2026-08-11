import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { createLead, updateLead } from '../api/leads';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { LEAD_SOURCES, LEAD_STATUSES } from '../lib/leadConfig';
import { getPhoneForSubmit } from '../lib/formatInputs';
import { PhoneInput } from './PhoneInput';
import type { Lead, LeadStatus } from '../types';

interface LeadModalProps {
  open: boolean;
  lead?: Lead | null;
  defaultStatus?: LeadStatus;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
  onConvertToStudent?: (lead: Lead) => void;
}

export function LeadModal({
  open,
  lead,
  defaultStatus = 'new',
  onClose,
  onSaved,
  onConvertToStudent,
}: LeadModalProps) {
  const { notify } = useNotifications();
  const isEdit = Boolean(lead);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    source: 'boshqa',
    status: defaultStatus as LeadStatus,
    courseInterest: '',
    note: '',
  });

  useEffect(() => {
    if (!open) return;
    if (lead) {
      setForm({
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        courseInterest: lead.courseInterest,
        note: lead.note,
      });
    } else {
      setForm({
        name: '',
        phone: '',
        source: 'boshqa',
        status: defaultStatus,
        courseInterest: '',
        note: '',
      });
    }
    setError('');
  }, [open, lead, defaultStatus]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Ism kiritilishi shart');
      return;
    }

    if (isEdit && lead && form.status === 'converted') {
      if (onConvertToStudent) {
        onConvertToStudent(lead);
        return;
      }
      setError('O\'quvchiga aylantirish uchun kartadagi tugmadan foydalaning');
      return;
    }

    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      phone: getPhoneForSubmit(form.phone),
      source: form.source,
      status: form.status,
      courseInterest: form.courseInterest.trim(),
      note: form.note.trim(),
    };

    const result = isEdit && lead
      ? await updateLead(lead.id, payload)
      : await createLead(payload);

    setSaving(false);

    if (result) {
      notify(
        isEdit
          ? notificationMessages.leadUpdated(result.name)
          : notificationMessages.leadAdded(result.name)
      );
      onSaved(result);
      onClose();
    } else {
      setError(isEdit ? 'Saqlashda xatolik' : 'Lid qo\'shishda xatolik');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card lead-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Lidni tahrirlash' : 'Yangi lid qo\'shish'}</h2>
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
                autoFocus
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
              <span>Manba</span>
              <select
                className="edit-input"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              >
                {LEAD_SOURCES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>Holat</span>
              <select
                className="edit-input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}
              >
                {(isEdit ? LEAD_STATUSES : LEAD_STATUSES.filter((s) => s.id !== 'converted')).map(
                  (item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                  )
                )}
              </select>
            </label>

            <label className="modal-field">
              <span>Qiziqish (kurs)</span>
              <input
                className="edit-input"
                value={form.courseInterest}
                onChange={(e) => setForm({ ...form, courseInterest: e.target.value })}
              />
            </label>

            <label className="modal-field modal-field-full">
              <span>Izoh</span>
              <textarea
                className="edit-input lead-note-input"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={3}
              />
            </label>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : isEdit ? 'Saqlash' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
