# SCREENS.md

> Implementation order and vertical slices for Arena SaaS v1.
> Each screen is independently testable and maps to a narrow backend scope.
> Source of truth for build order. Read before planning any implementation task.

---

## Screen index

| ID  | Name                            | Primary role         | Route                                      |
|-----|---------------------------------|----------------------|--------------------------------------------|
| S01 | Login & Auth                    | All                  | `/login`, `/[tenant]/login`                |
| S02 | Arena Setup                     | Owner / Admin        | `/[tenant]/admin/setup`                    |
| S03 | Weekly Schedule                 | Admin / Receptionist | `/[tenant]/admin/schedule`                 |
| S04 | Today's Operations Dashboard    | Admin / Receptionist | `/[tenant]/admin/today`                    |
| S05 | Session Detail & Check-in Panel | Admin / Receptionist | `/[tenant]/admin/sessions/[id]`            |
| S06 | Student List & Profile          | Admin / Receptionist | `/[tenant]/admin/students`, `.../[id]`     |
| S07 | Lead Registration & Trial       | Admin / Receptionist | `/[tenant]/admin/leads/new`                |
| S08 | Teacher: My Day                 | Teacher              | `/[tenant]/teacher/today`                  |
| S09 | Teacher: Attendance Sheet       | Teacher              | `/[tenant]/teacher/sessions/[id]`          |
| S10 | Student: Browse & Book          | Student              | `/[tenant]/book`                           |
| S11 | Student: My Bookings            | Student              | `/[tenant]/my-bookings`                    |
| S12 | Student: Profile & Plan         | Student              | `/[tenant]/my-profile`                     |

---

## S01 — Login & Auth

**Main user role:** All (Admin, Receptionist, Teacher, Student)
**Route:** `/login` → resolves to `/[tenant]/login` after tenant detection

### Why this screen exists
Nothing else works without it. Establishes JWT session, tenant context, and role-based redirects.

### Core UI sections
- Tenant slug auto-detection (from subdomain or URL param)
- Email + password form
- "Forgot password" link → email reset flow
- Magic link / OTP option (students, post-MVP gate for now but route must exist)

### User actions
- Submit email + password → get JWT + refresh token
- Request password reset
- Click reset link from email → set new password

### Required data inputs
- `email`, `password`
- Tenant context (slug from URL)

### Minimum backend endpoints
- `POST /auth/login` — returns `access_token`, `refresh_token`, `user`, `role`, `tenant`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

### Minimum database tables
- `users`, `profiles`, `tenant_memberships`, `auth_sessions`, `password_reset_tokens`

### Mock/seed data needed
- 1 tenant (`slug: arena-demo`)
- 1 admin user (`admin@arena.test` / `senha123`)
- 1 teacher user
- 1 student user

### Manual QA checklist
- [ ] Login with valid credentials → redirected by role (admin → `/today`, teacher → `/teacher/today`, student → `/book`)
- [ ] Login with wrong password → shows error, no redirect
- [ ] Password reset email sent and link works
- [ ] Accessing protected route without token → redirected to login
- [ ] JWT contains correct `tenant_id` and `role`
- [ ] Refresh token rotates on use

### Dependencies
None — this is the root screen.

### Postponed to later
- Magic link / OTP for students
- MFA
- Social login
- WhatsApp OTP

---

## S02 — Arena Setup

**Main user role:** Owner / Admin
**Route:** `/[tenant]/admin/setup`

### Why this screen exists
Without a venue, courts, and at least one class template, no sessions can be created and nothing else can be tested. This is the minimum onboarding screen.

### Core UI sections
- **Venue tab:** Name, address, city, state
- **Courts tab:** List of courts; add/edit court (name, sport type, surface, covered)
- **Class templates tab:** List of templates; add/edit template (name, type, capacity, duration, allowed access channels, pre-check-in required flag)
- **Skill levels tab:** List of levels; add/edit (name, order, description)

### User actions
- Create/edit venue
- Add/edit/deactivate courts
- Add/edit/deactivate class templates
- Define level list

### Required data inputs
- Venue: `name`, `city`, `state`, `address_line`
- Court: `name`, `sport_type`, `surface_type`, `is_covered`, `venue_id`
- Template: `name`, `service_type`, `max_capacity`, `duration_minutes`, `allowed_channels[]`, `requires_precheckin_for_channels[]`
- Level: `name`, `display_order`

