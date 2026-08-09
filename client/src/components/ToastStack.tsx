import {
  Bell,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import type { NotificationKind } from '../types/notifications';

const kindMeta: Record<
  NotificationKind,
  { icon: typeof Bell; accent: string; bg: string }
> = {
  student_add: { icon: GraduationCap, accent: '#60a5fa', bg: 'rgba(59, 130, 246, 0.14)' },
  student_edit: { icon: GraduationCap, accent: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' },
  student_delete: { icon: Trash2, accent: '#f87171', bg: 'rgba(239, 68, 68, 0.14)' },
  teacher_add: { icon: BookOpen, accent: '#a78bfa', bg: 'rgba(167, 139, 250, 0.14)' },
  teacher_edit: { icon: BookOpen, accent: '#c4b5fd', bg: 'rgba(196, 181, 253, 0.12)' },
  teacher_delete: { icon: Trash2, accent: '#f87171', bg: 'rgba(239, 68, 68, 0.14)' },
  group_add: { icon: Layers, accent: '#4ade80', bg: 'rgba(34, 197, 94, 0.14)' },
  group_edit: { icon: Layers, accent: '#86efac', bg: 'rgba(134, 239, 172, 0.12)' },
  group_delete: { icon: Trash2, accent: '#f87171', bg: 'rgba(239, 68, 68, 0.14)' },
  lead_add: { icon: UserPlus, accent: '#60a5fa', bg: 'rgba(59, 130, 246, 0.14)' },
  lead_edit: { icon: UserPlus, accent: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)' },
  lead_delete: { icon: Trash2, accent: '#f87171', bg: 'rgba(239, 68, 68, 0.14)' },
  attendance: { icon: UserCheck, accent: '#fbbf24', bg: 'rgba(251, 191, 36, 0.14)' },
  profile: { icon: CheckCircle2, accent: '#22d3ee', bg: 'rgba(34, 211, 238, 0.14)' },
  success: { icon: CheckCircle2, accent: '#4ade80', bg: 'rgba(34, 197, 94, 0.14)' },
  info: { icon: Bell, accent: '#94a3b8', bg: 'rgba(148, 163, 184, 0.14)' },
  warning: { icon: Bell, accent: '#fb923c', bg: 'rgba(251, 146, 60, 0.14)' },
};

export function ToastStack() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((toast) => {
        const meta = kindMeta[toast.kind] ?? kindMeta.info;
        const Icon = meta.icon;

        return (
          <div key={toast.toastKey} className="toast-item toast-enter">
            <div className="toast-accent" style={{ background: meta.accent }} />
            <div className="toast-icon" style={{ background: meta.bg, color: meta.accent }}>
              <Icon size={18} />
            </div>
            <div className="toast-body">
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
              {toast.link && (
                <Link to={toast.link} className="toast-link" onClick={() => dismissToast(toast.toastKey)}>
                  Ko'rish →
                </Link>
              )}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => dismissToast(toast.toastKey)}
              aria-label="Yopish"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
