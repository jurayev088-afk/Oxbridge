import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Lock, Save, Send } from 'lucide-react';
import { fetchGroupAttendance, fetchTelegramStatus, saveGroupAttendance } from '../api/client';
import { useNotifications } from '../context/NotificationContext';
import {
  canMarkAttendanceToday,
  formatAttendanceDateLabel,
  formatClassTimeRange,
  getAttendanceBlockedMessage,
  getClassTimeBlockedMessage,
  isWithinClassTime,
  todayISO,
} from '../lib/dates';
import { notificationMessages } from '../lib/notificationMessages';
import type {
  AttendanceStatus,
  GroupDayType,
  GroupStudent,
  LessonGrade,
  NotifyTarget,
  TelegramStatus,
} from '../types';
import { UserAvatar } from './UserAvatar';

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Keldi',
  absent: 'Kelmadi',
  excused: 'Sababli',
  late: 'Kechikdi',
};

const gradeLabels: Record<LessonGrade, string> = {
  excellent: 'Alo',
  good: 'Yaxshi',
  no_homework: 'Uyga vazifa qilinmagan',
};

const statusOptions: AttendanceStatus[] = ['present', 'absent', 'excused', 'late'];
const gradeOptions: LessonGrade[] = ['excellent', 'good', 'no_homework'];

function needsGrade(status: AttendanceStatus) {
  return status === 'present' || status === 'late';
}

interface GroupAttendanceSectionProps {
  groupId: string;
  groupName: string;
  groupDayType: GroupDayType;
  classStartTime: string;
  classEndTime: string;
  students: GroupStudent[];
}