### Minimum backend endpoints
- CRUD `/admin/venues`
- CRUD `/admin/courts`
- CRUD `/admin/service-templates`
- CRUD `/admin/skill-levels`

### Minimum database tables
- `tenants`, `tenant_settings`, `venues`, `courts`, `service_templates`, `skill_levels`

### Mock/seed data needed
- Tenant `arena-demo` already created in S01
- After this screen: 1 venue, 2 courts, 2 templates (OPEN_GROUP, TRIAL), 3 levels (Iniciante, Intermediário, Avançado)

### Manual QA checklist
- [ ] Can create a venue
- [ ] Can add 2 courts to that venue
- [ ] Can create an OPEN_GROUP template with capacity 8, duration 60 min
- [ ] Can create a TRIAL template
- [ ] Can define levels with display order
- [ ] All forms validate required fields
- [ ] Deactivated court does not appear in session creation later

### Dependencies
- S01 (auth + tenant context)

### Postponed to later
- Multi-venue management
- Advanced template policies (quota per channel, no-show policy, cancellation window)
- Notification rules per template
- White-label branding

---

## S03 — Weekly Schedule

**Main user role:** Admin / Receptionist
**Route:** `/[tenant]/admin/schedule`

### Why this screen exists
Admins need to create and visualize the class schedule before any student can book. This screen creates sessions (single or recurring) and is the operational calendar.

### Core UI sections
- Week view grid (columns = days, rows = time slots)
- Session cards on the grid (shows template name, court, current bookings / capacity)
- "New session" modal: pick template, court, date/time, recurring options (none / weekly / custom), teacher assignment
- Filter bar: by court, by template, by teacher

### User actions
- Create a single session
- Create a recurring series (weekly, N weeks)
- Click session → opens S05 Session Detail
- Cancel / delete a session

### Required data inputs
- `service_template_id`, `court_id`, `teacher_id`, `starts_at`, `duration_minutes`
- Recurrence: `frequency`, `repeat_until` or `repeat_count`

### Minimum backend endpoints
- `GET /admin/sessions?from=&to=` — list sessions in date range
- `POST /admin/sessions` — create single session
- `POST /admin/session-series` — create recurring series
- `DELETE /admin/sessions/:id`
- `GET /admin/teachers` — for teacher picker

### Minimum database tables
- `class_series`, `class_sessions`, `teachers`

### Mock/seed data needed
- 2 templates, 2 courts, 1 teacher (from S02)
- Create at least 5 sessions across the current week to test the grid

### Manual QA checklist
- [ ] Sessions appear on the correct day/time cells
- [ ] Creating a recurring series generates the correct number of sessions
- [ ] Session card shows capacity (e.g., "0/8")
- [ ] Conflict blocked: same court, overlapping time
- [ ] Deleting one occurrence does not delete the whole series
- [ ] Sessions respect tenant_id isolation

### Dependencies
- S01, S02

### Postponed to later
- Drag-and-drop rescheduling
- Monthly view
- Session template changes propagated to future occurrences
- Teacher conflict detection (same teacher in two overlapping sessions)

---

## S04 — Today's Operations Dashboard

**Main user role:** Admin / Receptionist
**Route:** `/[tenant]/admin/today`

### Why this screen exists
This is the main landing screen for admin/receptionist after login. It gives a real-time operational view of the current day: who needs check-in confirmation, how full each session is, and what still needs action.

### Core UI sections
- **Date header** with quick-jump to other dates
- **Pre-check-in pending list**: cards showing student name, session time, access channel — with a "Confirm" button each
- **Session summary strip**: each session of the day as a card (time, template, court, X confirmed / Y total, teacher name)
- **Quick stats row**: total bookings today, pending check-ins, confirmed, no-shows (from yesterday or closed sessions)

### User actions
- Confirm a pre-check-in directly from the card
- Click a session card → navigates to S05
- Change date to view another day's dashboard

### Required data inputs
- Date (defaults to today)
- Tenant context

### Minimum backend endpoints
- `GET /admin/dashboard/today?date=` — returns sessions + pre-check-in counts + bookings summary
- `POST /admin/bookings/:id/confirm-checkin` — confirms a pending pre-check-in

### Minimum database tables
- `class_sessions`, `bookings`, `booking_checkin_events`, `users`, `profiles`

### Mock/seed data needed
- 3+ sessions today
- 2+ bookings in `PRE_CHECKIN_PENDING` state for different access channels
- 1 session with no bookings (to test empty state)

