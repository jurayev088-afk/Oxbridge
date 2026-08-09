import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppNotification, NotifyPayload, ToastItem } from '../types/notifications';

const STORAGE_KEY = 'oxbridge_notifications';
const MAX_ITEMS = 60;
const TOAST_DURATION_MS = 4800;

interface NotificationContextValue {
  notifications: AppNotification[];
  toasts: ToastItem[];
  unreadCount: number;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  notify: (payload: NotifyPayload) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  dismissToast: (toastKey: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function loadStored(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStored(items: AppNotification[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadStored);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    saveStored(notifications);
  }, [notifications]);

  const dismissToast = useCallback((toastKey: string) => {
    setToasts((prev) => prev.filter((t) => t.toastKey !== toastKey));
  }, []);

  const notify = useCallback(
    (payload: NotifyPayload) => {
      const item: AppNotification = {
        id: crypto.randomUUID(),
        kind: payload.kind,
        title: payload.title,
        message: payload.message,
        link: payload.link,
        read: false,
        createdAt: new Date().toISOString(),
      };

      setNotifications((prev) => [item, ...prev].slice(0, MAX_ITEMS));

      const toastKey = crypto.randomUUID();
      setToasts((prev) => [...prev, { ...item, toastKey }]);

      window.setTimeout(() => {
        dismissToast(toastKey);
      }, TOAST_DURATION_MS);
    },
    [dismissToast]
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const value = useMemo(
    () => ({
      notifications,
      toasts,
      unreadCount,
      panelOpen,
      setPanelOpen,
      notify,
      markRead,
      markAllRead,
      clearAll,
      dismissToast,
    }),
    [
      notifications,
      toasts,
      unreadCount,
      panelOpen,
      notify,
      markRead,
      markAllRead,
      clearAll,
      dismissToast,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications NotificationProvider ichida ishlatilishi kerak');
  }
  return ctx;
}
