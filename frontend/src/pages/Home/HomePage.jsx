import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api.js";

const fmt = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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
      <section className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs text-ink-3">
              {d.semester
                ? `${d.semester.name} · ${fmt(d.semester.start_date)} to ${fmt(d.semester.end_date)}`
                : "No semester dates yet. Set them on Import data."}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-heading">
              Build the semester in one sitting.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-3">
              Set the constraints once, let the scheduler place every class,
              then review what it could not solve on its own.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/group-view"
                className="rounded bg-navy-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-900">
                Generate timetable
              </Link>
              <Link
                to="/group-view"
                className="rounded border border-line-strong px-5 py-2.5 text-[13px] text-ink-2 hover:bg-panel">
                Review conflicts
              </Link>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-md border border-line bg-panel p-4">
            <div className="grid grid-cols-5 gap-1.5" aria-hidden>
              {Array.from({ length: 25 }, (_, i) => (
                <span
                  key={i}
                  className={`h-6 rounded-[2px] ${[1, 2, 6, 8, 12, 13, 17, 19, 22].includes(i) ? "bg-navy-200" : "bg-surface"} ${i === 13 ? "!bg-danger/30" : ""}`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">
              {placed == null
                ? "No timetable yet"
                : `${placed} sessions placed · ${unplaced ?? 0} left to place`}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-8 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="flex flex-col rounded-md border border-line bg-surface p-4">
            <span className="text-xs text-ink-3">{s.label}</span>
            <span
              className={`mt-1 text-3xl font-bold ${s.danger ? "text-danger" : "text-heading"}`}>
              {s.value}
            </span>
            <span className="mt-1 text-xs text-ink-4">{s.note}</span>
            <Link
              to={s.to}
              className="mt-4 text-xs font-medium text-navy-700 hover:underline">
              {s.cta} →
            </Link>
          </div>
        ))}
      </section>
    </div>
  );
}