### Manual QA checklist
- [ ] Pre-check-in list shows only today's pending entries
- [ ] Confirming a check-in removes it from the pending list
- [ ] Session cards show accurate booking counts
- [ ] Clicking a session card opens S05
- [ ] Changing date reloads data correctly
- [ ] Empty state renders gracefully

### Dependencies
- S01, S02, S03

### Postponed to later
- Real-time push updates (WebSocket/SSE)
- Revenue summary widget
- Automated expiry of timed-out pre-check-ins

---

## S05 — Session Detail & Check-in Panel

**Main user role:** Admin / Receptionist
**Route:** `/[tenant]/admin/sessions/[id]`

### Why this screen exists
This is the most operationally critical screen. It shows the full booking list for a session and allows the receptionist to confirm pre-check-ins, add walk-ins, and see who is confirmed vs pending.

### Core UI sections
- **Session header**: date, time, template, court, teacher, status (upcoming / in-progress / closed)
- **Booking list table**: columns — student name, access channel, booking status, check-in action button
  - Status badges: `RESERVED`, `PRE_CHECKIN_PENDING`, `CHECKIN_CONFIRMED`, `ATTENDED`, `NO_SHOW`, `CANCELLED`
- **Waitlist section**: students in queue with their position
- **Add booking button**: quick-add a known student to this session (admin override)
- **Capacity indicator**: X / Y slots filled

### User actions
- Confirm check-in for a `PRE_CHECKIN_PENDING` booking
- Mark a confirmed booking as `NO_SHOW`
- Manually add a student booking (admin-side)
- Cancel a booking
- Promote first waitlist entry

### Required data inputs
- Session ID (from route)
- For manual add: `student_id`, `access_channel`

### Minimum backend endpoints
- `GET /admin/sessions/:id` — session detail with bookings + waitlist
- `POST /admin/bookings/:id/confirm-checkin`
- `POST /admin/bookings/:id/no-show`
- `POST /admin/bookings/:id/cancel`
- `POST /admin/sessions/:id/bookings` — admin creates booking
- `POST /admin/waitlist/:id/promote`

### Minimum database tables
- `bookings`, `booking_checkin_events`, `waitlist_entries`, `students`, `users`, `profiles`

### Mock/seed data needed
- 1 session with:
  - 2 `RESERVED` bookings
  - 1 `PRE_CHECKIN_PENDING` booking (BENEFIT channel)
  - 1 `CHECKIN_CONFIRMED` booking
  - 1 waitlist entry

### Manual QA checklist
- [ ] Booking list renders correct statuses with correct badges
- [ ] "Confirm check-in" updates booking status and adds a checkin event
- [ ] "No show" updates status correctly
- [ ] Manual add creates a booking linked to the session
- [ ] Cancel frees the slot and can promote waitlist
- [ ] Capacity indicator updates after each action
- [ ] Cannot exceed max capacity via manual add

### Dependencies
- S01, S02, S03

### Postponed to later
- QR-code check-in
- Student self check-in via PWA
- Automated waitlist promotion with timeout
- Bulk no-show marking after session ends

---

## S06 — Student List & Profile

**Main user role:** Admin / Receptionist
**Route:** `/[tenant]/admin/students` and `/[tenant]/admin/students/[id]`

### Why this screen exists
Admin needs to search and view students to support daily operations (manual booking, check-in, plan lookup). The profile page is also the conversion destination for leads.

### Core UI sections
**List page:**
- Search bar (name, email, phone)
- Student table: name, email, plan type, status, last seen
- "Add student" button

**Profile page:**
- Personal info section (name, email, phone, birth date)
- Current plan badge (MEMBERSHIP / DROP_IN / none)
- Skill level (self-declared and validated)
- Upcoming bookings
- Attendance history (last 10 sessions)
- Notes/observations from teachers

### User actions
- Search students
- View student profile
- Edit personal info
- Change skill level (validated)
- Create new student (manual registration)

### Required data inputs
- New student: `full_name`, `email`, `phone_e164`, `birth_date` (optional), `skill_level_id`

### Minimum backend endpoints
- `GET /admin/students?search=`
- `GET /admin/students/:id`
- `POST /admin/students`
- `PATCH /admin/students/:id`
- `GET /admin/students/:id/bookings`
- `GET /admin/students/:id/attendance`

### Minimum database tables
- `users`, `profiles`, `students`, `student_level_history`, `tenant_memberships`

