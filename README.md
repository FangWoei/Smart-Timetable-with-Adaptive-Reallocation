# Timetable+

**Smart Timetable with Adaptive Reallocation** — a web app that builds a college timetable automatically, lets staff adjust it by drag and drop, and re-plans classes when a room becomes unavailable.

Final-year project and iTEC competition entry.

## What it does

- **Import** a Course Listing (`.csv` / `.xlsx`). Only the head count per class is read; student names are ignored.
- **Generate** a clash-free weekly timetable with Google OR-Tools CP-SAT (rooms, lecturers, groups, lecturer availability and full-time / part-time hour limits).
- **Adjust** it in the Scheduler: drag lessons between slots, drag them to _Unplaced_ and back, lock a lesson, undo / redo, and view by group, lecturer or room (or all in one timetable).
- **Reallocate** when a room goes to maintenance or out of service: affected classes are moved to other rooms automatically.
- **Calendar** support: semester dates, Malaysian public holidays (synced per state) and custom no-class days, so the weekly plan becomes real dates.
- **Publish and export** the timetable to PDF / Excel. Lecturers can view their own timetable and set availability.
- **Light and dark mode**, and role-based sign-in (admin / lecturer) through Supabase.

## Tech stack

| Layer             | Tools                                                |
| ----------------- | ---------------------------------------------------- |
| Frontend          | React 19, Vite, Tailwind CSS v4, React Router, jsPDF |
| Backend           | Python, FastAPI, OR-Tools CP-SAT                     |
| Database and auth | Supabase (PostgreSQL + Auth)                         |

## Repo layout

```
.
├── frontend/   React app (pages, components, auth, API client)
├── backend/
│   ├── app/        FastAPI routes, auth, exports
│   ├── solver/     CP-SAT engine, checker, room reallocation
│   ├── importer/   Course Listing readers (csv / xlsx)
│   ├── db/         Supabase repository, calendar, users
│   └── tests/      pytest suite
├── db/         SQL migrations
├── docs/       Master plan and solver benchmarks
└── .github/    Issue and PR templates
```

## Getting started

### 1. Clone

```bash
git clone https://github.com/FangWoei/smart-timetable-with-adaptive-reallocation.git
cd smart-timetable-with-adaptive-reallocation
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
```

Copy `backend/.env.example` to `backend/.env` and fill it in:

```
SUPABASE_URL=
SUPABASE_SECRET_KEY=
AUTH_REQUIRED=false
```

Set `AUTH_REQUIRED=true` to enforce sign-in. Then run:

```bash
uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000 (interactive docs at `/docs`).

### 3. Frontend

```bash
cd frontend
npm ci
npm run dev
```

Optional `frontend/.env`:

```
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Without the Supabase values the app runs in development mode with auth off.

### 4. Tests and checks

```bash
cd backend && pytest
cd frontend && npm run lint && npm run build
```

## Contributing

Set the commit template once: `git config commit.template .gitmessage.txt`.
See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch names and commit types.

## Team

| Who       | Role                                                                         |
| --------- | ---------------------------------------------------------------------------- |
| Fang Woei | Backend, scheduling engine, database, security, Frontend and UI (everything) |
| Ze Ling   | Frontend and UI                                                              |
| Yi Jun    | Frontend and UI                                                              |
| Alyssa    | Frontend and UI                                                              |

The full project plan is in [`docs/Timetable_Project_Master_Plan.md`](./docs/Timetable_Project_Master_Plan.md).
