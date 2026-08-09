import { useEffect, useMemo, useState } from 'react';
import { Search, X, UserPlus, Users } from 'lucide-react';
import { fetchAvailableStudents, addStudentToGroup } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getPhoneForSubmit } from '../lib/formatInputs';
import { formatPhoneOrDash, normalizePhoneForSearch } from '../lib/formatDisplay';
import type { Group, StudentOption } from '../types';
import { UserAvatar } from './UserAvatar';
import { PhoneInput } from './PhoneInput';

interface AddStudentModalProps {
  open: boolean;
  groupId: string;
  onClose: () => void;
  onAdded: (group: Group) => void;
}

type Tab = 'existing' | 'new';

export function AddStudentModal({ open, groupId, onClose, onAdded }: AddStudentModalProps) {
  const { notify } = useNotifications();
  const [tab, setTab] = useState<Tab>('existing');
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTab('existing');
    setSearch('');
    setSelectedId('');
    setName('');
    setPhone('');
    setError('');
    setLoading(true);
    fetchAvailableStudents(groupId)
      .then(setStudents)
      .finally(() => setLoading(false));
  }, [open, groupId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        normalizePhoneForSearch(s.phone).includes(normalizePhoneForSearch(q)) ||
        (s.groupName?.toLowerCase().includes(q) ?? false)
    );
  }, [students, search]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (tab === 'existing') {
      if (!selectedId) {
        setError('O\'quvchini tanlang');
        return;
      }
    } else if (!name.trim()) {
      setError('O\'quvchi ismini kiriting');
      return;
    }

    setSaving(true);
    const updated = await addStudentToGroup(
      groupId,
      tab === 'existing'
        ? { userId: selectedId }
        : { name: name.trim(), phone: getPhoneForSubmit(phone) }
    );
    setSaving(false);

    if (updated) {
      const addedStudent =
        tab === 'existing'
          ? students.find((s) => s.id === selectedId)
          : { name: name.trim() };
      notify(
        notificationMessages.studentAddedToGroup(
          addedStudent?.name ?? name.trim(),
          updated.name,
          updated.id
        )
      );
      onAdded(updated);
      onClose();
    } else {
      setError('O\'quvchi qo\'shishda xatolik yuz berdi');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card add-student-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">O'quvchi qo'shish</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>

        <div className="student-modal-tabs">
          <button
            type="button"
            className={`student-tab ${tab === 'existing' ? 'active' : ''}`}
            onClick={() => setTab('existing')}
          >
            <Users size={15} />
            Mavjud o'quvchi
          </button>
          <button
            type="button"
            className={`student-tab ${tab === 'new' ? 'active' : ''}`}
            onClick={() => setTab('new')}
          >
            <UserPlus size={15} />
            Yangi o'quvchi
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {tab === 'existing' ? (
            <>
              <div className="student-search">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Ism yoki telefon bo'yicha qidirish..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="student-pick-list">
                {loading ? (
                  <p className="student-pick-empty">Yuklanmoqda...</p>
                ) : filtered.length === 0 ? (
                  <p className="student-pick-empty">Qo'shish uchun o'quvchi topilmadi</p>
                ) : (
                  filtered.map((student) => (
                    <label
                      key={student.id}
                      className={`student-pick-item ${selectedId === student.id ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="student"
                        value={student.id}
                        checked={selectedId === student.id}
                        onChange={() => setSelectedId(student.id)}
                      />
                      <UserAvatar name={student.name} photoUrl={student.photoUrl} />
                      <div className="student-pick-info">
                        <span className="student-pick-name">{student.name}</span>
                        <span className="student-pick-meta">
                          {student.phone ? formatPhoneOrDash(student.phone) : 'Telefon kiritilmagan'}
                          {student.groupName ? ` · ${student.groupName}` : ' · Guruhda emas'}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="modal-grid">
              <label className="modal-field modal-field-full">
                <span>Ism familiya</span>
                <input
                  className="edit-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masalan: Sardor Karimov"
                />
              </label>
              <label className="modal-field modal-field-full">
                <span>Telefon</span>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                />
              </label>
            </div>
          )}

          {error && <p className="account-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Bekor qilish
            </button>
            <button type="submit" className="save-btn" disabled={saving}>
              {saving ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