### Mock/seed data needed
- 5+ students with varied plans and levels
- At least 1 student with attendance history

### Manual QA checklist
- [ ] Search by name returns correct results
- [ ] Profile page loads all sections
- [ ] Edit saves and reflects changes
- [ ] Attendance history shows correct sessions
- [ ] New student creation sends invite or sets password

### Dependencies
- S01, S02

### Postponed to later
- Student photo upload
- Emergency contact
- Financial history / invoices
- Full attendance analytics

---

## S07 — Lead Registration & Experimental Booking

**Main user role:** Admin / Receptionist
**Route:** `/[tenant]/admin/leads/new`

### Why this screen exists
The first customer's main growth channel is experimental classes replacing WhatsApp. This screen captures a new lead and immediately books them into a TRIAL session, replacing the manual WhatsApp conversation.

### Core UI sections
- **Lead form**: name, email, phone, how did you hear about us (optional), notes
- **Session picker**: date, time — shows only TRIAL-type sessions with available slots
- **Booking confirmation**: shows details before confirming
- **Success state**: lead + booking created, with option to send confirmation via email

### User actions
- Fill lead form
- Pick an available trial session
- Confirm booking
- Send confirmation email (optional)

### Required data inputs
- `full_name`, `email`, `phone_e164`
- `session_id` (selected trial session)
- `access_channel: TRIAL`

### Minimum backend endpoints
- `POST /admin/leads` — creates lead + optionally creates user
- `GET /admin/sessions?type=TRIAL&date=` — available trial sessions
- `POST /admin/leads/:id/book-trial` — creates a TRIAL booking for the lead
- `POST /admin/leads/:id/convert` — converts lead to student (post-trial)

### Minimum database tables
- `leads`, `lead_activities`, `bookings`

### Mock/seed data needed
- At least 2 TRIAL sessions in the next 7 days
- No pre-existing lead to test "new lead" flow

### Manual QA checklist
- [ ] Lead form validates required fields
- [ ] Only TRIAL sessions with open slots appear in picker
- [ ] Booking created with correct `access_channel: TRIAL` and status `RESERVED`
- [ ] Lead appears in a leads list (even if list view is minimal)
- [ ] Existing email → reuse lead, do not duplicate
- [ ] Confirmation email triggered (can be a stub)

### Dependencies
- S01, S02, S03

### Postponed to later
- Lead list & pipeline view
- Lead → student conversion UI on profile
- Source attribution
- Automated follow-up after trial

---

## S08 — Teacher: My Day

**Main user role:** Teacher
**Route:** `/[tenant]/teacher/today`

### Why this screen exists
Teachers need a focused daily view without admin distractions. Shows only their own sessions for the day and gives one-tap access to the attendance sheet.

### Core UI sections
- Date header (today, with arrow to next/previous day)
- Session card list (time, template name, court, confirmed / total students)
- Each card links to S09

### User actions
- View today's sessions
- Navigate to past/future days
- Tap session → open attendance sheet (S09)

### Required data inputs
- Teacher identity (from JWT)
- Date

### Minimum backend endpoints
- `GET /teacher/sessions?date=` — returns sessions assigned to this teacher

### Minimum database tables
- `class_sessions`, `bookings`

### Mock/seed data needed
- Teacher user with 3 sessions today
- At least 1 session with 4+ students

### Manual QA checklist
- [ ] Only this teacher's sessions appear
- [ ] Session cards show accurate counts
- [ ] Navigating dates works
- [ ] Empty state shows correct message ("Sem aulas hoje")

### Dependencies
- S01, S03

### Postponed to later
- Push notification reminders
- Week view for teacher
- Session notes from previous week

---

## S09 — Teacher: Attendance Sheet

**Main user role:** Teacher
**Route:** `/[tenant]/teacher/sessions/[id]`

### Why this screen exists
This is how teacher attendance closes the booking flow. After the class, the teacher marks who attended and who no-showed, and can optionally add observations or suggest level changes.

### Core UI sections
- Session header (time, template, court)
- Student list with one-tap toggle: `ATTENDED` / `NO_SHOW` (default: unresolved)
- Per-student expand: observation text field, level suggestion dropdown
- "Save attendance" button
- Session close confirmation (when all students resolved)

### User actions
- Mark each student as attended or no-show
- Add optional observation per student
- Suggest skill level change per student
- Save attendance (partial saves allowed)
- Close/finalize session attendance