export function GroupAttendanceSection({
  groupId,
  groupName,
  groupDayType,
  classStartTime,
  classEndTime,
  students,
}: GroupAttendanceSectionProps) {
  const { notify } = useNotifications();
  const date = todayISO();
  const dayBlockedMessage = getAttendanceBlockedMessage(groupDayType);
  const classTimeMessage = getClassTimeBlockedMessage(classStartTime, classEndTime);
  const attendanceDayAllowed = canMarkAttendanceToday(groupDayType);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [grades, setGrades] = useState<Record<string, LessonGrade | null>>({});
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [sendTelegram, setSendTelegram] = useState(true);
  const [telegramTarget, setTelegramTarget] = useState<NotifyTarget>('parents');
  const [notifyNotice, setNotifyNotice] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);

  const isLocked = locked || saved;
  const withinClassTime = isWithinClassTime(classStartTime, classEndTime);
  const canEdit = attendanceDayAllowed && withinClassTime && !isLocked;
  const classTimeRange = formatClassTimeRange(classStartTime, classEndTime);

  useEffect(() => {
    fetchTelegramStatus().then(setTelegramStatus);
  }, []);

  useEffect(() => {
    if (students.length === 0) {
      setStatuses({});
      setGrades({});
      setSaved(false);
      setLocked(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotifyNotice('');
    fetchGroupAttendance(groupId, date)
      .then((data) => {
        if (!data) {
          setError('Davomat yuklanmadi');
          return;
        }
        const statusMap: Record<string, AttendanceStatus> = {};
        const gradeMap: Record<string, LessonGrade | null> = {};
        data.students.forEach((s) => {
          statusMap[s.id] = s.status;
          gradeMap[s.id] = s.grade ?? null;
        });
        setStatuses(statusMap);
        setGrades(gradeMap);
        setSaved(data.saved);
        setLocked(Boolean(data.locked ?? data.saved));
        setDirty(false);
      })
      .finally(() => setLoading(false));
  }, [groupId, date, students]);

  const stats = useMemo(() => {
    const values = students.map((s) => statuses[s.id] ?? 'present');
    return {
      present: values.filter((v) => v === 'present').length,
      absent: values.filter((v) => v === 'absent').length,
      excused: values.filter((v) => v === 'excused').length,
      late: values.filter((v) => v === 'late').length,
    };
  }, [students, statuses]);

  function setStatus(studentId: string, status: AttendanceStatus) {
    if (!canEdit) return;
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
    if (!needsGrade(status)) {
      setGrades((prev) => ({ ...prev, [studentId]: null }));
    }
    setDirty(true);
  }

  function setGrade(studentId: string, grade: LessonGrade) {
    if (!canEdit) return;
    if (!needsGrade(statuses[studentId] ?? 'present')) return;
    setGrades((prev) => ({ ...prev, [studentId]: grade }));
    setDirty(true);
  }

  async function handleSave() {
    if (!canEdit) {
      if (isLocked) {
        setError('Bugungi davomat allaqachon qo\'yilgan — bir kunda faqat bir marta');
      } else if (classTimeMessage) {
        setError(classTimeMessage);
      } else {
        setError(dayBlockedMessage);
      }
      return;
    }

    const missingGrade = students.some((s) => {
      const status = statuses[s.id] ?? 'present';
      return needsGrade(status) && !grades[s.id];
    });
    if (missingGrade) {
      setError('Kelgan va kechikkan o\'quvchilar uchun baho tanlang');
      return;
    }

    setSaving(true);
    setError('');
    setNotifyNotice('');
    const records = students.map((s) => {
      const status = statuses[s.id] ?? 'present';
      return {
        studentId: s.id,
        status,
        grade: needsGrade(status) ? grades[s.id] ?? null : null,
      };
    });
    const result = await saveGroupAttendance(groupId, date, records, {
      sendTelegram,
      telegramTarget,
    });
    setSaving(false);

    if (!result) {
      setError('Davomat saqlanmadi');
      return;
    }

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setSaved(true);
    setLocked(true);
    setDirty(false);
    const telegramSent = result.telegram?.sent ?? 0;
    notify(notificationMessages.attendanceSaved(groupName, date, telegramSent));

    if (sendTelegram && result.telegram) {
      const { sent, failed, configured, messages } = result.telegram;
      if (!configured) {
        setNotifyNotice(
          'Telegram bot sozlanmagan. server/.env ga TELEGRAM_BOT_TOKEN qo\'ying.'
        );
      } else if (sent > 0 && failed === 0) {
        setNotifyNotice(`${sent} ta xabar telefon raqami orqali yuborildi`);
      } else if (sent > 0) {
        setNotifyNotice(`${sent} ta yuborildi, ${failed} ta — telefon botga ulanmagan`);
      } else {
        setNotifyNotice(
          messages[0]?.error ||
            'Xabar yuborilmadi. Ota-ona @oxbridgeacademy_bot da /start va telefon ulashsin.'
        );
      }
    }
  }

  const botLink = telegramStatus?.botUsername
    ? `https://t.me/${telegramStatus.botUsername}`
    : null;

  function renderNotice() {
    if (dayBlockedMessage) {
      return <p className="attendance-blocked-notice">{dayBlockedMessage}</p>;
    }
    if (isLocked) {
      return (
        <p className="attendance-locked-notice">
          <Lock size={14} />
          Bugungi davomat allaqachon qo&apos;yilgan — bir kunda faqat bir marta
        </p>
      );
    }
    if (classTimeMessage) {
      return <p className="attendance-blocked-notice">{classTimeMessage}</p>;
    }
    return (
      <p className="attendance-today-notice">
        Davomat faqat dars vaqtida bir marta qo&apos;yiladi ({classTimeRange})
      </p>
    );
  }

  return (
    <div className="account-section attendance-section">
      <div className="section-header-row">
        <h2 className="section-title">
          <CalendarCheck size={18} />
          Davomat
        </h2>
      </div>

      <p className="attendance-date-label">
        {formatAttendanceDateLabel(date, classStartTime)}
      </p>
      {renderNotice()}

      {students.length === 0 ? (
        <p className="students-empty">Davomat uchun avval o'quvchi qo'shing</p>
      ) : loading ? (
        <p className="students-empty">Yuklanmoqda...</p>
      ) : !attendanceDayAllowed ? (
        <p className="students-empty">Bugun davomat qo&apos;yish mumkin emas</p>
      ) : (
        <>
          <div className="attendance-stats">
            <span className="attendance-stat present">{stats.present} keldi</span>
            <span className="attendance-stat absent">{stats.absent} kelmadi</span>
            <span className="attendance-stat excused">{stats.excused} sababli</span>
            <span className="attendance-stat late">{stats.late} kechikdi</span>
            {isLocked && <span className="attendance-saved-badge">Saqlangan</span>}
          </div>

          {canEdit && (
            <div className="attendance-sms-settings">
              {telegramStatus && !telegramStatus.configured && (
                <p className="attendance-sms-warning">{telegramStatus.message}</p>
              )}
              {telegramStatus?.configured && (
                <p className="attendance-sms-ready">
                  {telegramStatus.message}
                  {botLink && (
                    <>
                      {' '}
                      <a href={botLink} target="_blank" rel="noreferrer" className="table-link">
                        Botni ochish
                      </a>
                    </>
                  )}
                </p>
              )}

              <label className="attendance-sms-toggle">
                <input
                  type="checkbox"
                  checked={sendTelegram}
                  onChange={(e) => setSendTelegram(e.target.checked)}
                />
                <Send size={15} />
                Telegram orqali xabar (telefon raqami)
              </label>

              {sendTelegram && (
                <div className="attendance-sms-targets">
                  <span className="attendance-sms-label">Kimga yuborilsin:</span>
                  <label className={`attendance-sms-option ${telegramTarget === 'parents' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="telegramTarget"
                      value="parents"
                      checked={telegramTarget === 'parents'}
                      onChange={() => setTelegramTarget('parents')}
                    />
                    Ota-onaga
                  </label>
                  <label className={`attendance-sms-option ${telegramTarget === 'student' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="telegramTarget"
                      value="student"
                      checked={telegramTarget === 'student'}
                      onChange={() => setTelegramTarget('student')}
                    />
                    O'quvchiga
                  </label>
                  <label className={`attendance-sms-option ${telegramTarget === 'both' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="telegramTarget"
                      value="both"
                      checked={telegramTarget === 'both'}
                      onChange={() => setTelegramTarget('both')}
                    />
                    Hammasiga
                  </label>
                </div>
              )}

              <p className="attendance-telegram-hint">
                Ota-ona bir marta botda <strong>/start</strong> bosib telefon raqamini ulashadi — keyin CRM dagi telefon orqali davomat va baho xabari keladi.
              </p>
            </div>
          )}

          <div className={`attendance-list ${!canEdit ? 'attendance-list-readonly' : ''}`}>
            {students.map((student) => {
              const status = statuses[student.id] ?? 'present';
              const grade = grades[student.id] ?? null;
              const showGrades = needsGrade(status);

              return (
                <div key={student.id} className="attendance-row">
                  <div className="attendance-row-main">
                    <div className="attendance-student">
                      <UserAvatar name={student.name} photoUrl={student.photoUrl} />
                      <span>{student.name}</span>
                    </div>
                    <div className="attendance-actions">
                      {statusOptions.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`attendance-btn attendance-btn-${value} ${status === value ? 'active' : ''}`}
                          onClick={() => setStatus(student.id, value)}
                          disabled={!canEdit}
                        >
                          {statusLabels[value]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {showGrades && canEdit && (
                    <div className="attendance-grade-row">
                      <span className="attendance-grade-label">Baho:</span>
                      <div className="attendance-grade-actions">
                        {gradeOptions.map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`grade-btn grade-btn-${value} ${grade === value ? 'active' : ''}`}
                            onClick={() => setGrade(student.id, value)}
                          >
                            {gradeLabels[value]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {showGrades && isLocked && (
                    <div className="attendance-grade-row attendance-grade-row-readonly">
                      <span className="attendance-grade-label">Baho:</span>
                      {grade ? (
                        <span className={`grade-badge grade-badge-${grade}`}>{gradeLabels[grade]}</span>
                      ) : (
                        <span className="table-muted">—</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && <p className="account-error">{error}</p>}
          {notifyNotice && (
            <p className={`attendance-sms-notice ${notifyNotice.includes('xatolik') || notifyNotice.includes('sozlanmagan') || notifyNotice.includes('yuborilmadi') ? 'error' : ''}`}>
              {notifyNotice}
            </p>
          )}

          {canEdit && (
            <div className="attendance-footer">
              <button
                type="button"
                className="save-btn"
                onClick={handleSave}
                disabled={saving || !dirty}
              >
                <Save size={14} />
                {saving ? 'Saqlanmoqda...' : 'Davomatni saqlash'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
