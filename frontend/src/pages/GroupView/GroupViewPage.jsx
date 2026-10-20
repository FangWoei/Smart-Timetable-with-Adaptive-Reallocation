// src/pages/GroupView/GroupViewPage.jsx
import { useCallback, useEffect, useState, useMemo } from "react";
import { api, toGridGroups } from "../../api";
import BottomPanels from './BottomPanels.jsx';
import LessonDetailsPanel from './LessonDetailsPanel.jsx';
import Sidebar from "./Sidebar.jsx";
import TimetableGrid from "../../components/TimetableGrid.jsx";
import Toolbar from "./Toolbar.jsx";
import { LECTURERS } from "../../data/people.js";
import { RESOURCES } from "../../data/timetable.js";

export default function GroupViewPage() {
  const [view, setView] = useState("group");
  const [groups, setGroups] = useState([]);
  const [run, setRun] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedLessonData, setSelectedLessonData] = useState(null);

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

  // 根据当前选择的 view（group / lecturer / room）转换出对应的网格行数据
  const displayRows = useMemo(() => {
    if (view === 'group') {
      return groups;
    }
    
    if (view === 'lecturer') {
      const lecturerMap = {};
      LECTURERS.forEach(lec => {
        lecturerMap[lec.name] = {
          id: lec.name,
          title: lec.email,
          lessons: []
        };
      });

      groups.forEach(group => {
        group.lessons?.forEach(lesson => {
          const lecName = lesson.lecturer;
          if (lecName) {
            if (!lecturerMap[lecName]) {
              lecturerMap[lecName] = { id: lecName, title: 'Lecturer', lessons: [] };
            }
            lecturerMap[lecName].lessons.push({
              ...lesson,
              code: `${lesson.code || lesson.name} (${group.id})`
            });
          }
        });
      });

      return Object.values(lecturerMap);
    }

    if (view === 'room') {
      const roomMap = {};
      
      groups.forEach(group => {
        group.lessons?.forEach(lesson => {
          const roomName = lesson.room || 'Unassigned Room';
          if (!roomMap[roomName]) {
            roomMap[roomName] = { id: roomName, title: 'Campus Facility', lessons: [] };
          }
          roomMap[roomName].lessons.push({
            ...lesson,
            code: `${lesson.code || lesson.name} · ${group.id}`
          });
        });
      });

      return Object.values(roomMap);
    }

    return groups;
  }, [view, groups]);

  useEffect(() => {
    if (displayRows.length > 0) {
      setSelectedId(displayRows[0].id);
    }
  }, [view, displayRows]);

  const sessions = new Set(
    groups.flatMap((g) =>
      g.lessons.map((l) => `${l.code}-${l.day}-${l.period}`),
    ),
  ).size;

  const conflicts = groups.reduce((n, g) => n + g.lessons.filter((l) => l.conflict).length, 0);
  const placedLessonsCount = 42; 
  const totalLessonsCount = 45;

  const selectedGroup = selectedLessonData 
    ? displayRows.find(g => g.id === selectedLessonData.groupId) 
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col relative">
      <Toolbar
        view={view}
        onViewChange={(newView) => {
          setView(newView);
          setSelectedLessonData(null);
        }}
        onGenerate={handleGenerate}
        onVerify={handleVerify}
        onApprove={() => {}}
        canApprove={conflicts === 0}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
        <Sidebar
  groups={displayRows}
  selectedId={selectedId}
  onSelect={setSelectedId}
  view={view}
/>

        <main className="min-w-0 flex-1 flex flex-col overflow-hidden bg-canvas">
          <div className="px-4 pt-3 pb-2 flex shrink-0 items-center gap-4 bg-canvas z-10 border-b border-transparent">
            <h1 className="text-[15px] font-semibold text-ink">
              {view === 'group' ? `${groups.length} groups` : view === 'lecturer' ? `${displayRows.length} lecturers` : `${displayRows.length} rooms`} · {sessions} sessions
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

          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {displayRows.length === 0 && !error ? (
              <p className="p-8 text-center text-sm text-ink-4">
                No timetable data available for this view.
              </p>
            ) : (
              <>
                <TimetableGrid
                  groups={displayRows}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  zoom={zoom}
                  selectedLesson={selectedLessonData}
                  onLessonSelect={setSelectedLessonData}
                />
                <BottomPanels />
              </>
            )}
          </div>
        </main>

        {selectedLessonData && selectedGroup && (
          <LessonDetailsPanel 
            lesson={selectedLessonData.lesson} 
            group={selectedGroup}
            onClose={() => setSelectedLessonData(null)} 
          />
        )}
      </div>

      <footer className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-between border-t border-line-strong bg-[#E8EDF4] px-4 text-[11px] text-ink-3 z-20">
        <div className="flex items-center gap-4">
          <span className="text-ink">{placedLessonsCount} of {totalLessonsCount} lessons placed</span>
          <span className="flex items-center gap-1.5 font-medium text-danger">
            <span className="size-1.5 rounded-full bg-danger"></span>
            {conflicts} conflicts
          </span>
          <span className="flex items-center gap-1.5 font-medium text-warn">
            <span className="size-1.5 rounded-full bg-warn"></span>
            1 soft warning
          </span>
        </div>
        <div className="flex items-center gap-4">
           <span>Last generated 09:42 · 4.2s · 31 constraints checked</span>
        </div>
        <div className="font-medium"></div>
      </footer>
    </div>
  );
}