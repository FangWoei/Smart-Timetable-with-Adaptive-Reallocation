import { useCallback, useEffect, useState } from "react";
import { api, toGridGroups } from "../../api";
import TimetableGrid from "../../components/TimetableGrid.jsx";
import Sidebar from "./Sidebar.jsx";
import Toolbar from "./Toolbar.jsx";

export default function GroupViewPage() {
  const [view, setView] = useState("group");
  const [groups, setGroups] = useState([]);
  const [run, setRun] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [timetable, meta] = await Promise.all([
        api.getTimetable(),
        api.getGroups(),
      ]);
      const counts = Object.fromEntries(
        meta.map((g) => [g.code, g.student_count]),
      );
      const rows = toGridGroups(timetable, counts);
      setError("");
      setGroups(rows);
      setRun(timetable.run);
      setSelectedId((id) => id ?? rows[0]?.id ?? null);
    } catch (e) {
      setError(e.message);
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  
  async function handleGenerate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api.generate();
      setMessage(
        `Run #${r.run_id} · ${r.status} · penalty ${r.penalty} · ${r.seconds}s`,
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const entries = groups.flatMap((g) =>
        g.lessons.map((l) => ({
          lesson_id: l.code,
          room: l.room,
          day: l.day + 1,
          start_slot: l.period,
        })),
      );
      const seen = new Set();
      const unique = entries.filter((e) =>
        seen.has(e.lesson_id) ? false : seen.add(e.lesson_id),
      );
      const r = await api.check(unique);
      setMessage(
        r.valid
          ? "No conflicts found."
          : `${r.problems.length} problems: ${r.problems[0]}`,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const sessions = new Set(
    groups.flatMap((g) =>
      g.lessons.map((l) => `${l.code}-${l.day}-${l.period}`),
    ),
  ).size;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar
        view={view}
        onViewChange={setView}
        onGenerate={handleGenerate}
        onVerify={handleVerify}
        onApprove={() => {}}
        canApprove={false}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          groups={groups}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <main className="min-w-0 flex-1 overflow-auto p-3">
          <div className="mb-2 flex items-center gap-4">
            <h1 className="text-[15px] font-semibold text-ink">
              {groups.length} groups · {sessions} sessions
            </h1>
            {run && (
              <p className="text-xs text-ink-3">
                Run #{run.id} · {run.status} · penalty {run.penalty}
              </p>
            )}
            {busy && <p className="text-xs text-ink-3">Working…</p>}
            {message && (
              <p className="text-xs font-medium text-navy-700">{message}</p>
            )}
            {error && (
              <p className="text-xs font-medium text-danger">{error}</p>
            )}

            <div className="ml-auto flex items-center rounded border border-line bg-white text-[13px] text-ink-2">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(70, z - 10))}
                className="px-2.5 py-0.5 hover:bg-panel">
                −
              </button>
              <span className="w-11 text-center text-[11px] text-ink-3">
                {zoom}%
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(160, z + 10))}
                className="px-2.5 py-0.5 hover:bg-panel">
                +
              </button>
            </div>
          </div>

          {groups.length === 0 && !error ? (
            <p className="p-8 text-center text-sm text-ink-4">
              No timetable yet — import a course listing, then click Generate.
            </p>
          ) : (
            <TimetableGrid
              groups={groups}
              selectedId={selectedId}
              onSelect={setSelectedId}
              zoom={zoom}
            />
          )}
        </main>
      </div>
    </div>
  );
}
