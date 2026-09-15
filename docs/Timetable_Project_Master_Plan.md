# AI Timetable Scheduling System — Master Plan
*Working name: STAR (Smart Timetable with Adaptive Reallocation)*
*Last updated: 14 Sep 2026*

---

## 1. Project Decision (History)

Two candidates were evaluated for the final-year project (submission + iTEC competition entry):

- **Project A** — High-concurrency factory–student part-time job platform with AI demand prediction
- **Project B** — AI timetable scheduling system with dynamic room reallocation and 3D campus visualization

**Decision: Project B (Timetable System) — confirmed.**

Reasoning that led here:
- Sole coder in the group — Project B has a lower risk of "teammates can't help" since documentation, real data gathering, and testing are substantial non-coding contributions
- Preference stated for the more technically challenging option, for personal learning and competition strength
- School requires competition entry (iTEC) — technical depth (genuine AI component) scores well
- BKA/PS division overlap confirmed as **allowed** (intentional shared slot, not a clash to avoid) — simplifies one constraint

Project A's technical patterns (concurrency handling, cancellation cascades, sensitive data protection) remain useful reference material but are not being built.

---

## 2. Team & Roles

| Role | Responsibility |
|---|---|
| You (sole coder) | Full technical build — AI engine, reallocation logic, security module, frontend, database |
| Teammate 1 | Gather real school data (classes/rooms/teacher loads), PDPA compliance write-up |
| Teammate 2 | Documentation, literature review, report writing |
| Teammate 3 | UI/UX feedback, pitch deck, demo script rehearsal |

---

## 3. Data Sources

**Coordinator uses ASc Timetable** (commercial free software) for current timetabling. Data sourced from its per-area exports.

### Received so far:
- **Course Listing CSV** — intake group, student count, semester, course code, course name, lecturer, FT/PT flag (messy export with many blank columns; programme info embedded in intake group text, e.g. "BSCS202509 (L6)")
- **Lecturer Allocation CSV** — course code, subject, main lecturer, assisting lecturer, moderator. Notably includes `PT 1` / `PT 2` as placeholder values for unassigned part-time lecturer slots — needs explicit handling in the data model

### Still pending:
- **Classroom data** (capacity, slots, hours) — waiting on coordinator. This is the only remaining blocker before the room-assignment part of the solver can be built.
- Teacher availability/blocking-time — deprioritized for now, will be collected via the new self-service input page instead of admin collection

### Confirmed details:
- Daily window: **8:30–18:30** (10 possible 1-hour slots)
- Each lecturer's actual workload target: **9 hours/day**, flexible start/end depending on assigned classes (e.g. no morning class → can start at 9am) — modeled as a **compactness/gap-minimization soft constraint**, not fixed slots
- **No fixed lunch break** — modeled as a soft constraint: each intake group needs ≥1 free hour roughly midday, not a global blocked slot
- BKA/PS division overlap: **allowed** (not a conflict)

---

## 4. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| AI/Solver engine | Python — Genetic Algorithm or Google OR-Tools CP-SAT | The required "AI calculator" component |
| Frontend | React + Vite + Tailwind | Reuses patterns from prior Ssfoo/Ladybird builds |
| Database | **Supabase (Postgres)** — switched from Firebase | Relational data (subjects/rooms/teachers/slots) fits SQL joins natively; better match for solver's tabular input. Free tier: 500MB DB, 50K MAUs, 5GB egress. **Gotcha:** free projects auto-pause after 7 days idle — mitigate with a scheduled keep-alive ping (e.g. GitHub Actions cron) |
| 3D visualization (Phase 2) | Three.js | Simplified extruded floor plans, not true CAD-based 3D |
| NLP intake layer (stretch) | LLM API (Claude/OpenAI) | Converts free-text constraints ("Room 3 unavailable Tuesday") into structured data |
| Testing | k6 or Artillery | For any load-testing needs |

---

## 5. Cybersecurity Integration (Competition Requirement)

| Feature | Purpose |
|---|---|
| RBAC | Admin / Lecturer / Student roles with strict permission boundaries — who can edit vs. view-only |
| Audit log | Every timetable change logged with actor + timestamp |
| PDPA compliance | Documented in report: data classification, retention period, personal data protection for student schedule data |
| API authentication | Required when pulling real data from school systems |
| Input validation | Especially on the NLP intake layer (prevent injection via free-text constraint entry) |

---

## 6. Phase 1 — First 3 Months (Core Build)

**Goal: a working, demoable timetable system with real AI generation.**

