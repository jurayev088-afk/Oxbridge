import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Search,
  Plus,
  Sparkles,
  Phone,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Pencil,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Header } from '../components/Header';
import { Navbar } from '../components/Navbar';
import { LeadModal } from '../components/LeadModal';
import { ConvertLeadModal } from '../components/ConvertLeadModal';
import { deleteLead, fetchLeads, updateLead } from '../api/leads';
import { useNotifications } from '../context/NotificationContext';
import { notificationMessages } from '../lib/notificationMessages';
import { KANBAN_STATUSES, getLeadSourceLabel, getLeadStatusMeta } from '../lib/leadConfig';
import type { Lead, LeadStatus, StudentListItem } from '../types';
import { formatPhoneOrDash, normalizePhoneForSearch } from '../lib/formatDisplay';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' });
}

export function Leads() {
  const { notify } = useNotifications();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [addStatus, setAddStatus] = useState<LeadStatus>('new');
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = normalizePhoneForSearch(search);
    if (!q) return leads;
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(q) ||
        (qDigits && normalizePhoneForSearch(lead.phone).includes(qDigits)) ||
        (!qDigits && lead.phone.toLowerCase().includes(q)) ||
        lead.courseInterest.toLowerCase().includes(q) ||
        lead.note.toLowerCase().includes(q) ||
        getLeadSourceLabel(lead.source).toLowerCase().includes(q)
    );
  }, [leads, search]);

  const stats = useMemo(
    () => ({
      total: leads.filter((l) => l.status !== 'converted').length,
      active: leads.filter((l) => !['converted', 'lost'].includes(l.status)).length,
      trial: leads.filter((l) => l.status === 'trial').length,
      pendingConvert: leads.filter((l) => l.status === 'converted').length,
    }),
    [leads]
  );

  const pendingConvert = useMemo(
    () => leads.filter((l) => l.status === 'converted'),
    [leads]
  );

  const columns = useMemo(
    () =>
      KANBAN_STATUSES.map((status) => ({
        ...status,
        items: filtered.filter((lead) => lead.status === status.id),
      })),
    [filtered]
  );

  function openAdd(status: LeadStatus) {
    setAddStatus(status);
    setEditingLead(null);
    setModalOpen(true);
  }

  function handleSaved(lead: Lead) {
    setLeads((prev) => {
      const exists = prev.some((item) => item.id === lead.id);
      if (exists) {
        return prev.map((item) => (item.id === lead.id ? lead : item));
      }
      return [lead, ...prev];
    });
  }

  async function handleQuickMove(lead: Lead, status: LeadStatus) {
    if (lead.status === status) return;
    if (status === 'converted') {
      setConvertingLead(lead);
      return;
    }
    const updated = await updateLead(lead.id, { status });
    if (updated) {
      setLeads((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      notify(notificationMessages.leadUpdated(updated.name));
    }
  }

  function handleConverted(removedLeadId: string, _student: StudentListItem) {
    setLeads((prev) => prev.filter((item) => item.id !== removedLeadId));
  }

  async function handleDelete(lead: Lead) {
    const confirmed = window.confirm(`"${lead.name}" lidini o'chirmoqchimisiz?`);
    if (!confirmed) return;

    const ok = await deleteLead(lead.id);
    if (ok) {
      notify(notificationMessages.leadDeleted(lead.name));
      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
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
        <div className="leads-page">
          <div className="groups-top">
            <div className="groups-intro">
              <h1 className="groups-title">Lidlar</h1>
              <p className="groups-subtitle">
                Potensial o&apos;quvchilarni kuzating va bosqichma-bosqich o&apos;quvchiga aylantiring
              </p>
            </div>
            <div className="groups-toolbar">
              <div className="groups-search">
                <Search size={16} />
                <input
                  type="text"
                  aria-label="Ism, telefon yoki manba qidirish"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="button" className="groups-add-btn" onClick={() => openAdd('new')}>
                <Plus size={16} />
                Lid qo&apos;shish
              </button>
            </div>
          </div>

          <div className="leads-stats-row">
            <div className="leads-stat-card" style={{ '--lead-accent': '#3b82f6', '--lead-glow': 'rgba(59, 130, 246, 0.12)' } as CSSProperties}>
              <Sparkles size={18} />
              <div>
                <span className="leads-stat-value">{stats.total}</span>
                <span className="leads-stat-label">Jami lidlar</span>
              </div>
            </div>
            <div className="leads-stat-card" style={{ '--lead-accent': '#f59e0b', '--lead-glow': 'rgba(245, 158, 11, 0.12)' } as CSSProperties}>
              <TrendingUp size={18} />
              <div>
                <span className="leads-stat-value">{stats.active}</span>
                <span className="leads-stat-label">Faol lidlar</span>
              </div>
            </div>
            <div className="leads-stat-card" style={{ '--lead-accent': '#a855f7', '--lead-glow': 'rgba(168, 85, 247, 0.12)' } as CSSProperties}>
              <MessageSquare size={18} />
              <div>
                <span className="leads-stat-value">{stats.trial}</span>
                <span className="leads-stat-label">Sinov darsida</span>
              </div>
            </div>
            <div className="leads-stat-card" style={{ '--lead-accent': '#22c55e', '--lead-glow': 'rgba(34, 197, 94, 0.12)' } as CSSProperties}>
              <UserCheck size={18} />
              <div>
                <span className="leads-stat-value">{stats.pendingConvert}</span>
                <span className="leads-stat-label">O&apos;tkazish kutilmoqda</span>
              </div>
            </div>
          </div>

          {pendingConvert.length > 0 && (
            <div className="leads-pending-convert">
              <div className="leads-pending-convert-header">
                <UserCheck size={18} />
                <div>
                  <strong>O&apos;quvchilarga o&apos;tkazish kerak</strong>
                  <p>Quyidagi lidlar hali o&apos;quvchilar ro&apos;yxatiga saqlanmagan</p>
                </div>
              </div>
              <div className="leads-pending-convert-list">
                {pendingConvert.map((lead) => (
                  <div key={lead.id} className="leads-pending-convert-item">
                    <div>
                      <span className="leads-pending-name">{lead.name}</span>
                      {lead.phone && <span className="leads-pending-phone">{formatPhoneOrDash(lead.phone)}</span>}
                    </div>
                    <button
                      type="button"
                      className="lead-convert-btn"
                      onClick={() => setConvertingLead(lead)}
                    >
                      O&apos;quvchi sifatida saqlash
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="leads-kanban">
            {columns.map((column) => (
              <section
                key={column.id}
                className="leads-column"
                style={{ '--column-accent': column.color, '--column-glow': column.glow } as React.CSSProperties}
              >
                <header className="leads-column-header">
                  <div className="leads-column-title">
                    <span className="leads-column-dot" />
                    <h3>{column.label}</h3>
                  </div>
                  <div className="leads-column-meta">
                    <span className="leads-column-count">{column.items.length}</span>
                    <button
                      type="button"
                      className="leads-column-add"
                      onClick={() => openAdd(column.id)}
                      aria-label={`${column.label} ga lid qo'shish`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </header>

                <div className="leads-column-body">
                  {column.items.map((lead) => {
                    const statusMeta = getLeadStatusMeta(lead.status);
                    return (
                      <article key={lead.id} className="lead-card">
                        <div className="lead-card-top">
                          <div className="lead-avatar">{lead.name.charAt(0).toUpperCase()}</div>
                          <div className="lead-card-info">
                            <h4>{lead.name}</h4>
                            {lead.courseInterest && (
                              <span className="lead-course">{lead.courseInterest}</span>
                            )}
                          </div>
                          <div className="lead-card-actions">
                            <button
                              type="button"
                              className="lead-action-btn lead-action-edit"
                              onClick={() => {
                                setEditingLead(lead);
                                setModalOpen(true);
                              }}
                              aria-label="Tahrirlash"
                              title="Tahrirlash"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="lead-action-btn lead-action-delete"
                              onClick={() => handleDelete(lead)}
                              aria-label="O'chirish"
                              title="O'chirish"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="lead-card-meta">
                          {lead.phone && (
                            <span className="lead-meta-item">
                              <Phone size={13} />
                              {formatPhoneOrDash(lead.phone)}
                            </span>
                          )}
                          <span className="lead-source-badge">{getLeadSourceLabel(lead.source)}</span>
                        </div>

                        {lead.note && <p className="lead-card-note">{lead.note}</p>}

                        <div className="lead-card-footer">
                          <span className="lead-date">
                            <Calendar size={12} />
                            {formatDate(lead.createdAt)}
                          </span>
                        </div>

                        {lead.status !== 'converted' && lead.status !== 'lost' && (
                          <div className="lead-quick-move">
                            {KANBAN_STATUSES.filter(
                              (s) => s.id !== lead.status && s.id !== 'lost'
                            )
                              .slice(0, 2)
                              .map((next) => (
                                <button
                                  key={next.id}
                                  type="button"
                                  className="lead-move-btn"
                                  onClick={() => handleQuickMove(lead, next.id)}
                                >
                                  → {next.label}
                                </button>
                              ))}
                            <button
                              type="button"
                              className="lead-move-btn lead-move-convert"
                              onClick={() => setConvertingLead(lead)}
                            >
                              → O&apos;quvchi
                            </button>
                          </div>
                        )}

                        <div
                          className="lead-card-accent"
                          style={{ backgroundColor: statusMeta.color }}
                        />
                      </article>
                    );
                  })}

                  {column.items.length === 0 && (
                    <div className="leads-column-empty">
                      <p>Hali lid yo&apos;q</p>
                      <button type="button" onClick={() => openAdd(column.id)}>
                        + Qo&apos;shish
                      </button>
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>

      <LeadModal
        open={modalOpen}
        lead={editingLead}
        defaultStatus={addStatus}
        onClose={() => {
          setModalOpen(false);
          setEditingLead(null);
        }}
        onSaved={handleSaved}
        onConvertToStudent={(lead) => {
          setModalOpen(false);
          setEditingLead(null);
          setConvertingLead(lead);
        }}
      />

      <ConvertLeadModal
        open={Boolean(convertingLead)}
        lead={convertingLead}
        onClose={() => setConvertingLead(null)}
        onConverted={handleConverted}
      />
    </div>
  );
}