### Required data inputs
- Per student: `attendance_status` (`ATTENDED` | `NO_SHOW`), `observation` (optional), `suggested_level_id` (optional)

### Minimum backend endpoints
- `GET /teacher/sessions/:id/attendance` — session + booking list with current statuses
- `PATCH /teacher/attendance-records/:id` — update single record
- `POST /teacher/sessions/:id/close-attendance` — finalizes the session

### Minimum database tables
- `attendance_records`, `student_level_history`, `bookings`

### Mock/seed data needed
- 1 session in the past with 4 students, mix of confirmed and pre-checkin

### Manual QA checklist
- [ ] All confirmed students appear in the list
- [ ] Toggle marks student correctly
- [ ] Partial save works (come back later and state is preserved)
- [ ] Observation saved correctly
- [ ] Level suggestion creates entry in `student_level_history`
- [ ] Session closure locks the list (read-only after close)
- [ ] Teacher cannot see sessions from another teacher

### Dependencies
- S01, S03, S05

### Postponed to later
- Photo of the group
- Session rating by teacher
- Automated no-show penalty trigger

---

## S10 — Student: Browse & Book

**Main user role:** Student
**Route:** `/[tenant]/book`

### Why this screen exists
This replaces the WhatsApp booking request. Students can see available sessions and self-serve a reservation. This is the student's main interaction point with the product.

### Core UI sections
- **Filter bar**: date (week nav), class type, level filter
- **Session list**: cards showing time, template name, court, teacher, spots left, access channel selector
- **Access channel selector** (inline on card or modal): MEMBERSHIP / DROP_IN / BENEFIT
- **Book confirmation modal**: summary of session + channel + pre-check-in warning if applicable
- **Success state**: booking confirmed or pre-check-in pending with explanation

### User actions
- Browse available sessions
- Select a session
- Choose access channel
- Confirm booking
- View result (confirmed or pre-check-in pending)

### Required data inputs
- `session_id`, `access_channel`

### Minimum backend endpoints
- `GET /student/sessions?from=&to=` — available sessions with slot counts
- `POST /student/bookings` — create booking (returns status: RESERVED or PRE_CHECKIN_PENDING)

### Minimum database tables
- `class_sessions`, `bookings`, `service_templates`

### Mock/seed data needed
- 6+ sessions across the next 7 days
- Mix of full and open sessions to test both states

### Manual QA checklist
- [ ] Only sessions with open slots appear (or show "full" state)
- [ ] Selecting BENEFIT channel creates booking as `PRE_CHECKIN_PENDING`
- [ ] Selecting MEMBERSHIP or DROP_IN creates booking as `RESERVED`
- [ ] Full session shows "Entrar na fila" instead of "Reservar"
- [ ] Student cannot double-book the same session
- [ ] Booking appears in S11 after creation

### Dependencies
- S01, S02, S03

### Postponed to later
- Waitlist join flow
- Credit balance check before DROP_IN booking
- Level eligibility check
- Calendar sync export

---

## S11 — Student: My Bookings

**Main user role:** Student
**Route:** `/[tenant]/my-bookings`

### Why this screen exists
Students need to see their upcoming and past reservations and cancel when needed. Reduces WhatsApp messages asking "what did I book?".

### Core UI sections
- **Upcoming tab**: list of future bookings (date, time, template, court, status badge, cancel button if within window)
- **Past tab**: list of past sessions (date, template, attendance status badge: Presente / Falta / Pendente)
- Status badges: `RESERVED`, `PRE_CHECKIN_PENDING`, `CHECKIN_CONFIRMED`, `ATTENDED`, `NO_SHOW`, `CANCELLED`

### User actions
- View upcoming bookings
- View past attendance
- Cancel a booking (within cancellation window)

### Required data inputs
- None (scoped to logged-in student)

### Minimum backend endpoints
- `GET /student/bookings?upcoming=true`
- `GET /student/bookings?past=true`
- `DELETE /student/bookings/:id` — cancel booking

### Minimum database tables
- `bookings`, `attendance_records`, `class_sessions`

### Mock/seed data needed
- Student with 2 upcoming + 3 past bookings (mix of attended and no-show)

### Manual QA checklist
- [ ] Upcoming tab shows correct sessions
- [ ] Pre-check-in status shows with explanation ("Aguardando confirmação")
- [ ] Past tab shows correct attendance outcomes
- [ ] Cancel button visible only within cancellation window
- [ ] Cancellation removes from upcoming list
- [ ] Student cannot see other students' bookings

