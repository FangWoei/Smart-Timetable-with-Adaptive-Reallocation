# STAR — Smart Timetable with Adaptive Reallocation

AI-powered timetable scheduling system with dynamic room reallocation and 3D campus visualization. Final-year project + iTEC competition entry.

## Repo layout (monorepo)

```
star/
├── frontend/     React + Vite + Tailwind
├── solver/       Python — GA / OR-Tools CP-SAT scheduling engine
├── docs/         Master plan, wireframes, data dictionaries, report drafts
└── .github/      Issue & PR templates
```

## Getting started

1. Clone the repo:
   ```bash
   git clone https://github.com/FangWoei/star.git
   cd star
   ```
2. Set the commit message template (one-time, per teammate):
   ```bash
   git config commit.template .gitmessage.txt
   ```
   This makes `git commit` (no `-m`) open your editor with a template that prompts you to pick a type and write a message.
3. See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch naming and commit conventions before you push.

## Team roles

| Role | Responsibility |
|---|---|
| F_Woei (sole coder) | Full technical build — AI engine, reallocation logic, security module, frontend, database |
| Teammate 1 | Real school data gathering, PDPA compliance write-up |
| Teammate 2 | Documentation, literature review, report writing |
| Teammate 3 | UI/UX feedback, pitch deck, demo script rehearsal |

Full project plan lives in `docs/Timetable_Project_Master_Plan.md`.
