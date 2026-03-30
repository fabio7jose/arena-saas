'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './styles.module.css';
import {
  type Booking,
  type Session,
  COURTS,
  TEMPLATES,
  getBookingsForSession,
  getSessionsStore,
} from '../../../../lib/schedule';


// ─── Helpers ─────────────────────────────────────────────────────────────────

function isSameDayLocal(iso: string, date: Date): boolean {
  return new Date(iso).toLocaleDateString() === date.toLocaleDateString();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
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

// ─── Derived data ─────────────────────────────────────────────────────────────

interface DayData {
  sessions: Session[];
  allBookings: Booking[];
}

function loadForDate(date: Date): DayData {
  const sessions    = getSessionsStore().filter(s => isSameDayLocal(s.startsAt, date));
  const allBookings = sessions.flatMap(s => getBookingsForSession(s.id));
  return { sessions, allBookings };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const params = useParams();
  const tenant = params.tenant as string;

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [data, setData]   = useState<DayData>({ sessions: [], allBookings: [] });
  const [ready, setReady] = useState(false);

  // Initial load (client-only to avoid SSR/hydration mismatch)
  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setData(loadForDate(d));
    setReady(true);
  }, []);

  // Reload when date changes
  useEffect(() => {
    if (ready && selectedDate) setData(loadForDate(selectedDate));
  }, [selectedDate, ready]);

  // Poll every 1s
  useEffect(() => {
    if (!selectedDate) return;
    const id = setInterval(() => setData(loadForDate(selectedDate)), 1000);
    return () => clearInterval(id);
  }, [selectedDate]);

  if (!selectedDate) return null;

  const { sessions, allBookings } = data;

  // ── Summary counts ──


  const active    = allBookings.filter(b => b.status !== 'CANCELLED');
  const confirmed = active.filter(b => b.status === 'CHECKIN_CONFIRMED').length;
  const attended  = active.filter(b => b.status === 'ATTENDED').length;
  const noShow    = active.filter(b => b.status === 'NO_SHOW').length;
  const pending   = active.filter(b => b.status === 'RESERVED' || b.status === 'PRE_CHECKIN_PENDING').length;

  // ── Render ──

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href={`/${tenant}/admin/schedule`} className={styles.backLink}>
          ← Grade Semanal
        </Link>
        <h1 className={styles.title}>Operações do Dia</h1>
        <span className={styles.tenant}>{tenant}</span>
      </header>

      {/* Date navigation */}
      <div className={styles.navRow}>
        <button
          className={styles.navBtn}
          onClick={() => setSelectedDate(d => addDays(d, -1))}
          aria-label="Dia anterior"
        >
          ←
        </button>
        <span className={styles.dateLabel}>{formatDateLabel(selectedDate)}</span>
        <button
          className={styles.navBtn}
          onClick={() => setSelectedDate(d => addDays(d, 1))}
          aria-label="Próximo dia"
        >
          →
        </button>
      </div>

      <div className={styles.content}>
        {sessions.length === 0 ? (
          <p className={styles.empty}>Nenhuma sessão neste dia.</p>
        ) : (
          <>
            {/* Summary bar */}
            <section className={styles.summaryBar}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{active.length}</span>
                <span className={styles.summaryLabel}>Reservas ativas</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={`${styles.summaryValue} ${styles.confirmed}`}>{confirmed}</span>
                <span className={styles.summaryLabel}>Confirmados</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={`${styles.summaryValue} ${styles.attended}`}>{attended}</span>
                <span className={styles.summaryLabel}>Presentes</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={`${styles.summaryValue} ${styles.noshow}`}>{noShow}</span>
                <span className={styles.summaryLabel}>Faltas</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={`${styles.summaryValue} ${styles.pendingVal}`}>{pending}</span>
                <span className={styles.summaryLabel}>Pendentes</span>
              </div>
            </section>

            {/* Session cards */}
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Sessões do dia</h2>
              <div className={styles.cardList}>
                {sessions.map(s => {
                  const template = TEMPLATES.find(t => t.id === s.templateId);
                  const court    = COURTS.find(c => c.id === s.courtId);
                  const bks      = allBookings.filter(b => b.sessionId === s.id && b.status !== 'CANCELLED');
                  const conf     = bks.filter(b => b.status === 'CHECKIN_CONFIRMED').length;
                  const pend     = bks.filter(b => b.status === 'RESERVED' || b.status === 'PRE_CHECKIN_PENDING').length;
                  const att      = bks.filter(b => b.status === 'ATTENDED').length;
                  const ns       = bks.filter(b => b.status === 'NO_SHOW').length;
                  return (
                    <div key={s.id} className={styles.sessionCard}>
                      <div className={styles.sessionCardMain}>
                        <span className={styles.sessionTime}>{formatTime(s.startsAt)}</span>
                        <span className={styles.sessionName}>{template?.name ?? '—'}</span>
                        <span className={styles.sessionCourt}>{court?.name ?? '—'}</span>
                      </div>
                      <div className={styles.sessionCardCounts}>
                        <span>{bks.length} ativo</span>
                        <span className={styles.confirmed}>{conf} confirmados</span>
                        <span className={styles.pendingVal}>{pend} pendentes</span>
                        <span className={styles.attended}>{att} presentes</span>
                        <span className={styles.noshow}>{ns} faltas</span>
                      </div>
                      <Link
                        href={`/${tenant}/admin/sessions/${s.id}`}
                        className={styles.sessionLink}
                      >
                        Ver sessão →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </section>

          </>
        )}
      </div>
    </div>
  );
}
