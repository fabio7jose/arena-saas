'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import styles from './styles.module.css';
import {
  type Booking,
  type Session,
  type BookingStatus,
  COURTS,
  TEMPLATES,
  MOCK_BOOKINGS,
  MOCK_STUDENT_ID,
  MOCK_STUDENT_NAME,
  getSessionsStore,
  cancelBooking,
} from '../../../../../lib/schedule';

const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const STATUS_LABEL: Record<BookingStatus, string> = {
  RESERVED:            'Reservado',
  PRE_CHECKIN_PENDING: 'Aguardando Check-in',
  CHECKIN_CONFIRMED:   'Confirmado',
  ATTENDED:            'Presente',
  NO_SHOW:             'Falta',
  CANCELLED:           'Cancelado',
};

const STATUS_STYLE: Record<BookingStatus, string> = {
  RESERVED:            styles.badgeReserved,
  PRE_CHECKIN_PENDING: styles.badgePrecheckin,
  CHECKIN_CONFIRMED:   styles.badgeCheckin,
  ATTENDED:            styles.badgeAttended,
  NO_SHOW:             styles.badgeNoshow,
  CANCELLED:           styles.badgeCancelled,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDayDate(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
}

/** ISO date string → "YYYY-MM-DD" key for grouping */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/** Returns Monday index (0=Mon…6=Sun) for a session date */
function dayIndex(iso: string): number {
  const dow = new Date(iso).getDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}

// ─── Derived state snapshot ───────────────────────────────────────────────────

type Row = {
  booking: Booking;
  session: Session;
};

const UPCOMING_STATUSES: BookingStatus[] = ['RESERVED', 'PRE_CHECKIN_PENDING', 'CHECKIN_CONFIRMED'];

function buildRows(tab: 'upcoming' | 'past'): Row[] {
  const sessions = getSessionsStore();
  const now = new Date();

  return MOCK_BOOKINGS
    .filter(b => {
      if (b.studentId !== MOCK_STUDENT_ID) return false;
      if (b.status === 'CANCELLED') return false;
      const session = sessions.find(s => s.id === b.sessionId);
      if (!session) return false;
      const isPast = new Date(session.startsAt) < now;
      if (tab === 'upcoming') {
        return !isPast && UPCOMING_STATUSES.includes(b.status);
      }
      return isPast;
    })
    .flatMap(b => {
      const session = sessions.find(s => s.id === b.sessionId);
      return session ? [{ booking: b, session }] : [];
    })
    .sort((a, b) => {
      const diff = new Date(a.session.startsAt).getTime() - new Date(b.session.startsAt).getTime();
      return tab === 'past' ? -diff : diff;
    });
}

type DayGroup = {
  key: string;
  label: string;
  rows: Row[];
};

function groupByDay(rows: Row[]): DayGroup[] {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const k = dayKey(row.session.startsAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }

  return Array.from(map.entries()).map(([k, rows]) => {
    const date = new Date(rows[0].session.startsAt);
    const label = `${DAY_NAMES[dayIndex(rows[0].session.startsAt)]} · ${formatDayDate(date)}`;
    return { key: k, label, rows };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'upcoming' | 'past';

export default function MySchedulePage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const [tab, setTab] = useState<Tab>('upcoming');
  const [groups, setGroups] = useState<DayGroup[]>([]);

  function refresh(activeTab: Tab = tab) {
    setGroups(groupByDay(buildRows(activeTab)));
  }

  useEffect(() => {
    refresh(tab);
    const id = setInterval(() => refresh(tab), 1000);
    return () => clearInterval(id);
  }, [tab]);

  function switchTab(next: Tab) {
    setTab(next);
    setGroups(groupByDay(buildRows(next)));
  }

  const emptyMsg = tab === 'upcoming' ? 'Nenhuma reserva futura.' : 'Nenhum histórico ainda.';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Minha Agenda</h1>
        <span className={styles.studentBadge}>{MOCK_STUDENT_NAME}</span>
        <Link href={`/${tenant}/student/schedule`} className={styles.navLink}>
          ← Aulas
        </Link>
      </header>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${tab === 'upcoming' ? styles.tabBtnActive : ''}`}
          onClick={() => switchTab('upcoming')}
        >
          Próximas
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'past' ? styles.tabBtnActive : ''}`}
          onClick={() => switchTab('past')}
        >
          Histórico
        </button>
      </div>

      <main className={styles.main}>
        {groups.length === 0 && (
          <p className={styles.empty}>{emptyMsg}</p>
        )}

        {groups.map(({ key, label, rows }) => (
          <section key={key} className={styles.daySection}>
            <h2 className={styles.dayHeading}>{label}</h2>

            <div className={styles.sessionList}>
              {rows.map(({ booking, session }) => {
                const template = TEMPLATES.find(t => t.id === session.templateId);
                const court = COURTS.find(c => c.id === session.courtId);

                return (
                  <div key={booking.id} className={styles.sessionCard}>
                    <div className={styles.cardInfo}>
                      <span className={styles.cardTime}>{formatTime(session.startsAt)}</span>
                      <span className={styles.cardName}>{template?.name}</span>
                      <span className={styles.cardCourt}>{court?.name}</span>
                    </div>
                    <div className={styles.badgeGroup}>
                      <span className={`${styles.badge} ${STATUS_STYLE[booking.status]}`}>
                        {STATUS_LABEL[booking.status]}
                      </span>
                      {booking.status === 'PRE_CHECKIN_PENDING' && (
                        <span className={styles.preCheckinHint}>
                          Aguardando confirmação do check-in
                        </span>
                      )}
                    </div>
                    {tab === 'upcoming' &&
                      (booking.status === 'RESERVED' || booking.status === 'PRE_CHECKIN_PENDING') && (
                        <button
                          className={styles.cancelBtn}
                          onClick={() => { cancelBooking(booking.id); refresh(); }}
                        >
                          Cancelar reserva
                        </button>
                    )}
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
