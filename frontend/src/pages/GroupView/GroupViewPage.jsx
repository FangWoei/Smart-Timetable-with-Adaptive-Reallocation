// src/pages/GroupView/GroupViewPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, isPlacedEntry, toGridGroups } from "../../api";
import BottomPanels from './BottomPanels.jsx';
import LessonDetailsPanel from './LessonDetailsPanel.jsx';
import Sidebar from "./Sidebar.jsx";
import TimetableGrid from "../../components/TimetableGrid.jsx";
import Toolbar from "./Toolbar.jsx";
import { LECTURERS } from "../../data/people.js";
import { exportGroupBatchZip } from "./exportGroupPdf.jsx";

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// 讲师 / 教室视图里课程代码带后缀："MAL1016 (GROUP)" / "MAL1016 · GROUP"，去掉后缀得到真正的课程代码
const baseCode = (code) =>
  String(code ?? '').replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*·.*$/, '').trim();

// "Unassigned" 之类的占位文字不是真教室
const realRoom = (r) => (r && !/^unassigned/i.test(r) ? r : null);

// period 1 = 08:30，每个 period 一小时（可能有半小时，例如 1.5）
const periodTime = (p) => {
  const m = Math.round(8 * 60 + 30 + (p - 1) * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// 两节课在同一天、时间有重叠
const overlaps = (l, day, period, span) => {
  if (l.day !== day || l.period == null) return false;
  const aStart = l.period * 2 - 1;
  const aEnd = aStart + (l.span || 2) * 2;
  const bStart = period * 2 - 1;
  const bEnd = bStart + span * 2;
  return aStart < bEnd && bStart < aEnd;
};

// 后端的一条 entry（还没排上时间的）变成 Unplaced 卡片
const toUnplacedCard = (e) => {
  const entryId = e.id ?? e.entry_id ?? null;
  const code = e.class_code ?? e.code ?? String(entryId ?? '');
  const needsLab = !!(e.needs_lab ?? e.needsLab);
  return {
    id: entryId ?? code,
    entryId,
    code,
    name: e.module ?? e.name ?? code,
    span: e.hours ?? e.span ?? 2,
    group: e.groups?.[0] ?? e.group ?? '',
    lecturer: e.lecturer ?? '',
    needsLab,
    tone: needsLab ? 'purple' : 'navy',
    note: needsLab ? 'needs a lab room' : 'standard lecture',
  };
};

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

  // 当前正在拖的东西：{ source: 'unplaced' | 'grid', lesson } 或 null
  const [drag, setDrag] = useState(null);

  const [exportState, setExportState] = useState(null);
  const isExporting = exportState !== null;

  // 可用教室名单（来自 GET /rooms，没有这个接口就只用时间表里出现过的教室）
  const roomPoolRef = useRef([]);

  // 1. 从 Backend API 加载所有数据（不用 /classes）
  const load = useCallback(async () => {
    try {
      const [timetable, meta, rooms] = await Promise.all([
        api.getTimetable(),
        api.getGroups(),
        typeof api.getRooms === 'function' ? api.getRooms().catch(() => []) : [],
      ]);

      const counts = Object.fromEntries(meta.map((g) => [g.code, g.student_count]));
      const rows = toGridGroups(timetable, counts);
      setError("");
      setGroups(rows);
      setRun(timetable.run);
      setSelectedId((id) => id ?? rows[0]?.id ?? null);

      roomPoolRef.current = (Array.isArray(rooms) ? rooms : [])
        .filter((r) => !r.deleted && !r.is_deleted && (!r.status || r.status === 'available'))
        .map((r) => r.name ?? r.code ?? r.room_code)
        .filter(Boolean);

      // Unplaced：后端在 timetable.unplaced 里给的，加上 entries 里还没有 day / start_slot 的
      const entries = Array.isArray(timetable.entries) ? timetable.entries : [];
      const fromBackend = Array.isArray(timetable.unplaced) ? timetable.unplaced : [];
      const seen = new Set();
      setUnplacedLessons(
        [...fromBackend, ...entries.filter((e) => !isPlacedEntry(e))]
          .map(toUnplacedCard)
          .filter((c) => (seen.has(c.id) ? false : seen.add(c.id))),
      );
    } catch (e) {
      setError(e.message);
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 2. 选一间当时空闲的教室（需要实验室的课只选名字带 lab 的）
  const pickRoom = ({ day, period, span, needsLab, selfEntryId }) => {
    const all = new Set(roomPoolRef.current);
    const taken = new Set();
    groups.forEach((g) =>
      g.lessons?.forEach((l) => {
        const r = realRoom(l.room);
        if (!r) return;
        all.add(r);
        const isSelf = selfEntryId != null && l.entryId === selfEntryId;
        if (!isSelf && overlaps(l, day, period, span)) taken.add(r);
      }),
    );
    const free = [...all].filter((r) => !taken.has(r));
    const matching = free.filter((r) => /lab/i.test(r) === !!needsLab);
    return needsLab ? matching[0] ?? null : matching[0] ?? free[0] ?? null;
  };

  // 3. 放下：既处理「从 Unplaced 拖进来」，也处理「时间表里的课换位置」
  const handleCellDrop = async ({ day, slot, entityId, source, lesson }) => {
    if (busy) return;
    setError("");
    setMessage("");

    const period = Math.ceil(slot / 2); // slot 是贴齐整点的奇数格，period 1 = 08:30
    const span = lesson.span || 2;
    const name = lesson.name || lesson.module || baseCode(lesson.code);

    // 位置没变就什么都不做（教室视图里换教室除外）
    if (source === 'grid' && view !== 'room' && lesson.day === day && lesson.period === period) return;

    const entryId = lesson.entryId ?? null;
    if (entryId == null) {
      setError(
        `"${name}" has no entry id, so it can't be saved. ` +
          `GET /timetable needs to return an "id" (or "entry_id") for each entry.`,
      );
      return;
    }

    // 从 Unplaced 拖进别的班级的时间表：先确认
    if (source === 'unplaced' && view === 'group' && lesson.group && lesson.group !== entityId) {
      if (!window.confirm(`"${name}" belongs to ${lesson.group}, but you dropped it onto ${entityId}. Continue?`)) return;
    }

    // 决定教室
    let room;
    if (source === 'grid') {
      room = view === 'room' ? realRoom(entityId) : realRoom(lesson.room); // 教室视图里拖到另一个教室 = 换教室
    }
    if (!room) {
      room = pickRoom({
        day,
        period,
        span,
        needsLab: lesson.needsLab ?? /lab/i.test(lesson.room || ''),
        selfEntryId: entryId,
      });
    }
    if (!room) {
      setError(`No free ${lesson.needsLab ? 'lab ' : ''}room at ${DAY_SHORT[day]} ${periodTime(period)} for "${name}".`);
      return;
    }

    const body = { day: day + 1, start_slot: period, room };

    setBusy(true);
    try {
      try {
        await api.updateEntry(entryId, { ...body, force: false });
      } catch (err) {
        // 后端报冲突（例如和别的班级撞教室 / 讲师）：显示原因，由你决定要不要强制放入
        if (!window.confirm(`${err.message}\n\nPlace it anyway?`)) {
          setError(err.message);
          return;
        }
        await api.updateEntry(entryId, { ...body, force: true });
      }
      setSelectedLessonData(null);
      await load();
      setMessage(`Placed "${name}" on ${DAY_SHORT[day]} ${periodTime(period)} · ${room}`);
    } catch (err) {
      setError(err.message || 'Failed to update the timetable.');
    } finally {
      setBusy(false);
    }
  };

  // 拖拽对象：交给 TimetableGrid（高亮 / 变红 / 放下）和 BottomPanels（开始拖）
  const dnd = {
    drag,
    onDragStart: setDrag,
    onDragEnd: () => setDrag(null),
    onDrop: ({ day, start, entityId }) => {
      const d = drag;
      setDrag(null);
      if (d) void handleCellDrop({ day, slot: start, entityId, source: d.source, lesson: d.lesson });
    },
  };

  async function handleGenerate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api.generate();
      setMessage(`Run #${r.run_id} · ${r.status} · penalty ${r.penalty} · ${r.seconds}s`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Auto-place all 会重新生成整个时间表，手动调整过的位置可能被覆盖
  const handleAutoPlaceAll = () => {
    if (!window.confirm('Auto-place regenerates the whole timetable and may undo your manual moves. Continue?')) return;
    void handleGenerate();
  };

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
      const unique = entries.filter((e) => (seen.has(e.lesson_id) ? false : seen.add(e.lesson_id)));
      const r = await api.check(unique);
      setMessage(r.valid ? "No conflicts found." : `${r.problems.length} problems: ${r.problems[0]}`);
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
        lecturerMap[lec.name] = { id: lec.name, title: lec.email, lessons: [] };
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
    groups.flatMap((g) => g.lessons.map((l) => `${l.code}-${l.day}-${l.period}`)),
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
            {message && <p className="text-xs font-medium text-navy-700">{message}</p>}
            {error && <p className="text-xs font-medium text-danger">{error}</p>}

            <div className="ml-auto flex items-center rounded border border-line bg-white text-[13px] text-ink-2">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(70, z - 10))}
                className="px-2.5 py-0.5 hover:bg-panel">
                −
              </button>
              <span className="w-11 text-center text-[11px] text-ink-3">{zoom}%</span>
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
                  dnd={dnd}
                  view={view}
                />
                <BottomPanels
                  unplacedLessons={unplacedLessons}
                  onAutoPlaceAll={handleAutoPlaceAll}
                  onLessonDragStart={dnd.onDragStart}
                  onLessonDragEnd={dnd.onDragEnd}
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