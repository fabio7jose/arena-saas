'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import styles from './styles.module.css';
import {
  type Booking,
  type BookingStatus,
  COURTS,
  TEACHERS,
  TEMPLATES,
  getSessionById,
  getBookingsForSession,
  confirmCheckin,
  markNoShow,
} from '../../../../../lib/schedule';

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<BookingStatus, string> = {
  RESERVED:            'Reservado',
  PRE_CHECKIN_PENDING: 'Reservado aguardando Check-in',
  CHECKIN_CONFIRMED:   'Confirmado',
  ATTENDED:            'Presente',
  NO_SHOW:             'Falta',
  CANCELLED:           'Cancelado',
};

const STATUS_CLASS: Record<BookingStatus, string> = {
  RESERVED:            styles.badgeReserved,
  PRE_CHECKIN_PENDING: styles.badgePending,
  CHECKIN_CONFIRMED:   styles.badgeConfirmed,
  ATTENDED:            styles.badgeAttended,
  NO_SHOW:             styles.badgeNoShow,
  CANCELLED:           styles.badgeCancelled,
};

const CHANNEL_LABEL: Record<string, string> = {
  MEMBERSHIP: 'Mensalista',
  DROP_IN:    'Avulso',
  BENEFIT:    'Benefício',
  TRIAL:      'Experimental',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SessionDetailPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const sessionId = params.id as string;

  const session = getSessionById(sessionId);

  // Local copy of bookings so actions trigger re-render
  const [bookings, setBookings] = useState<Booking[]>(() =>
    getBookingsForSession(sessionId),
  );

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>Sessão não encontrada.</p>
          <Link href={`/${tenant}/admin/schedule`} className={styles.backLink}>
            ← Voltar para a grade
          </Link>
        </div>
      </div>
    );
  }

  const template = TEMPLATES.find(t => t.id === session.templateId);
  const court    = COURTS.find(c => c.id === session.courtId);
  const teacher  = TEACHERS.find(t => t.id === session.teacherId);

  const activeBookings = bookings.filter(b => b.status !== 'CANCELLED');
  const confirmedCount = bookings.filter(
    b => b.status === 'CHECKIN_CONFIRMED' || b.status === 'ATTENDED',
  ).length;
  const capacity = template?.capacity ?? 0;

  // ── Actions ──

  function handleConfirmCheckin(bookingId: string) {
    confirmCheckin(bookingId);
    setBookings(getBookingsForSession(sessionId));
  }

  function handleMarkNoShow(bookingId: string) {
    markNoShow(bookingId);
    setBookings(getBookingsForSession(sessionId));
  }

  // ── Render ──

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href={`/${tenant}/admin/schedule`} className={styles.backLink}>
          ← Grade Semanal
        </Link>
        <h1 className={styles.title}>Detalhe da Sessão</h1>
        <Link href={`/${tenant}/teacher/sessions/${sessionId}`} className={styles.backLink}>
          Chamada do Professor →
        </Link>
        <Link href={`/${tenant}/student/my-schedule`} className={styles.backLink}>
          Agenda do Aluno →
        </Link>
        <span className={styles.tenant}>{tenant}</span>
      </header>

      <div className={styles.content}>
        {/* Session info card */}
        <section className={styles.infoCard}>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Modelo</span>
            <span className={styles.infoValue}>{template?.name ?? '—'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Quadra</span>
            <span className={styles.infoValue}>{court?.name ?? '—'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Professor</span>
            <span className={styles.infoValue}>{teacher?.name ?? '—'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Data / Hora</span>
            <span className={styles.infoValue}>{formatDateTime(session.startsAt)}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Duração</span>
            <span className={styles.infoValue}>{session.durationMinutes} min</span>
          </div>

          {/* Capacity indicator */}
          <div className={styles.capacityRow}>
            <span className={styles.infoLabel}>Vagas</span>
            <div className={styles.capacityBar}>
              <div
                className={styles.capacityFill}
                style={{ width: `${Math.min((activeBookings.length / capacity) * 100, 100)}%` }}
              />
            </div>
            <span className={styles.capacityText}>
              {activeBookings.length} / {capacity}
              {activeBookings.length >= capacity && (
                <span className={styles.fullBadge}>Lotado</span>
              )}
            </span>
          </div>
        </section>

        {/* Booking list */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Reservas ({activeBookings.length})
            <span className={styles.sectionSub}>
              {confirmedCount} confirmados
            </span>
          </h2>

          {bookings.length === 0 ? (
            <p className={styles.empty}>Nenhuma reserva para esta sessão.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Aluno</th>
                  <th className={styles.th}>Canal</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className={styles.tr}>
                    <td className={styles.td}>{b.studentName}</td>
                    <td className={styles.td}>
                      <span className={styles.channel}>
                        {CHANNEL_LABEL[b.accessChannel] ?? b.accessChannel}
                      </span>
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${STATUS_CLASS[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {(b.status === 'RESERVED' || b.status === 'PRE_CHECKIN_PENDING') && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className={styles.btnConfirm}
                            onClick={() => handleConfirmCheckin(b.id)}
                          >
                            Confirmar check-in
                          </button>
                          <button
                            className={styles.btnNoShow}
                            onClick={() => handleMarkNoShow(b.id)}
                          >
                            Marcar falta
                          </button>
                        </div>
                      )}
                      {b.status === 'CHECKIN_CONFIRMED' && (
                        <button
                          className={styles.btnNoShow}
                          onClick={() => handleMarkNoShow(b.id)}
                        >
                          Marcar falta
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Waitlist placeholder */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Lista de espera
            <span className={styles.sectionSub}>em breve</span>
          </h2>
          <p className={styles.empty}>Nenhum aluno na fila de espera.</p>
        </section>
      </div>
    </div>
  );
}
