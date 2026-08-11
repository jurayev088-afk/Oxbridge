import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Shield,
  Phone,
  Mail,
  ChevronRight,
  Trash2,
  KeyRound,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { UserAvatar } from '../components/UserAvatar';
import { AddAdminModal } from '../components/AddAdminModal';
import { deleteAdmin, fetchAdmins } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import type { AdminListItem } from '../types';
import { formatPhoneOrDash, normalizePhoneForSearch } from '../lib/formatDisplay';

export function Admins() {
  const { notify } = useNotifications();
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdmins()
      .then(setAdmins)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = normalizePhoneForSearch(search);
    if (!q) return admins;
    return admins.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (qDigits && normalizePhoneForSearch(a.phone).includes(qDigits)) ||
        (!qDigits && a.phone.toLowerCase().includes(q)) ||
        a.email.toLowerCase().includes(q) ||
        (a.login ?? '').toLowerCase().includes(q)
    );
  }, [admins, search]);

  const stats = useMemo(() => ({
    total: admins.length,
    withLogin: admins.filter((a) => a.hasLogin).length,
  }), [admins]);

  async function handleDelete(admin: AdminListItem) {
    const confirmed = window.confirm(`"${admin.name}" adminini o'chirmoqchimisiz?`);
    if (!confirmed) return;

    const ok = await deleteAdmin(admin.id);
    if (ok) {
      notify({
        kind: 'info',
        title: 'Admin o\'chirildi',
        message: admin.name,
      });
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } else {
      window.alert('Adminni o\'chirib bo\'lmadi');
    }
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loader">Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />
      <Navbar />
      <main className="dashboard-main dashboard-main-full">
        <div className="groups-page">
          <div className="groups-top">
            <div className="groups-intro">
              <h1 className="groups-title">Adminlar</h1>
              <p className="groups-subtitle">
                Yangi adminlar qo&apos;shing va ularga login/parol bering
              </p>
            </div>
            <div className="groups-toolbar">
              <div className="groups-search">
                <Search size={16} />
                <input
                  type="text"
                  aria-label="Ism, login yoki telefon qidirish"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="groups-add-btn" onClick={() => setModalOpen(true)}>
                <Plus size={16} />
                Admin qo&apos;shish
              </button>
            </div>
          </div>

          <div className="groups-stats-row">
            <div className="groups-stat-card">
              <Shield size={18} />
              <div>
                <span className="groups-stat-value">{stats.total}</span>
                <span className="groups-stat-label">Jami adminlar</span>
              </div>
            </div>
            <div className="groups-stat-card">
              <KeyRound size={18} />
              <div>
                <span className="groups-stat-value">{stats.withLogin}</span>
                <span className="groups-stat-label">Login berilgan</span>
              </div>
            </div>
          </div>

          <div className="groups-table-wrap">
            <table className="groups-table">
              <thead>
                <tr>
                  <th>Admin</th>
                  <th>Telefon</th>
                  <th>Email</th>
                  <th>Login</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="table-user-cell">
                        <UserAvatar name={admin.name} photoUrl={admin.photoUrl} />
                        <span className="group-name-cell">{admin.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="table-meta">
                        <Phone size={14} />
                        {formatPhoneOrDash(admin.phone)}
                      </span>
                    </td>
                    <td>
                      <span className="table-meta">
                        <Mail size={14} />
                        {admin.email || '—'}
                      </span>
                    </td>
                    <td>
                      {admin.hasLogin ? (
                        <span className="table-meta">{admin.login}</span>
                      ) : (
                        <span className="monthly-bill-status pending">Login yo&apos;q</span>
                      )}
                    </td>
                    <td>
                      <div className="group-actions">
                        <Link to={`/foydalanuvchi/${admin.id}`} className="group-open-btn">
                          Ochish
                          <ChevronRight size={14} />
                        </Link>
                        {admin.id !== 'admin' && (
                          <button
                            type="button"
                            className="group-icon-btn group-delete-btn"
                            onClick={() => handleDelete(admin)}
                            aria-label="O'chirish"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <p className="groups-empty">Admin topilmadi</p>
            )}
          </div>
        </div>
      </main>

      <AddAdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(admin) =>
          setAdmins((prev) => [...prev, admin].sort((a, b) => a.name.localeCompare(b.name)))
        }
      />
    </div>
  );
}
