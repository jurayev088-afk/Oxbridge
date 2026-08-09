import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CheckCheck,
  GraduationCap,
  Layers,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import type { AppNotification, NotificationKind } from '../types/notifications';

const kindMeta: Record<
  NotificationKind,
  { icon: typeof Bell; accent: string; label: string }
> = {
  student_add: { icon: GraduationCap, accent: '#60a5fa', label: "O'quvchi" },
  student_edit: { icon: GraduationCap, accent: '#38bdf8', label: 'Tahrir' },
  student_delete: { icon: Trash2, accent: '#f87171', label: "O'chirish" },
  teacher_add: { icon: BookOpen, accent: '#a78bfa', label: "O'qituvchi" },
  teacher_edit: { icon: BookOpen, accent: '#c4b5fd', label: 'Tahrir' },
  teacher_delete: { icon: Trash2, accent: '#f87171', label: "O'chirish" },
  group_add: { icon: Layers, accent: '#4ade80', label: 'Guruh' },
  group_edit: { icon: Layers, accent: '#86efac', label: 'Tahrir' },
  group_delete: { icon: Trash2, accent: '#f87171', label: "O'chirish" },
  lead_add: { icon: UserPlus, accent: '#60a5fa', label: 'Lid' },
  lead_edit: { icon: UserPlus, accent: '#38bdf8', label: 'Tahrir' },
  lead_delete: { icon: Trash2, accent: '#f87171', label: "O'chirish" },
  attendance: { icon: UserCheck, accent: '#fbbf24', label: 'Davomat' },
  profile: { icon: Bell, accent: '#22d3ee', label: 'Profil' },
  success: { icon: Bell, accent: '#4ade80', label: 'Muvaffaqiyat' },
  info: { icon: Bell, accent: '#94a3b8', label: 'Ma\'lumot' },
  warning: { icon: Bell, accent: '#fb923c', label: 'Ogohlantirish' },
};

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Hozir';
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Kecha, ${date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;

  return date.toLocaleDateString('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByDay(items: AppNotification[]) {
  const today = new Date();
  const todayKey = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toDateString();

  const groups: { label: string; items: AppNotification[] }[] = [
    { label: 'Bugun', items: [] },
    { label: 'Kecha', items: [] },
    { label: 'Oldingi', items: [] },
  ];

  for (const item of items) {
    const key = new Date(item.createdAt).toDateString();
    if (key === todayKey) groups[0].items.push(item);
    else if (key === yesterdayKey) groups[1].items.push(item);
    else groups[2].items.push(item);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    panelOpen,
    setPanelOpen,
    markRead,
    markAllRead,
    clearAll,
  } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => groupByDay(notifications), [notifications]);

  useEffect(() => {
    if (!panelOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setPanelOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [panelOpen, setPanelOpen]);

  return (
    <div className="notification-center-wrap" ref={panelRef}>
      <button
        type="button"
        className={`icon-btn notification-bell ${panelOpen ? 'active' : ''}`}
        aria-label="Bildirishnomalar"
        aria-expanded={panelOpen}
        onClick={() => setPanelOpen(!panelOpen)}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {panelOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <div>
              <h3>Bildirishnomalar</h3>
              <p>{unreadCount > 0 ? `${unreadCount} ta yangi` : 'Hammasi o\'qilgan'}</p>
            </div>
            <button
              type="button"
              className="notification-panel-close"
              onClick={() => setPanelOpen(false)}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>
          </div>

          {notifications.length > 0 && (
            <div className="notification-panel-actions">
              <button type="button" onClick={markAllRead}>
                <CheckCheck size={14} />
                Hammasini o'qilgan deb belgilash
              </button>
              <button type="button" className="danger-text" onClick={clearAll}>
                <Trash2 size={14} />
                Tozalash
              </button>
            </div>
          )}

          <div className="notification-panel-body">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="notification-empty-icon">
                  <Bell size={28} />
                </div>
                <strong>Hozircha bildirishnoma yo'q</strong>
                <p>O'quvchi qo'shish, guruh ochish va boshqa harakatlar shu yerda ko'rinadi</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label} className="notification-group">
                  <div className="notification-group-label">{group.label}</div>
                  {group.items.map((item) => {
                    const meta = kindMeta[item.kind] ?? kindMeta.info;
                    const Icon = meta.icon;
                    const content = (
                      <>
                        <div
                          className="notification-item-icon"
                          style={{ color: meta.accent, background: `${meta.accent}22` }}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="notification-item-content">
                          <div className="notification-item-top">
                            <span className="notification-item-kind">{meta.label}</span>
                            <span className="notification-item-time">{formatTime(item.createdAt)}</span>
                          </div>
                          <strong>{item.title}</strong>
                          <p>{item.message}</p>
                        </div>
                        {!item.read && <span className="notification-unread-dot" />}
                      </>
                    );

                    const className = `notification-item ${item.read ? 'read' : 'unread'}`;

                    if (item.link) {
                      return (
                        <Link
                          key={item.id}
                          to={item.link}
                          className={className}
                          onClick={() => {
                            markRead(item.id);
                            setPanelOpen(false);
                          }}
                        >
                          {content}
                        </Link>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={className}
                        onClick={() => markRead(item.id)}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
