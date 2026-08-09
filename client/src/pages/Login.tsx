import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import logo from '../assets/oxbridge-logo.png';
import { getPostLoginPath, useAuth } from '../context/AuthContext';

export function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  if (loading) {
    return (
      <div className="login-page">
        <div className="loader">Yuklanmoqda...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={getPostLoginPath(user.role, from)} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.login.trim()) {
      setError('Login kiriting');
      return;
    }
    if (!form.password) {
      setError('Parol kiriting');
      return;
    }

    setSubmitting(true);

    try {
      const authUser = await login(form.login.trim(), form.password);
      navigate(getPostLoginPath(authUser.role, from), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirishda xatolik');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-wrap">
            <img src={logo} alt="Oxbridge" className="login-logo" />
          </div>
          <h1>Oxbridge academy</h1>
          <p>CRM tizimiga kirish</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Login</span>
            <input
              className="edit-input"
              value={form.login}
              onChange={(e) => setForm({ ...form, login: e.target.value })}
              placeholder="Masalan: admin"
              autoFocus
              autoComplete="username"
            />
          </label>

          <label className="login-field">
            <span>Parol</span>
            <input
              className="edit-input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn-primary login-submit" disabled={submitting}>
            <LogIn size={16} />
            {submitting ? 'Kirish...' : 'Kirish'}
          </button>
        </form>
      </div>
    </div>
  );
}
