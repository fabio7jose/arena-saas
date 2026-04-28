'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './styles.module.css';
import {
  type Session,
  COURTS,
  TEACHERS,
  TEMPLATES,
  activeBookingCount,
  createInitialSessions,
  createSession,
  getSessionsStore,
  getWeekStart,
} from '../../../../../lib/schedule';

// ─── Constants ───────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21
const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatHour(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

function formatDayDate(weekStart: Date, offset: number) {
  const d = getDayDate(weekStart, offset);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function getDayDate(weekStart: Date, offset: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + offset);
  return d;
}

function getSessionsInCell(
  sessions: Session[],
  weekStart: Date,
  dayOffset: number,
  hour: number,
): Session[] {
  const cellDay = getDayDate(weekStart, dayOffset);
  return sessions.filter(s => {
    const d = new Date(s.startsAt);
    return (
      d.getFullYear() === cellDay.getFullYear() &&
      d.getMonth() === cellDay.getMonth() &&
      d.getDate() === cellDay.getDate() &&
      d.getHours() === hour
    );
  });
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

// ─── Form state ──────────────────────────────────────────────────────────────

interface FormState {
  templateId: string;
  courtId: string;
  teacherId: string;
  date: string;
  startTime: string;
  durationMinutes: string;
}

const emptyForm = (): FormState => ({
  templateId: TEMPLATES[0].id,
  courtId: COURTS[0].id,
  teacherId: TEACHERS[0].id,
  date: todayString(),
  startTime: '08:00',
  durationMinutes: '60',
});

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const params = useParams();
  const tenant = params.tenant as string;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Client-only init to avoid SSR/hydration mismatch with date-based mock data
  useEffect(() => {
    setWeekStart(getWeekStart());
    setSessions(createInitialSessions());
  }, []);

  // Poll for live booking count updates every 1s
  useEffect(() => {
    const id = setInterval(() => setSessions([...getSessionsStore()]), 1000);
    return () => clearInterval(id);
  }, []);

  if (!weekStart) {
    return <div className={styles.loading}>Carregando...</div>;
  }

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

  // ── Modal ──

  function openModal() {
    setForm(emptyForm());
    setFormError(null);
    setShowModal(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = new Date(`${form.date}T${form.startTime}:00`).toISOString();
    const result = createSession(sessions, {
      templateId: form.templateId,
      courtId: form.courtId,
      teacherId: form.teacherId,
      startsAt,
      durationMinutes: Number(form.durationMinutes),
    });
    if ('error' in result) {
      setFormError(result.error);
      return;
    }
    setSessions([...getSessionsStore()]);
    setShowModal(false);
  }

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  // ── Lookup helpers ──

  const tpl = (id: string) => TEMPLATES.find(t => t.id === id);
  const court = (id: string) => COURTS.find(c => c.id === id);
  const todayDate = new Date().toDateString();

  // ── Render ──

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Grade Semanal</h1>
          <span className={styles.tenant}>arena-demo</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.btnSecondary} onClick={() => setWeekStart(getWeekStart())}>
            Hoje
          </button>
          <button className={styles.btnSecondary} onClick={prevWeek}>‹</button>
          <span className={styles.weekLabel}>
            {formatDayDate(weekStart, 0)} – {formatDayDate(weekStart, 6)}
          </span>
          <button className={styles.btnSecondary} onClick={nextWeek}>›</button>
          <button className={styles.btnPrimary} onClick={openModal}>+ Nova Sessão</button>
        </div>
      </header>

      {/* Grid */}
      <div className={styles.gridWrapper}>
        <div className={styles.grid}>
          {/* Corner */}
          <div className={styles.cornerCell} />

          {/* Day headers */}
          {DAY_NAMES.map((name, i) => {
            const d = getDayDate(weekStart, i);
            const isToday = d.toDateString() === todayDate;
            return (
              <div key={i} className={`${styles.dayHeader}${isToday ? ' ' + styles.today : ''}`}>
                <span className={styles.dayName}>{name}</span>
                <span className={styles.dayDate}>{d.getDate()}/{d.getMonth() + 1}</span>
              </div>
            );
          })}

          {/* Time rows */}
          {HOURS.map(hour => (
            <Fragment key={hour}>
              <div className={styles.timeCell}>{formatHour(hour)}</div>
              {Array.from({ length: 7 }, (_, dayOffset) => {
                const cell = getSessionsInCell(sessions, weekStart, dayOffset, hour);
                return (
                  <div key={dayOffset} className={styles.cell}>
                    {cell.map(s => {
                      const template = tpl(s.templateId);
                      const count = activeBookingCount(s.id);
                      const capacity = template?.capacity ?? 0;
                      const isFull = count >= capacity;
                      return (
                        <Link
                          key={s.id}
                          href={`/${tenant}/admin/sessions/${s.id}`}
                          className={`${styles.sessionCard}${isFull ? ' ' + styles.sessionCardFull : ''}`}
                        >
                          <div className={styles.cardTemplate}>
                            {template?.name}
                            {isFull && <span className={styles.lotadoBadge}>Lotado</span>}
                          </div>
                          <div className={styles.cardCourt}>{court(s.courtId)?.name}</div>
                          <div className={styles.cardBookings}>
                            {count}/{capacity} vagas · {s.durationMinutes}min
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* New session modal */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Nova Sessão</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>
                Modelo de aula
                <select className={styles.input} {...field('templateId')}>
                  {TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} — cap. {t.capacity}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.label}>
                Quadra
                <select className={styles.input} {...field('courtId')}>
                  {COURTS.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>

              <label className={styles.label}>
                Professor
                <select className={styles.input} {...field('teacherId')}>
                  {TEACHERS.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>

              <label className={styles.label}>
                Data
                <input
                  type="date"
                  className={styles.input}
                  required
                  {...field('date')}
                />
              </label>

              <label className={styles.label}>
                Horário de início
                <input
                  type="time"
                  className={styles.input}
                  step="1800"
                  required
                  {...field('startTime')}
                />
              </label>

              <label className={styles.label}>
                Duração
                <select className={styles.input} {...field('durationMinutes')}>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </label>

              {formError && <p className={styles.error}>{formError}</p>}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Criar Sessão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
