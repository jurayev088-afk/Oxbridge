import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Mail,
  Layers,
  MapPin,
  Wallet,
  Users,
  Pencil,
  Save,
  X,
  Send,
  CheckCircle2,
  CircleDashed,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { PhotoUpload } from '../components/PhotoUpload';
import { UserCredentialsSection } from '../components/UserCredentialsSection';
import { fetchUser, updateUser } from '../api/client';
import { MonthlyFeeFields, resolveMonthlyFee } from '../components/MonthlyFeeFields';
import { useNotifications } from '../context/NotificationContext';
import { useAuth, getHomePath } from '../context/AuthContext';
import { notificationMessages } from '../lib/notificationMessages';
import { getMonthPeriodLabel } from '../lib/monthLabels';
import { getPhoneForSubmit } from '../lib/formatInputs';
import { canManageCredentials, hasAdminAccess, roleLabels } from '../lib/roles';
import type { User as UserType } from '../types';
import { formatMoney, formatPhoneOrDash } from '../lib/formatDisplay';
import { PhoneInput } from '../components/PhoneInput';

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('uz-UZ');
}

function getDisplayMonthlyFee(user: UserType) {
  return user.monthlyFee ?? user.currentBillAmount ?? user.paymentDue ?? 0;
}

export function UserAccount() {
  const now = new Date();
  const periodLabel = getMonthPeriodLabel(now.getFullYear(), now.getMonth() + 1);
  const { notify } = useNotifications();
  const { user: authUser, refreshUser } = useAuth();
  const homePath = authUser ? getHomePath(authUser.role) : '/';
  const homeLabel =
    authUser?.role === 'teacher'
      ? 'Kabinetga qaytish'
      : authUser?.role === 'student'
        ? 'Kabinetga qaytish'
        : 'Bosh sahifaga qaytish';
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserType | null>(null);
  const [form, setForm] = useState<UserType | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!id) return;
    fetchUser(id)
      .then((data) => {
        setUser(data);
        setForm(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  function startEdit() {
    setForm(user);
    setEditing(true);
    setSaveError('');
  }

  function cancelEdit() {
    setForm(user);
    setEditing(false);
  }

  async function saveEdit() {
    if (!id || !form) return;
    setSaving(true);
    setSaveError('');

    const updated = await updateUser(id, {
      name: form.name,
      phone: getPhoneForSubmit(form.phone ?? ''),
      email: form.email,
      address: form.address,
      monthlyFee: resolveMonthlyFee(String(form.monthlyFee ?? '')),
      photoUrl: form.photoUrl,
      fatherName: form.fatherName,
      fatherPhone: getPhoneForSubmit(form.fatherPhone ?? ''),
      motherName: form.motherName,
      motherPhone: getPhoneForSubmit(form.motherPhone ?? ''),
      telegramChatId: form.telegramChatId,
      fatherTelegramChatId: form.fatherTelegramChatId,
      motherTelegramChatId: form.motherTelegramChatId,
    });

    if (updated) {
      notify(notificationMessages.profileUpdated(updated.name));
      setUser(updated);
      setForm(updated);
      setEditing(false);
      if (authUser?.id === updated.id) {
        await refreshUser();
      }
    } else {
      setSaveError('Saqlashda xatolik. Qayta urinib ko\'ring.');
    }
    setSaving(false);
  }

  function updateField<K extends keyof UserType>(key: K, value: UserType[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loader">Yuklanmoqda...</div>
      </div>
    );
  }

  if (!user || !form) {
    return (
      <div className="dashboard">
        <Header />
        <main className="dashboard-main">
          <div className="account-page">
            <p className="account-error">Foydalanuvchi topilmadi</p>
            <Link to={homePath} className="back-link">
              <ArrowLeft size={16} /> {homeLabel}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (
    authUser &&
    !hasAdminAccess(authUser.role) &&
    authUser.id !== user.id
  ) {
    return <Navigate to={authUser.role === 'teacher' ? '/oqituvchi-kabinet' : '/mening-kabinetim'} replace />;
  }

  const canEdit = hasAdminAccess(authUser?.role) || authUser?.id === user.id;
  const isDirectorOwnProfile = authUser?.role === 'director' && authUser.id === user.id;
  const showCredentials =
    authUser != null &&
    (isDirectorOwnProfile || canManageCredentials(authUser.role, user.role));

  const display = editing ? form : user;

  return (
    <div className="dashboard">
      <Header />
      <Navbar />
      <main className="dashboard-main">
        <div className="account-page">
          <div className="account-top-bar">
            <Link to={homePath} className="back-link">
              <ArrowLeft size={16} /> {homeLabel}
            </Link>
            {!editing && canEdit ? (
              <button type="button" className="edit-btn" onClick={startEdit}>
                <Pencil size={14} /> Tahrirlash
              </button>
            ) : editing && canEdit ? (
              <div className="edit-actions">
                <button type="button" className="cancel-btn" onClick={cancelEdit}>
                  <X size={14} /> Bekor qilish
                </button>
                <button type="button" className="save-btn" onClick={saveEdit} disabled={saving}>
                  <Save size={14} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            ) : null}
          </div>

          {saveError && <p className="account-error">{saveError}</p>}

          <div className="account-header">
            <PhotoUpload
              photoUrl={display.photoUrl}
              name={display.name}
              role={display.role}
              editing={editing}
              onPhotoChange={(url) => updateField('photoUrl', url)}
            />
            <div className="account-header-info">
              {editing ? (
                <input
                  className="edit-input title-input"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                />
              ) : (
                <h1 className="account-title">{user.name}</h1>
              )}
              <p className="account-subtitle">{roleLabels[user.role]} akkaunti</p>
            </div>
          </div>

          <div className="account-info-grid">
            <div className="account-info-card">
              <Phone size={18} />
              <div className="info-field">
                <span className="info-label">Telefon</span>
                {editing ? (
                  <PhoneInput
                    value={form.phone ?? ''}
                    onChange={(phone) => updateField('phone', phone)}
                  />
                ) : (
                  <span className="info-value">{formatPhoneOrDash(user.phone)}</span>
                )}
              </div>
            </div>

            <div className="account-info-card">
              <Mail size={18} />
              <div className="info-field">
                <span className="info-label">Email</span>
                {editing ? (
                  <input
                    className="edit-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                ) : (
                  <span className="info-value">{user.email}</span>
                )}
              </div>
            </div>

            <div className="account-info-card full-width">
              <MapPin size={18} />
              <div className="info-field">
                <span className="info-label">Manzil</span>
                {editing ? (
                  <input
                    className="edit-input"
                    value={form.address ?? ''}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                ) : (
                  <span className="info-value">{user.address || '—'}</span>
                )}
              </div>
            </div>

            {user.role === 'student' && (
              <>
                <div className="account-info-card">
                  <Wallet size={18} />
                  <div className="info-field">
                    <span className="info-label">Oylik to&apos;lov summasi</span>
                    {editing ? (
                      <div className="account-fee-edit">
                        <MonthlyFeeFields
                          value={String(form.monthlyFee ?? '')}
                          onChange={(raw) => updateField('monthlyFee', resolveMonthlyFee(raw))}
                        />
                      </div>
                    ) : (
                      <span className="info-value payment-due">
                        {formatMoney(getDisplayMonthlyFee(user))}
                      </span>
                    )}
                  </div>
                </div>

                <div className="account-info-card">
                  <CheckCircle2 size={18} />
                  <div className="info-field">
                    <span className="info-label">{periodLabel} holati</span>
                    {user.paymentStatus === 'paid' ? (
                      <span className="monthly-bill-status paid account-payment-status">
                        <CheckCircle2 size={14} />
                        To&apos;lov qilindi
                        {user.paymentDate && <small>{formatDate(user.paymentDate)}</small>}
                      </span>
                    ) : user.paymentStatus === 'partial' ? (
                      <span className="monthly-bill-status partial account-payment-status">
                        <Wallet size={14} />
                        Qisman to&apos;langan
                        <small>
                          {formatMoney(user.paidAmount ?? 0)} / {formatMoney(getDisplayMonthlyFee(user))}
                          {' · '}qolgan {formatMoney(user.remainingAmount ?? 0)}
                        </small>
                      </span>
                    ) : (
                      <span className="monthly-bill-status pending account-payment-status">
                        <CircleDashed size={14} />
                        To&apos;lov qilinmagan
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {user.groupId && (
              <div className="account-info-card">
                <Layers size={18} />
                <div className="info-field">
                  <span className="info-label">Guruh</span>
                  <Link to={`/guruh/${user.groupId}`} className="info-link">
                    {user.groupName ?? user.groupId}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {user.role === 'student' && (
            <div className="account-section">
              <h2 className="section-title">
                <Users size={18} />
                Ota-ona ma'lumotlari
              </h2>
              <div className="account-info-grid">
                <div className="account-info-card">
                  <Users size={18} />
                  <div className="info-field">
                    <span className="info-label">Otasi ismi</span>
                    {editing ? (
                      <input
                        className="edit-input"
                        value={form.fatherName ?? ''}
                        onChange={(e) => updateField('fatherName', e.target.value)}
                      />
                    ) : (
                      <span className="info-value">{user.fatherName || '—'}</span>
                    )}
                  </div>
                </div>
                <div className="account-info-card">
                  <Phone size={18} />
                  <div className="info-field">
                    <span className="info-label">Otasi telefoni</span>
                    {editing ? (
                      <input
                        className="edit-input"
                        type="tel"
                        value={form.fatherPhone ?? ''}
                        onChange={(e) => updateField('fatherPhone', e.target.value)}
                      />
                    ) : (
                      <span className="info-value">{user.fatherPhone || '—'}</span>
                    )}
                  </div>
                </div>
                <div className="account-info-card">
                  <Users size={18} />
                  <div className="info-field">
                    <span className="info-label">Onasi ismi</span>
                    {editing ? (
                      <input
                        className="edit-input"
                        value={form.motherName ?? ''}
                        onChange={(e) => updateField('motherName', e.target.value)}
                      />
                    ) : (
                      <span className="info-value">{user.motherName || '—'}</span>
                    )}
                  </div>
                </div>
                <div className="account-info-card">
                  <Phone size={18} />
                  <div className="info-field">
                    <span className="info-label">Onasi telefoni</span>
                    {editing ? (
                      <input
                        className="edit-input"
                        type="tel"
                        value={form.motherPhone ?? ''}
                        onChange={(e) => updateField('motherPhone', e.target.value)}
                      />
                    ) : (
                      <span className="info-value">{user.motherPhone || '—'}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="account-section telegram-section">
                <h2 className="section-title">
                  <Send size={18} />
                  Telegram (davomat xabarlari)
                </h2>
                <p className="attendance-telegram-hint">
                  Ota-ona <strong>@oxbridgeacademy_bot</strong> da /start bosib telefon raqamini ulashadi.
                  CRM dagi ota/ona telefon raqami bilan mos kelishi kerak — Chat ID kerak emas.
                </p>
                {editing ? (
                  <p className="attendance-telegram-hint telegram-edit-hint">
                    Telefon raqamlarni yuqoridagi <strong>Ota-ona ma'lumotlari</strong> bo'limida
                    tahrirlang, keyin <strong>Saqlash</strong> bosing.
                  </p>
                ) : null}
                <div className="account-info-grid">
                  <div className="account-info-card">
                    <Phone size={18} />
                    <div className="info-field">
                      <span className="info-label">O'quvchi telefoni</span>
                      {editing ? (
                        <PhoneInput
                          value={form.phone ?? ''}
                          onChange={(phone) => updateField('phone', phone)}
                        />
                      ) : (
                        <span className="info-value">{formatPhoneOrDash(display.phone)}</span>
                      )}
                    </div>
                  </div>
                  <div className="account-info-card">
                    <Phone size={18} />
                    <div className="info-field">
                      <span className="info-label">Ota telefoni</span>
                      {editing ? (
                        <PhoneInput
                          value={form.fatherPhone ?? ''}
                          onChange={(phone) => updateField('fatherPhone', phone)}
                        />
                      ) : (
                        <span className="info-value">{formatPhoneOrDash(display.fatherPhone)}</span>
                      )}
                    </div>
                  </div>
                  <div className="account-info-card">
                    <Phone size={18} />
                    <div className="info-field">
                      <span className="info-label">Ona telefoni</span>
                      {editing ? (
                        <PhoneInput
                          value={form.motherPhone ?? ''}
                          onChange={(phone) => updateField('motherPhone', phone)}
                        />
                      ) : (
                        <span className="info-value">{formatPhoneOrDash(display.motherPhone)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showCredentials && (
            <UserCredentialsSection
              userId={user.id}
              userName={user.name}
              currentLogin={user.login}
              actorRole={authUser!.role}
              isOwnProfile={isDirectorOwnProfile}
            />
          )}
        </div>
      </main>
    </div>
  );
}
