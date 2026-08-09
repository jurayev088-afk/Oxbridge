import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  GraduationCap,
  Layers,
  UserCheck,
  Wallet,
  BarChart3,
  Shield,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NavDropdown } from './NavDropdown';

const adminNavItems = [
  { label: 'Bosh sahifa', icon: Home, path: '/' },
  { label: 'Lidlar', icon: Users, path: '/lidlar' },
  { label: "O'qituvchilar", icon: GraduationCap, path: '/oqituvchilar' },
  { label: 'Guruhlar', icon: Layers, path: '/guruhlar' },
  { label: "O'quvchilar", icon: UserCheck, path: '/oquvchilar' },
];

const adminReportItems = [
  { label: 'Umumiy moliya', to: '/moliya' },
  { label: 'Oylik to\'lovlar', to: '/moliya#oylik-tolovlar' },
  { label: 'To\'lov qilgan o\'quvchilar', to: '/moliya#tolov-qilgan' },
  { label: 'Oylik xarajatlar', to: '/moliya#xarajatlar' },
  { label: 'Qarzdor o\'quvchilar', to: '/oquvchilar?filter=unpaid' },
];

const teacherNavItems = [
  { label: 'Kabinetim', icon: Home, path: '/oqituvchi-kabinet' },
  { label: 'Davomat', icon: CalendarCheck, path: '/oqituvchi-kabinet' },
];

export function Navbar() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user || user.role === 'student') return null;

  if (user.role === 'teacher') {
    return (
      <nav className="navbar">
        {teacherNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
              <item.icon size={15} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="navbar">
      {adminNavItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.label} to={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
            <item.icon size={15} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {user.role === 'director' && (
        <Link
          to="/adminlar"
          className={`nav-item ${location.pathname === '/adminlar' ? 'active' : ''}`}
        >
          <Shield size={15} />
          <span>Adminlar</span>
        </Link>
      )}

      <Link
        to="/moliya"
        className={`nav-item ${location.pathname === '/moliya' ? 'active' : ''}`}
      >
        <Wallet size={15} />
        <span>Moliya</span>
      </Link>

      <NavDropdown
        label="Hisobotlar"
        icon={BarChart3}
        items={adminReportItems}
        activePaths={['/moliya']}
      />
    </nav>
  );
}