### Dependencies
- S01, S10

### Postponed to later
- Cancellation policy enforcement (penalty credits)
- Rebook after cancellation shortcut
- Push notification for booking reminder

---

## S12 — Student: Profile & Plan

**Main user role:** Student
**Route:** `/[tenant]/my-profile`

### Why this screen exists
Students need to see their plan type, remaining credits (if applicable), and their level so they know what they're entitled to book.

### Core UI sections
- **Profile card**: avatar placeholder, name, email, phone
- **Plan section**: plan type badge (Mensalista / Avulso / Sem plano), credit balance if DROP_IN
- **Level section**: self-declared level + validated level if set
- **Edit profile button**: opens form for name, phone, birth date
- **Change password link**

### User actions
- View plan and credit info
- View current skill level
- Edit profile info
- Change password

### Required data inputs
- `full_name`, `phone_e164`, `birth_date` (for edit)
- `current_password`, `new_password` (for password change)

### Minimum backend endpoints
- `GET /student/me` — profile + plan + level
- `PATCH /student/me`
- `POST /auth/change-password`

### Minimum database tables
- `users`, `profiles`, `students`, `student_subscriptions`, `skill_levels`, `student_level_history`

### Mock/seed data needed
- 1 student with MEMBERSHIP plan
- 1 student with DROP_IN credits
- 1 student with no plan

### Manual QA checklist
- [ ] Correct plan shown for each student type
- [ ] Credit balance visible for DROP_IN student
- [ ] Level section shows both self-declared and validated
- [ ] Profile edit saves correctly
- [ ] Password change works and invalidates session

### Dependencies
- S01, S06

### Postponed to later
- Credit purchase flow
- Plan upgrade/renewal
- Full attendance analytics chart
- Photo upload

---

## Recommended implementation order

| Step | Screen | Why at this position                                         |
|------|--------|--------------------------------------------------------------|
| 1    | S03    | Core scheduling; allows immediate data generation and visual feedback. |
| 2    | S05    | Most critical operational screen; manages session attendance. |
| 3    | S04    | Dashboard for daily triage and session monitoring.           |
| 4    | S02    | System configuration for venues, courts, and templates.       |
| 5    | S01    | Authentication and tenant context (can be mocked for earlier).|
| 6    | S06    | Admin-side student management for manual operations.         |
| 7    | S07    | Lead intake; completes the admin surface.                    |
| 8    | S08    | Teacher day view; prerequisite for attendance sheet.         |
| 9    | S09    | Teacher attendance closes the booking lifecycle.             |
| 10   | S10    | Student booking; student surface starts here.                |
| 11   | S11    | Students must see and manage their bookings.                 |
| 12   | S12    | Profile/plan is lowest priority; app is functional without it|

---

## First screen to build

**S03 — Weekly Schedule**

**Why first:**
Starting with core scheduling (creating sessions) allows for immediate data generation and visual feedback on the most complex part of the system (the weekly grid), while auth and setup can be handled with mocks or hardcoded data initially. This prioritizing proves the main product value early on.

---

## Screens strictly required for a clickable v1

These 8 screens form a complete, demonstrable product:

| Screen | Justification                                          |
|--------|--------------------------------------------------------|
| S01    | Without auth nothing works                             |
| S02    | Without setup there is no data to work with            |
| S03    | Without sessions there is nothing to book              |
| S04    | Main admin landing and pre-check-in triage             |
| S05    | Core operational screen — confirms check-ins           |
| S09    | Closes the loop with attendance marking                |
| S10    | Student self-service booking (replaces WhatsApp)       |
| S11    | Student must see and manage their bookings             |

Screens S06, S07, S08, S12 are valuable but the product is demonstrable without them.

---

## Screens by role

### Admin-only (Owner + Admin + Receptionist)
- S02 — Arena Setup
- S03 — Weekly Schedule
- S04 — Today's Operations Dashboard
- S05 — Session Detail & Check-in Panel
- S06 — Student List & Profile
- S07 — Lead Registration & Experimental Booking

### Teacher-only
- S08 — Teacher: My Day
- S09 — Teacher: Attendance Sheet

### Student-only
- S10 — Student: Browse & Book
- S11 — Student: My Bookings
- S12 — Student: Profile & Plan

### All roles
- S01 — Login & Auth
