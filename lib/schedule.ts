// ─── Types ────────────────────────────────────────────────────────────────────

export type Court    = { id: string; name: string };
export type Teacher  = { id: string; name: string };
export type Template = { id: string; name: string; capacity: number; durationMinutes: number };

export type Session = {
  id: string;
  templateId: string;
  courtId: string;
  teacherId: string;
  startsAt: string; // ISO 8601
  durationMinutes: number;
  bookings: number; // mocked count (kept for S03 grid display)
};

export type BookingStatus =
  | 'RESERVED'
  | 'PRE_CHECKIN_PENDING'
  | 'CHECKIN_CONFIRMED'
  | 'ATTENDED'
  | 'NO_SHOW'
  | 'CANCELLED';

export type AccessChannel = 'MEMBERSHIP' | 'DROP_IN' | 'BENEFIT' | 'TRIAL';

export type Booking = {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  accessChannel: AccessChannel;
  status: BookingStatus;
};

// ─── Reference data (mock) ────────────────────────────────────────────────────

export const COURTS: Court[] = [
  { id: 'q1', name: 'Quadra 1' },
  { id: 'q2', name: 'Quadra 2' },
];

export const TEACHERS: Teacher[] = [
  { id: 't1', name: 'Professor João' },
];

export const TEMPLATES: Template[] = [
  { id: 'tpl1', name: 'Treino Aberto', capacity: 8, durationMinutes: 60 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getWeekStart(from = new Date()): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function makeAt(weekStart: Date, dayOffset: number, hour: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ─── Sessions store ───────────────────────────────────────────────────────────
// globalThis ensures a single instance even across code-split chunks.

type ArenaGlobal = {
  __arenaSessions?: Session[];
  __arenaBookings?: Booking[];
};
const _g = globalThis as unknown as ArenaGlobal;

function buildInitialSessions(): Session[] {
  const ws = getWeekStart();
  return [
    { id: 's1', templateId: 'tpl1', courtId: 'q1', teacherId: 't1', startsAt: makeAt(ws, 0, 8),  durationMinutes: 60, bookings: 5 }, // Mon 08:00 Q1
    { id: 's2', templateId: 'tpl1', courtId: 'q2', teacherId: 't1', startsAt: makeAt(ws, 0, 9),  durationMinutes: 60, bookings: 3 }, // Mon 09:00 Q2
    { id: 's3', templateId: 'tpl1', courtId: 'q1', teacherId: 't1', startsAt: makeAt(ws, 2, 10), durationMinutes: 60, bookings: 7 }, // Wed 10:00 Q1
    { id: 's4', templateId: 'tpl1', courtId: 'q2', teacherId: 't1', startsAt: makeAt(ws, 3, 8),  durationMinutes: 60, bookings: 2 }, // Thu 08:00 Q2
    { id: 's5', templateId: 'tpl1', courtId: 'q1', teacherId: 't1', startsAt: makeAt(ws, 4, 17), durationMinutes: 60, bookings: 6 }, // Fri 17:00 Q1
  ];
}

/** Returns the shared in-memory sessions array. Initialised lazily on first call. */
export function getSessionsStore(): Session[] {
  if (!_g.__arenaSessions) _g.__arenaSessions = buildInitialSessions();
  return _g.__arenaSessions;
}

/** Kept for backward compatibility with existing S03 usage. */
export function createInitialSessions(): Session[] {
  return getSessionsStore();
}

/** Adds a newly created session to the shared store. */
export function addSession(session: Session): void {
  getSessionsStore().push(session);
}

export function getSessionById(id: string): Session | undefined {
  return getSessionsStore().find(s => s.id === id);
}

// ─── Conflict detection & session creation ────────────────────────────────────

export function hasConflict(
  sessions: Session[],
  courtId: string,
  startsAt: string,
  durationMinutes: number,
): boolean {
  const newStart = new Date(startsAt).getTime();
  const newEnd = newStart + durationMinutes * 60_000;

  return sessions
    .filter(s => s.courtId === courtId)
    .some(s => {
      const sStart = new Date(s.startsAt).getTime();
      const sEnd = sStart + s.durationMinutes * 60_000;
      return newStart < sEnd && newEnd > sStart;
    });
}

type CreateInput = Omit<Session, 'id' | 'bookings'>;

export function createSession(
  sessions: Session[],
  data: CreateInput,
): { session: Session } | { error: string } {
  if (hasConflict(sessions, data.courtId, data.startsAt, data.durationMinutes)) {
    const court = COURTS.find(c => c.id === data.courtId);
    return { error: `Conflito de horário: ${court?.name ?? data.courtId} já tem uma sessão nesse horário.` };
  }
  const session: Session = { ...data, id: `s${Date.now()}`, bookings: 0 };
  addSession(session);
  return { session };
}

// ─── Mock student identity (single source of truth) ──────────────────────────

export const MOCK_STUDENT_ID   = 'student-demo';
export const MOCK_STUDENT_NAME = 'Aluno Demo';

// ─── Bookings store ───────────────────────────────────────────────────────────
// globalThis ensures one array instance across all code-split chunks.
// Mutations from S10 (studentBook) are immediately visible to S11 (polling).

if (!_g.__arenaBookings) {
  _g.__arenaBookings = [
    // s1 — Mon 08:00 Q1 — 5 bookings
    { id: 'b1',  sessionId: 's1', studentId: 'u-ana',      studentName: 'Ana Costa',        accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b2',  sessionId: 's1', studentId: 'u-bruno',    studentName: 'Bruno Lima',       accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b3',  sessionId: 's1', studentId: 'u-carla',    studentName: 'Carla Melo',       accessChannel: 'BENEFIT',    status: 'PRE_CHECKIN_PENDING' },
    { id: 'b4',  sessionId: 's1', studentId: 'u-diego',    studentName: 'Diego Souza',      accessChannel: 'MEMBERSHIP', status: 'CHECKIN_CONFIRMED' },
    { id: 'b5',  sessionId: 's1', studentId: 'u-elena',    studentName: 'Elena Martins',    accessChannel: 'DROP_IN',    status: 'ATTENDED' },
    // s2 — Mon 09:00 Q2 — 3 bookings
    { id: 'b6',  sessionId: 's2', studentId: 'u-felipe',   studentName: 'Felipe Rocha',     accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b7',  sessionId: 's2', studentId: 'u-giovana',  studentName: 'Giovana Dias',     accessChannel: 'MEMBERSHIP', status: 'CHECKIN_CONFIRMED' },
    { id: 'b8',  sessionId: 's2', studentId: 'u-henrique', studentName: 'Henrique Neto',    accessChannel: 'BENEFIT',    status: 'PRE_CHECKIN_PENDING' },
    // s3 — Wed 10:00 Q1 — 7 bookings
    { id: 'b9',  sessionId: 's3', studentId: 'u-isabela',  studentName: 'Isabela Alves',    accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b10', sessionId: 's3', studentId: 'u-joao',     studentName: 'João Ferreira',    accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b11', sessionId: 's3', studentId: 'u-karina',   studentName: 'Karina Pinto',     accessChannel: 'BENEFIT',    status: 'PRE_CHECKIN_PENDING' },
    { id: 'b12', sessionId: 's3', studentId: 'u-lucas',    studentName: 'Lucas Barbosa',    accessChannel: 'MEMBERSHIP', status: 'CHECKIN_CONFIRMED' },
    { id: 'b13', sessionId: 's3', studentId: 'u-mariana',  studentName: 'Mariana Castro',   accessChannel: 'DROP_IN',    status: 'RESERVED' },
    { id: 'b14', sessionId: 's3', studentId: 'u-nicolas',  studentName: 'Nicolas Teixeira', accessChannel: 'MEMBERSHIP', status: 'ATTENDED' },
    { id: 'b15', sessionId: 's3', studentId: 'u-olivia',   studentName: 'Olivia Santos',    accessChannel: 'MEMBERSHIP', status: 'NO_SHOW' },
    // s4 — Thu 08:00 Q2 — 2 bookings
    { id: 'b16', sessionId: 's4', studentId: 'u-paulo',    studentName: 'Paulo Gomes',      accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b17', sessionId: 's4', studentId: 'u-rafaela',  studentName: 'Rafaela Cunha',    accessChannel: 'DROP_IN',    status: 'RESERVED' },
    // s5 — Fri 17:00 Q1 — 6 bookings
    { id: 'b18', sessionId: 's5', studentId: 'u-sergio',   studentName: 'Sérgio Mendes',    accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b19', sessionId: 's5', studentId: 'u-tatiane',  studentName: 'Tatiane Ribeiro',  accessChannel: 'MEMBERSHIP', status: 'CHECKIN_CONFIRMED' },
    { id: 'b20', sessionId: 's5', studentId: 'u-ulisses',  studentName: 'Ulisses Campos',   accessChannel: 'BENEFIT',    status: 'PRE_CHECKIN_PENDING' },
    { id: 'b21', sessionId: 's5', studentId: 'u-vanessa',  studentName: 'Vanessa Moura',    accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    { id: 'b22', sessionId: 's5', studentId: 'u-wagner',   studentName: 'Wagner Lopes',     accessChannel: 'DROP_IN',    status: 'CHECKIN_CONFIRMED' },
    { id: 'b23', sessionId: 's5', studentId: 'u-ximena',   studentName: 'Ximena Freitas',   accessChannel: 'MEMBERSHIP', status: 'RESERVED' },
    // No bookings for MOCK_STUDENT_ID — must be created via S10
  ];
}

/** The shared bookings array. All mutations must happen in place (push / property assignment). */
export const MOCK_BOOKINGS: Booking[] = _g.__arenaBookings!;

export function getBookingsForSession(sessionId: string): Booking[] {
  return MOCK_BOOKINGS.filter(b => b.sessionId === sessionId);
}

/** Confirms check-in for a RESERVED or PRE_CHECKIN_PENDING booking. Mutates in place. */
export function confirmCheckin(bookingId: string): void {
  const b = MOCK_BOOKINGS.find(b => b.id === bookingId);
  if (b && (b.status === 'RESERVED' || b.status === 'PRE_CHECKIN_PENDING')) b.status = 'CHECKIN_CONFIRMED';
}

/** Marks a CHECKIN_CONFIRMED, RESERVED, or PRE_CHECKIN_PENDING booking as NO_SHOW. Mutates in place. */
export function markNoShow(bookingId: string): void {
  const b = MOCK_BOOKINGS.find(b => b.id === bookingId);
  if (b && (b.status === 'CHECKIN_CONFIRMED' || b.status === 'RESERVED' || b.status === 'PRE_CHECKIN_PENDING')) b.status = 'NO_SHOW';
}

/** Marks a CHECKIN_CONFIRMED booking as ATTENDED. Mutates in place. */
export function markAttended(bookingId: string): void {
  const b = MOCK_BOOKINGS.find(b => b.id === bookingId);
  if (b && b.status === 'CHECKIN_CONFIRMED') b.status = 'ATTENDED';
}

/** Returns active (non-cancelled) booking count for a session. */
export function activeBookingCount(sessionId: string): number {
  return MOCK_BOOKINGS.filter(b => b.sessionId === sessionId && b.status !== 'CANCELLED').length;
}

/** Creates a student booking. Returns error string or the new Booking. */
export function studentBook(
  sessionId: string,
  studentId: string,
  studentName: string,
  channel: 'MEMBERSHIP' | 'BENEFIT' = 'MEMBERSHIP',
): { booking: Booking } | { error: string } {
  const session = getSessionById(sessionId);
  if (!session) return { error: 'Sessão não encontrada.' };

  const duplicate = MOCK_BOOKINGS.find(
    b => b.sessionId === sessionId && b.studentId === studentId && b.status !== 'CANCELLED',
  );
  if (duplicate) return { error: 'duplicate' };

  const template = TEMPLATES.find(t => t.id === session.templateId);
  const capacity = template?.capacity ?? 0;
  if (activeBookingCount(sessionId) >= capacity) return { error: 'full' };

  const booking: Booking = {
    id: `b${Date.now()}`,
    sessionId,
    studentId,
    studentName,
    accessChannel: channel,
    status: channel === 'BENEFIT' ? 'PRE_CHECKIN_PENDING' : 'RESERVED',
  };
  MOCK_BOOKINGS.push(booking);
  return { booking };
}
