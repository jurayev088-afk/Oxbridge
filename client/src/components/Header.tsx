import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, QrCode, Search } from 'lucide-react';
import logo from '../assets/oxbridge-logo.png';
import { NotificationCenter } from './NotificationCenter';
import { QuickPaymentModal } from './QuickPaymentModal';
import { QrPaymentModal } from './QrPaymentModal';
import { useAuth, getHomePath } from '../context/AuthContext';
import { hasAdminAccess } from '../lib/roles';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [paymentStudentId, setPaymentStudentId] = useState<string | undefined>();

  const isAdmin = hasAdminAccess(user?.role);

  function openPayment(studentId?: string) {
    setPaymentStudentId(studentId);
    setPaymentOpen(true);
  }

  const handleStudentFromQr = useCallback((studentId: string) => {
    setQrOpen(false);
    setPaymentStudentId(studentId);
    setPaymentOpen(true);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user?.name?.charAt(0).toUpperCase() ?? 'A';
  const homePath = user ? getHomePath(user.role) : '/';

  return (
    <>
      <header className="header">
        <div className="header-left">
          <Link to={homePath} className="header-brand">
            <div className="header-logo-wrap">
              <img src={logo} alt="Oxbridge" className="header-logo" />
            </div>
            <div className="header-brand-text">
              <span className="header-brand-title">Oxbridge academy</span>
              <span className="header-brand-tag">CRM tizimi</span>
            </div>
          </Link>
        </div>

        {isAdmin && (
          <div className="header-center">
            <div className="search-box">
              <Search size={16} className="search-icon" />
              <input type="text" placeholder="Qidirish..." aria-label="Qidirish" />
            </div>
          </div>
        )}

        <div className="header-right">
          {isAdmin && (
            <div className="header-actions">
              <button
                type="button"
                className="icon-btn"
                aria-label="QR kod"
                onClick={() => setQrOpen(true)}
              >
                <QrCode size={20} />
              </button>
              <button type="button" className="btn-primary header-payment-btn" onClick={() => openPayment()}>
                TO&apos;LOV
              </button>
              <NotificationCenter />
            </div>
          )}

          {user && (
            <Link to={`/foydalanuvchi/${user.id}`} className="avatar avatar-link" aria-label="Mening profilim">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="avatar-img avatar-img-photo" />
              ) : (
                <div className="avatar-img">{initials}</div>
              )}
              <span className="avatar-status" />
            </Link>
          )}

          <button type="button" className="icon-btn header-logout-btn" onClick={handleLogout} aria-label="Chiqish">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {isAdmin && (
        <>
          <QuickPaymentModal
            open={paymentOpen}
            initialStudentId={paymentStudentId}
            billYear={new Date().getFullYear()}
            billMonth={new Date().getMonth() + 1}
            onClose={() => {
              setPaymentOpen(false);
              setPaymentStudentId(undefined);
            }}
          />

          <QrPaymentModal
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            onStudentSelected={handleStudentFromQr}
          />
        </>
      )}
    </>
  );
}
