'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import styles from './styles.module.css';
import {
  type Booking,
  type BookingStatus,
  COURTS,
  TEACHERS,
  TEMPLATES,
  getSessionById,
  getBookingsForSession,
  markAttended,
  markNoShow,
} from '../../../../../../lib/schedule';

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

export default function TeacherAttendancePage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const sessionId = params.id as string;

  const session = getSessionById(sessionId);

  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    function refresh() {
      setBookings(getBookingsForSession(sessionId));
    }
    refresh();
    const id = setInterval(refresh, 1000);
    return () => clearInterval(id);
  }, [sessionId]);

  if (!session) {
    return (
      <div className={styles.page}>
        <div className={styles.notFound}>
          <p>Sessão não encontrada.</p>
          <Link href={`/${tenant}/teacher/today`} className={styles.backLink}>
            ← Meu dia
          </Link>
        </div>
      </div>
    );
  }

  const template = TEMPLATES.find(t => t.id === session.templateId);
  const court    = COURTS.find(c => c.id === session.courtId);
  const teacher  = TEACHERS.find(t => t.id === session.teacherId);

  // Only show non-cancelled bookings in the attendance list
  const attendanceList = bookings.filter(b => b.status !== 'CANCELLED');

  const resolvedCount = attendanceList.filter(
    b => b.status === 'ATTENDED' || b.status === 'NO_SHOW',
  ).length;
  const allResolved = attendanceList.length > 0 && resolvedCount === attendanceList.length;

  // ── Actions ──

  function handleMarkAttended(bookingId: string) {
    markAttended(bookingId);
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
        <Link href={`/${tenant}/teacher/today`} className={styles.backLink}>
          ← Meu dia
        </Link>
        <h1 className={styles.title}>Chamada</h1>
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
            <span className={styles.infoValue} suppressHydrationWarning={true}>{formatDateTime(session.startsAt)}</span>
          </div>
        </section>

        {/* Attendance list */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Alunos ({attendanceList.length})
            <span className={styles.sectionSub}>
              {resolvedCount} / {attendanceList.length} resolvidos
            </span>
          </h2>

          {attendanceList.length === 0 ? (
            <p className={styles.empty}>Nenhum aluno nesta sessão.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Aluno</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Registrar</th>
                </tr>
              </thead>
              <tbody>
                {attendanceList.map(b => (
                  <tr key={b.id} className={styles.tr}>
                    <td className={styles.td}>
                      {b.studentName}
                      {b.accessChannel === 'TRIAL' && (
                        <span className={styles.trialBadge}>Experimental</span>
                      )}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.badge} ${STATUS_CLASS[b.status]}`}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {/* CHECKIN_CONFIRMED → can mark ATTENDED or NO_SHOW */}
                      {b.status === 'CHECKIN_CONFIRMED' && (
                        <div className={styles.actions}>
                          <button
                            className={styles.btnAttended}
                            onClick={() => handleMarkAttended(b.id)}
                          >
                            Presente
                          </button>
                          <button
                            className={styles.btnNoShow}
                            onClick={() => handleMarkNoShow(b.id)}
                          >
                            Falta
                          </button>
                        </div>
                      )}
                      {/* RESERVED or PRE_CHECKIN_PENDING → only NO_SHOW */}
                      {(b.status === 'RESERVED' || b.status === 'PRE_CHECKIN_PENDING') && (
                        <button
                          className={styles.btnNoShow}
                          onClick={() => handleMarkNoShow(b.id)}
                        >
                          Marcar falta
                        </button>
                      )}
                      {/* Already resolved */}
                      {(b.status === 'ATTENDED' || b.status === 'NO_SHOW') && (
                        <span className={styles.resolved}>✓ Registrado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Attendance status indicator */}
        {attendanceList.length > 0 && (
          <div className={styles.statusBar}>
            {allResolved ? (
              <span className={styles.allDone}>✓ Chamada completa</span>
            ) : (
              <span className={styles.progressText}>
                {resolvedCount} de {attendanceList.length} alunos registrados
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
