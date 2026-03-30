'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './styles.module.css';
import {
  type Booking,
  type Session,
  COURTS,
  TEMPLATES,
  MOCK_BOOKINGS,
  MOCK_STUDENT_ID,
  MOCK_STUDENT_NAME,
  getSessionsStore,
  getWeekStart,
  studentBook,
} from '../../../../lib/schedule';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_STUDENT = MOCK_STUDENT_NAME;
const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayDate(weekStart: Date, offset: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + offset);
  return d;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDayDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getSessionDayOffset(session: Session, weekStart: Date): number {
  const sd = new Date(session.startsAt);
  const ws = new Date(weekStart);
  ws.setHours(0, 0, 0, 0);
  const diff = Math.floor((sd.getTime() - ws.getTime()) / 86_400_000);
  return diff;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentSchedulePage() {
  const params = useParams();
  const tenant = params.tenant as string;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; ok: boolean } | null>(null);

  useEffect(() => {
    setWeekStart(getWeekStart());
    setSessions(getSessionsStore());
    setBookings([...MOCK_BOOKINGS]);
    const id = setInterval(() => {
      setSessions(getSessionsStore());
      setBookings([...MOCK_BOOKINGS]);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  if (!weekStart) return <div className={styles.loading}>Carregando...</div>;

  // ── Week navigation ──

  function prevWeek() {
    setWeekStart(prev => {
      const d = new Date(prev!);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function nextWeek() {
    setWeekStart(prev => {
      const d = new Date(prev!);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  // ── Booking ──

  function showFeedback(message: string, ok: boolean) {
    setFeedback({ message, ok });
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleBook(sessionId: string, channel: 'MEMBERSHIP' | 'BENEFIT' | 'DROP_IN') {
    const result = studentBook(sessionId, MOCK_STUDENT_ID, MOCK_STUDENT, channel);
    if ('error' in result) {
      if (result.error === 'duplicate') showFeedback('Você já tem uma reserva nesta sessão.', false);
      else if (result.error === 'full') showFeedback('Sessão lotada.', false);
      else showFeedback('Não foi possível realizar a reserva.', false);
      return;
    }
    setBookings([...MOCK_BOOKINGS]);
    showFeedback('Reserva realizada com sucesso!', true);
  }

  // ── Derived per-session helpers ──

  function getAvailable(session: Session): number {
    const template = TEMPLATES.find(t => t.id === session.templateId);
    const capacity = template?.capacity ?? 0;
    const active = bookings.filter(
      b => b.sessionId === session.id && b.status !== 'CANCELLED',
    ).length;
    return Math.max(0, capacity - active);
  }

  function getStudentBooking(sessionId: string): Booking | undefined {
    return bookings.find(
      b => b.sessionId === sessionId && b.studentId === MOCK_STUDENT_ID && b.status !== 'CANCELLED',
    );
  }

  // ── Group sessions by day offset ──

  const sessionsByDay: Array<{ offset: number; dayDate: Date; sessions: Session[] }> =
    Array.from({ length: 7 }, (_, i) => ({
      offset: i,
      dayDate: getDayDate(weekStart, i),
      sessions: sessions
        .filter(s => getSessionDayOffset(s, weekStart) === i)
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    })).filter(d => d.sessions.length > 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Aulas Disponíveis</h1>
          <span className={styles.studentBadge}>Aluno Demo</span>
        </div>
        <div className={styles.headerRight}>
          <Link href={`/${tenant}/student/my-schedule`} className={styles.btnSecondary}>
            Minha Agenda
          </Link>
          <button className={styles.btnSecondary} onClick={() => setWeekStart(getWeekStart())}>
            Hoje
          </button>
          <button className={styles.btnSecondary} onClick={prevWeek}>‹</button>
          <span className={styles.weekLabel}>
            {formatDayDate(weekStart)} – {formatDayDate(getDayDate(weekStart, 6))}
          </span>
          <button className={styles.btnSecondary} onClick={nextWeek}>›</button>
        </div>
      </header>

      {feedback && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem', zIndex: 999,
          padding: '0.75rem 1.25rem', borderRadius: '0.5rem',
          background: feedback.ok ? '#166534' : '#7f1d1d',
          color: '#fff', fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}>
          {feedback.message}
        </div>
      )}

      <main className={styles.main}>
        {sessionsByDay.length === 0 && (
          <p className={styles.empty}>Nenhuma aula nesta semana.</p>
        )}

        {sessionsByDay.map(({ offset, dayDate, sessions: daySessions }) => (
          <section key={offset} className={styles.daySection}>
            <h2 className={styles.dayHeading}>
              {DAY_NAMES[offset]} · {formatDayDate(dayDate)}
            </h2>

            <div className={styles.sessionList}>
              {daySessions.map(session => {
                const template = TEMPLATES.find(t => t.id === session.templateId);
                const court = COURTS.find(c => c.id === session.courtId);
                const available = getAvailable(session);
                const isFull = available === 0;
                const existingBooking = getStudentBooking(session.id);

                return (
                  <div
                    key={session.id}
                    className={`${styles.sessionCard} ${isFull && !existingBooking ? styles.cardFull : ''}`}
                  >
                    <div className={styles.cardInfo}>
                      <span className={styles.cardTime}>{formatTime(session.startsAt)}</span>
                      <span className={styles.cardName}>{template?.name}</span>
                      <span className={styles.cardCourt}>{court?.name}</span>
                      <span className={`${styles.cardSpots} ${isFull ? styles.spotsZero : ''}`}>
                        {`${available} vaga${available !== 1 ? 's' : ''}`}
                      </span>
                    </div>

                    <div className={styles.cardAction}>
                      {existingBooking ? (
                        <span className={styles.badgeBooked}>Reservado</span>
                      ) : isFull ? (
                        <span className={styles.badgeFull}>Lotado</span>
                      ) : (
                        <div className={styles.bookOptions}>
                          <button
                            className={styles.btnBook}
                            onClick={() => handleBook(session.id, 'MEMBERSHIP')}
                          >
                            Mensalista
                          </button>
                          <button
                            className={styles.btnBook}
                            onClick={() => handleBook(session.id, 'BENEFIT')}
                          >
                            Benefício
                          </button>
                          <button
                            className={styles.btnBook}
                            onClick={() => handleBook(session.id, 'DROP_IN')}
                          >
                            Avulso
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
