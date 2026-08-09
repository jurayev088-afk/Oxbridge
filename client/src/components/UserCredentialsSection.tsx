import { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { setUserCredentials } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../lib/roles';

interface UserCredentialsSectionProps {
  userId: string;
  userName: string;
  currentLogin?: string;
  actorRole: AppRole;
}

export function UserCredentialsSection({
  userId,
  userName,
  currentLogin,
  actorRole,
}: UserCredentialsSectionProps) {
  const { token } = useAuth();
  const [form, setForm] = useState({ login: currentLogin ?? '', password: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({ login: currentLogin ?? '', password: '' });
  }, [currentLogin, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      await setUserCredentials(userId, form.login, form.password, token);
      setMessage(`${userName} uchun login va parol saqlandi`);
      setForm((prev) => ({ ...prev, password: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  }

  const hint =
    actorRole === 'director'
      ? 'Xojayin admin, o\'qituvchi va o\'quvchi uchun login va parol beradi.'
      : 'Admin o\'qituvchi va o\'quvchi uchun login va parol beradi.';

  return (
    <div className="account-section">
      <h2 className="section-title">
        <KeyRound size={18} />
        Tizimga kirish (login / parol)
      </h2>
      <p className="portal-hint">{hint}</p>

      <form className="credentials-form" onSubmit={handleSubmit}>
        <div className="account-info-grid">
          <label className="modal-field">
            <span>Login</span>
            <input
              className="edit-input"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="Masalan: admin"
            />
          </label>
          <label className="modal-field">
            <span>Yangi parol</span>
            <input
              className="edit-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Kamida 4 ta belgi"
            />
          </label>
        </div>

        {error && <p className="account-error">{error}</p>}
        {message && <p className="credentials-success">{message}</p>}

        <button type="submit" className="save-btn" disabled={saving}>
          {saving ? 'Saqlanmoqda...' : 'Login va parolni saqlash'}
        </button>
      </form>
    </div>
  );
}
