'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './styles.module.css';
import {
  COURTS,
  TEACHERS,
  TEMPLATES,
  getSessionsStore,
  getBookingsForSession,
  type Session,
} from '../../../../lib/schedule';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDayLocal(iso: string, date: Date): boolean {
  return new Date(iso).toLocaleDateString() === date.toLocaleDateString();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const WEEKDAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatDateLabel(date: Date): string {
  const weekday = WEEKDAYS_PT[date.getDay()];
  const day     = String(date.getDate()).padStart(2, '0');
  const month   = String(date.getMonth() + 1).padStart(2, '0');
  return `${weekday} · ${day}/${month}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getSessionsForDate(date: Date): Session[] {
  const teacherId = TEACHERS[0].id;
  return getSessionsStore().filter(
    s => s.teacherId === teacherId && isSameDayLocal(s.startsAt, date),
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherTodayPage() {
  const params = useParams();
  const tenant = params.tenant as string;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setSessions(getSessionsForDate(d));
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    setSessions(getSessionsForDate(selectedDate));
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedDate) return;
    const id = setInterval(() => setSessions(getSessionsForDate(selectedDate)), 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  if (!selectedDate) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Meu Dia</h1>
        <span className={styles.tenant}>{tenant}</span>
      </header>

      <div className={styles.navRow}>
        <button
          className={styles.navBtn}
          onClick={() => setSelectedDate(d => addDays(d!, -1))}
          aria-label="Dia anterior"
        >
          ←
        </button>
        <span className={styles.dateLabel}>{formatDateLabel(selectedDate)}</span>
        <button
          className={styles.navBtn}
          onClick={() => setSelectedDate(d => addDays(d!, 1))}
          aria-label="Próximo dia"
        >
          →
        </button>
      </div>

      <div className={styles.content}>
        {sessions.length === 0 ? (
          <p className={styles.empty}>Sem aulas hoje.</p>
        ) : (
          <ul className={styles.list}>
            {sessions.map(session => {
              const template = TEMPLATES.find(t => t.id === session.templateId);
              const court    = COURTS.find(c => c.id === session.courtId);
              const bookings = getBookingsForSession(session.id);
              const active    = bookings.filter(b => b.status !== 'CANCELLED').length;
              const confirmed = bookings.filter(b => b.status === 'CHECKIN_CONFIRMED').length;

              return (
                <li key={session.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.time}>{formatTime(session.startsAt)}</span>
                    <span className={styles.templateName}>{template?.name ?? '—'}</span>
                    <span className={styles.court}>{court?.name ?? '—'}</span>
                  </div>
                  <div className={styles.cardBottom}>
                    <span className={styles.stat}>{active} inscritos</span>
                    <span className={styles.statConfirmed}>{confirmed} confirmados</span>
                    <Link
                      href={`/${tenant}/teacher/sessions/${session.id}`}
                      className={styles.callLink}
                    >
                      Abrir chamada →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
