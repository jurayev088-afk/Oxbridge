export type NotificationKind =
  | 'student_add'
  | 'student_edit'
  | 'student_delete'
  | 'teacher_add'
  | 'teacher_edit'
  | 'teacher_delete'
  | 'group_add'
  | 'group_edit'
  | 'group_delete'
  | 'lead_add'
  | 'lead_edit'
  | 'lead_delete'
  | 'attendance'
  | 'profile'
  | 'success'
  | 'info'
  | 'warning';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface NotifyPayload {
  kind: NotificationKind;
  title: string;
  message: string;
  link?: string;
}

export interface ToastItem extends AppNotification {
  toastKey: string;
}