### Features in scope:
1. CSV data import (subjects, lecturer allocation; classroom once received)
2. AI timetable generation (Genetic Algorithm / OR-Tools) — satisfies the mandatory AI requirement
3. Manual edit function (admin override on generated timetable)
4. Export to PDF and Excel
5. **Retake student handling** — example: a student with 3 modules in Sem 2 who failed 1 module in Sem 1 needs to retake it alongside Sem 1 students. System must:
   - Generate a special combined timetable for that student (their Sem 2 modules + the retake module's Sem 1 slot)
   - Produce a namelist per module showing which students need to retake it
6. **Lecturer self-service input page** — lecturers input/confirm their own subject data directly, bypassing the slow admin-collection bottleneck
7. **Part-time teacher self-service availability input** — PT teachers input their own available time blocks (revives the teacher-availability feature via self-input)
8. **Public holiday display** — blocked dates shown in the timetable

### Data flow (flowchart already built):
```
Admin CSV upload ─┐
Lecturer input ────┼─→ Validate & merge data → AI engine (GA/OR-Tools) 
PT teacher input ──┘         │
                              ▼
                    Generated timetable (holidays blocked)
                       │                    │
                       ▼                    ▼
                 Manual edit         Retake timetable (+ namelist)
                       │
                 ┌─────┴─────┐
                 ▼           ▼
            Export PDF   Export Excel
```

### Estimated page count (~10 pages):
| # | Page | Users |
|---|---|---|
| 1 | Login | Everyone |
| 2 | Admin dashboard | Admin |
| 3 | CSV import | Admin |
| 4 | Lecturer self-input | Lecturer |
| 5 | PT teacher availability input | PT teacher |
| 6 | Generate timetable | Admin |
| 7 | Timetable view (by class/intake) | Admin, Lecturer, Student |
| 8 | Timetable view (by teacher) | Lecturer, Admin |
| 9 | Retake student special timetable | Retake student, Admin |
| 10 | Retake namelist (per module) | Lecturer, Admin |
| 11 | Public holiday management | Admin |

*(Manual edit and export are handled as modes/actions on the timetable view, not separate pages.)*

### Build priority order:
1. Login → CSV import → Generate timetable → Timetable view *(core demoable path)*
2. Manual edit toggle
3. Export button
4. Lecturer self-input + PT availability input
5. Retake timetable + namelist
6. Public holiday management

### UI direction:
A reference dashboard design was shared (sidebar nav: Dashboard, Timetable, Classes, Teachers, Rooms, Constraints, AI Scheduler, Reports, Settings; weekly grid view; "Schedule Health" conflict donut; upcoming conflicts panel). Approach: **use it as a visual mood board, not a pixel-perfect spec** — keep the structural patterns (sidebar, color-coded weekly grid, conflict panel) but simplify decorative elements (hero banners, heavy card styling) to protect build time for the solver, which is the higher-value work.

---

## 7. Phase 2 — Next 3 Months (Months 4–6)

**Goal: spatial/dynamic layer on top of the working core system.**

1. **Real-time classroom usage map** — shows which classroom is in use right now, based on the live timetable
2. **Dynamic reallocation** — when a room has an issue (repair/borrowed for activity):
   - Detect affected classes
   - Find replacement rooms meeting the same constraints (capacity, equipment)
   - Re-run conflict check across the entire timetable
   - Auto-notify affected teachers/students
3. **3D campus visualization** (Three.js) — simplified extruded floor plans, color-coded by room status (occupied/free/repair), click to switch/fade floors. *True CAD-based 3D is a stretch goal only if time allows — not core scope.*

---

## 8. Month 7 (Sem Break) — Buffer

- NLP intake layer (if time allows): natural-language constraint entry → LLM extracts structured data
- Explainability output: "Room 5 chosen over Room 8 because: capacity match, no clash, closer building"
- Polish, full testing, demo rehearsal

---

## 9. Full 7-Month Timeline Summary

| Month | Focus |
|---|---|
| 1–2 | Core GA/CP-SAT engine — static timetable generation (AI requirement satisfied here) |
| 3 | Manual edit, export, retake handling, self-service inputs, public holidays *(Phase 1 wraps)* |
| 4 | Dynamic reallocation logic |
| 5 | Security module (RBAC, audit log, PDPA) — can run in parallel |
| 6 | Real-time classroom map + simplified 3D visualization |
| 7 (sem break) | Buffer, NLP layer if time allows, polish, demo rehearsal |

---

## 10. Open Items / Still Waiting

| Item | Status |
|---|---|
| Classroom CSV (capacity, slots, hours) | ⏳ Waiting on coordinator — the one real blocker |
| Wireframe (beyond flow chart) | Not yet started |
| Final project name | Leaning toward **STAR**, not locked in |
| Supabase setup | Not started — new to the team, first-time use |

## 11. What Can Proceed Right Now (Not Blocked)

- CSV importer for Subjects + Lecturer Allocation (real data already in hand)
- Firestore→Supabase schema scaffolding (subjects, intake groups, lecturers)
- Solver skeleton with dummy room data (swap in real data later)
- Wireframes for the core 4-screen path (login → import → generate → timetable view)
