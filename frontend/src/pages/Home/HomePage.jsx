import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

// Same campus photo as the login page. If it cannot load, the dark blue behind it shows.
const CAMPUS_IMAGE =
  "https://cdn.eduadvisor.my/university/gallery/2025/04/gallery-peninsula-the-ship-01.webp";

const fmt = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const Arrow = () => (
  <svg
    className="h-4 w-4 transition-transform group-hover:translate-x-1"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true">
    <path
      d="M5 12h14m-6-6 6 6-6 6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// The order people usually work in
const STEPS = [
  {
    n: 1,
    title: "Import data",
    text: "Course listing + semester dates",
    to: "/import",
  },
  {
    n: 2,
    title: "Set holidays",
    text: "Days when classes do not run",
    to: "/holidays",
  },
  {
    n: 3,
    title: "Generate",
    text: "Let the scheduler place every class",
    to: "/group-view",
  },
  {
    n: 4,
    title: "Review & publish",
    text: "Fix leftovers, then publish",
    to: "/group-view",
  },
];

export default function HomePage() {
  const [d, setD] = useState({
    semester: null,
    groups: null,
    lecturers: null,
    rooms: null,
    tt: null,
  });

  useEffect(() => {
    const safe = (p) => p.catch(() => null);
    Promise.all([
      safe(api.getSemesters()),
      safe(api.getGroups()),
      safe(api.getLecturers()),
      safe(api.getRooms()),
      safe(api.getTimetable()),
    ]).then(([sems, groups, lecturers, rooms, tt]) =>
      setD({
        semester: (sems ?? []).find((x) => x.is_active) ?? null,
        groups,
        lecturers,
        rooms,
        tt,
      }),
    );
  }, []);

  const n = (v) => (v == null ? "–" : String(v));
  const placed = d.tt?.entries?.length ?? null;
  const unplaced = d.tt?.unplaced?.length ?? null;
  const rooms = (d.rooms ?? []).filter((r) => !r.is_deleted);
  const STATS = [
    {
      label: "Intake groups",
      value: n(d.groups?.length),
      note: "imported from the course listing",
      to: "/import",
      cta: "Import data",
    },
    {
      label: "Lecturers",
      value: n(d.lecturers?.length),
      note: d.lecturers
        ? `${d.lecturers.filter((l) => l.is_part_time).length} part-time`
        : "not loaded",
      to: "/people",
      cta: "Manage lecturers",
    },
    {
      label: "Classrooms",
      value: n(d.rooms ? rooms.length : null),
      note: d.rooms
        ? `${rooms.filter((r) => r.status && r.status !== "available").length} unavailable`
        : "not loaded",
      to: "/people",
      cta: "Manage rooms",
    },
    {
      label: "Unplaced lessons",
      value: n(unplaced),
      note: placed == null ? "no timetable yet" : `${placed} sessions placed`,
      to: "/group-view",
      cta: "Open Scheduler",
      danger: unplaced > 0,
    },
  ];

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      {/* Hero: campus photo, always dark so the white text reads in light and dark mode */}
      <section className="relative isolate overflow-hidden bg-[#0b2948] text-white">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${CAMPUS_IMAGE}")` }}
          role="img"
          aria-label="The Ship Campus at Batu Kawan, Penang"
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#071a30]/92 via-[#0b2948]/75 to-[#0b2948]/40" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#06172b]/85 via-transparent to-[#06172b]/25" />

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-8 pb-28 pt-14 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#eff6ff] backdrop-blur-md sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.9)]" />
              {d.semester
                ? `${d.semester.name} · ${fmt(d.semester.start_date)} to ${fmt(d.semester.end_date)}`
                : "No semester dates yet · set them on Import data"}
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Build the semester
              <br />
              <span className="text-sky-200">in one sitting.</span>
            </h1>
            <p className="mt-6 max-w-lg text-sm leading-7 text-[#eff6ff]/85 sm:text-base sm:leading-8">
              Set the constraints once, let the scheduler place every class,
              then review what it could not solve on its own.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/group-view"
                className="group flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0b2948] shadow-lg transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
                Generate timetable
                <Arrow />
              </Link>
              <Link
                to="/group-view"
                className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20">
                Review conflicts
              </Link>
            </div>
            <div className="mt-9 hidden items-center gap-3 text-xs font-medium tracking-wide text-white/75 sm:flex">
              <span className="h-px w-10 bg-sky-200/70" />
              SMART TIMETABLE WITH ADAPTIVE REALLOCATION
            </div>
          </div>

          {/* Small picture of a week with a few classes placed */}
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-5 shadow-2xl backdrop-blur-md">
            <div className="grid grid-cols-5 gap-1.5" aria-hidden>
              {Array.from({ length: 25 }, (_, i) => (
                <span
                  key={i}
                  className={`h-6 rounded-[3px] ${
                    i === 13
                      ? "bg-rose-400/70"
                      : [1, 2, 6, 8, 12, 17, 19, 22].includes(i)
                        ? "bg-sky-300/60"
                        : "bg-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-white/80">
              {placed == null
                ? "No timetable yet"
                : `${placed} sessions placed · ${unplaced ?? 0} left to place`}
            </p>
          </div>
        </div>
      </section>

      {/* Numbers: overlap the bottom of the photo */}
      <section className="relative z-10 mx-auto -mt-14 grid max-w-6xl gap-4 px-8 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="group flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-lg shadow-navy-900/10 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl">
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              {s.label}
            </span>
            <span
              className={`mt-2 text-4xl font-bold tracking-tight ${s.danger ? "text-danger" : "text-heading"}`}>
              {s.value}
            </span>
            <span className="mt-1 text-xs text-ink-4">{s.note}</span>
            <Link
              to={s.to}
              className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:underline">
              {s.cta}
              <Arrow />
            </Link>
          </div>
        ))}
      </section>

      {/* How to use it, in order */}
      <section className="mx-auto max-w-6xl px-8 pb-12 pt-10">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-navy-700">
          How it works
        </p>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Link
                to={s.to}
                className="flex h-full items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-sm font-bold text-navy-700">
                  {s.n}
                </span>
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-ink-3">
                    {s.text}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
