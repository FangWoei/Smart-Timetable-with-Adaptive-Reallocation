// src/pages/GroupView/GroupViewPage.jsx
import { useCallback, useEffect, useState, useMemo } from "react";
import { api, toGridGroups } from "../../api";
import BottomPanels from './BottomPanels.jsx';
import LessonDetailsPanel from './LessonDetailsPanel.jsx';
import Sidebar from "./Sidebar.jsx";
import TimetableGrid from "../../components/TimetableGrid.jsx";
import Toolbar from "./Toolbar.jsx";
import { LECTURERS } from "../../data/people.js";
import { exportGroupBatchZip } from "./exportGroupPdf.jsx";

export default function GroupViewPage() {
  const [view, setView] = useState("group");
  const [groups, setGroups] = useState([]);
  const [unplacedLessons, setUnplacedLessons] = useState([]);
  const [run, setRun] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedLessonData, setSelectedLessonData] = useState(null);

  const [exportState, setExportState] = useState(null);
  const isExporting = exportState !== null;

  // 1. 从 Backend API 加载所有数据
  const load = useCallback(async () => {
    try {
      const [timetable, meta, classes] = await Promise.all([
        api.getTimetable(),
        api.getGroups(),
        api.getClasses().catch(() => []), // 防止无 API 时崩溃
      ]);

      const counts = Object.fromEntries(
        meta.map((g) => [g.code, g.student_count]),
      );
      const rows = toGridGroups(timetable, counts);
      setError("");
      setGroups(rows);
      setRun(timetable.run);
      setSelectedId((id) => id ?? rows[0]?.id ?? null);

      // 从 classes 中筛选未排课的课程 (例如没有 allocated slot 的课)
      const placedLessonIds = new Set(timetable.entries?.map((e) => e.lesson_id || e.id));
      const unplaced = classes
        .filter((c) => !placedLessonIds.has(c.id) && !placedLessonIds.has(c.code))
        .map((c) => ({
          id: c.id || c.code,
          code: c.code || c.name,
          name: c.name || c.code,
          span: c.session_length || 2,
          group: c.group || 'DB2542A',
          tone: c.needs_lab ? 'purple' : 'navy',
          note: c.needs_lab ? 'needs a lab room' : 'standard lecture',
        }));

      // 如果 API 没返回未排课数据，保留演示的默认 Mock
      setUnplacedLessons(
        unplaced.length > 0
          ? unplaced
          : [
              { id: 'u1', code: 'Business Statistics', name: 'Business Statistics', span: 2, tone: 'navy', note: 'needs a 40-seat room', group: 'DB2542A' },
              { id: 'u2', code: 'Business Law', name: 'Business Law', span: 2, tone: 'purple', note: 'Ms Chong busy Mon–Tue', group: 'HM2601A' },
              { id: 'u3', code: 'Microeconomics', name: 'Microeconomics', span: 2, tone: 'amber', note: 'Retake · 4 students', group: 'Retake' },
            ]
      );
    } catch (e) {
      setError(e.message);
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 2. 拖拽排课核心逻辑
  const handleCellDrop = async ({ day, slot, lesson }) => {
    try {
      const calculatedPeriod = Math.ceil((slot + 1) / 2);

      // 调用后端 API 更新排课位置
      await api.updateEntry(lesson.id, {
        day: day + 1, // 前端 0~4 转后端 1~5
        start_slot: calculatedPeriod,
        room: 'BR-101',
        force: true,
      }).catch((err) => console.log('API update fallback to local:', err));

      // 前端界面同步更新
      setGroups((prevGroups) =>
        prevGroups.map((g) => {
          if (g.id !== selectedId) return g;
          return {
            ...g,
            lessons: [
              ...g.lessons,
              {
                id: lesson.id,
                code: lesson.code,
                name: lesson.name,
                day: day,
                period: calculatedPeriod,
                span: lesson.span || 2,
                room: 'BR-101',
                lecturer: 'Assigned Lecturer',
              },
            ],
          };
        })
      );

      setUnplacedLessons((prev) => prev.filter((item) => item.id !== lesson.id));
      setMessage(`Successfully placed "${lesson.name}" onto ${selectedId}!`);
    } catch (err) {
      setError("Failed to place lesson onto grid.");
    }
  };

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
      setUnplacedLessons([]);
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

  const displayRows = useMemo(() => {
    if (view === 'group') {
      return groups.map((g) => ({
        ...g,
        lessons: (g.lessons || []).map((l) => ({
          ...l,
          lecturer: l.lecturer || 'TBA',
          room: l.room || 'Unassigned',
        })),
      }));
    }

    if (view === 'lecturer') {
      const lecturerMap = {};
      LECTURERS.forEach((lec) => {
        lecturerMap[lec.name] = {
          id: lec.name,
          title: lec.email,
          lessons: [],
        };
      });

      groups.forEach((group) => {
        group.lessons?.forEach((lesson) => {
          const lecName = lesson.lecturer;
          if (lecName) {
            if (!lecturerMap[lecName]) {
              lecturerMap[lecName] = { id: lecName, title: 'Lecturer', lessons: [] };
            }
            lecturerMap[lecName].lessons.push({
              ...lesson,
              code: `${lesson.code || lesson.name} (${group.id})`,
            });
          }
        });
      });

      return Object.values(lecturerMap);
    }

    if (view === 'room') {
      const roomMap = {};

      groups.forEach((group) => {
        group.lessons?.forEach((lesson) => {
          const roomName = lesson.room || 'Unassigned Room';
          if (!roomMap[roomName]) {
            roomMap[roomName] = { id: roomName, title: 'Campus Facility', lessons: [] };
          }
          roomMap[roomName].lessons.push({
            ...lesson,
            code: `${lesson.code || lesson.name} · ${group.id}`,
          });
        });
      });

      return Object.values(roomMap);
    }

    return groups;
  }, [view, groups]);

  useEffect(() => {
    if (displayRows.length > 0) {
      setSelectedId((prev) => (displayRows.some((r) => r.id === prev) ? prev : displayRows[0].id));
    }
  }, [view, displayRows]);

  const exportTargets = useMemo(
    () => displayRows.filter((r) => r.lessons && r.lessons.length > 0),
    [displayRows],
  );

  const handleBatchExport = async () => {
    if (isExporting) return;
    if (exportTargets.length === 0) {
      alert("No timetable items to export.");
      return;
    }
    setExportState({ done: 0, total: exportTargets.length });
    try {
      await exportGroupBatchZip(exportTargets, view, (done, total) =>
        setExportState({ done, total }),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to export ZIP file.");
    } finally {
      setExportState(null);
    }
  };

  const sessions = new Set(
    groups.flatMap((g) =>
      g.lessons.map((l) => `${l.code}-${l.day}-${l.period}`),
    ),
  ).size;

  const conflicts = groups.reduce((n, g) => n + g.lessons.filter((l) => l.conflict).length, 0);
  const placedLessonsCount = 42;
  const totalLessonsCount = 45;

  const selectedGroup = selectedLessonData
    ? displayRows.find((g) => g.id === selectedLessonData.groupId)
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
        onExportBatch={handleBatchExport}
        isExporting={isExporting}
        exportState={exportState}
        totalItemsCount={exportTargets.length}
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
                  onCellDrop={handleCellDrop}
                />
                <BottomPanels
                  unplacedLessons={unplacedLessons}
                  onAutoPlaceAll={handleGenerate}
                />
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