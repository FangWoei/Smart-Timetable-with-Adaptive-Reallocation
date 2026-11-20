// src/pages/GroupView/GroupViewPage.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api, isPlacedEntry, toGridGroups } from "../../api";
import PageHeader, { HeaderChip } from "../../components/PageHeader.jsx";
import TimetableGrid from "../../components/TimetableGrid.jsx";
import { refreshSemester } from "../../semester.js";
import BottomPanels from "./BottomPanels.jsx";
import ExportDialog from "./ExportDialog.jsx";
import LessonDetailsPanel from "./LessonDetailsPanel.jsx";
import Sidebar, { ALL_ID } from "./Sidebar.jsx";
import Toolbar from "./Toolbar.jsx";
import { exportGroupBatchZip } from "./exportGroupPdf.jsx";

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// The id of the "One timetable" card ("All groups" / "All lecturers" / "All rooms")
const isCombinedId = (id) => /^All (groups|lecturers|rooms)$/.test(String(id));

// 讲师 / 教室视图里课程代码带后缀："MAL1016 (GROUP)" / "MAL1016 · GROUP"，去掉后缀得到真正的课程代码
const baseCode = (code) =>
  String(code ?? "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s*·.*$/, "")
    .trim();

// "Unassigned" 之类的占位文字不是真教室
const realRoom = (r) => (r && !/^unassigned/i.test(r) ? r : null);

// period 1 = 08:30，每个 period 一小时（可能有半小时，例如 1.5）
const periodTime = (p) => {
  const m = Math.round(8 * 60 + 30 + (p - 1) * 60);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// 两节课在同一天、时间有重叠
const overlaps = (l, day, period, span) => {
  if (l.day !== day || l.period == null) return false;
  const aStart = l.startSlot ?? l.period * 2 - 1;
  const aEnd = aStart + (l.slotSpan ?? (l.span || 2) * 2);
  const bStart = period * 2 - 1;
  const bEnd = bStart + span * 2;
  return aStart < bEnd && bStart < aEnd;
};

// 后端的一条 entry（还没排上时间的）变成 Unplaced 卡片
const toUnplacedCard = (e) => {
  // The backend's unplaced cards have id = session id and entry_id = null.
  // `id` is only an entry id for an old-style row that has no session_id.
  const entryId = e.entry_id ?? (e.session_id == null ? (e.id ?? null) : null);
  const code = e.class_code ?? e.code ?? String(entryId ?? "");
  const needsLab = !!(e.needs_lab ?? e.needsLab);
  const sessionId = e.session_id != null ? String(e.session_id) : null;
  return {
    id: sessionId ?? entryId ?? code,
    entryId,
    sessionId,
    code,
    name: e.module ?? e.name ?? code,
    span: e.hours ?? e.span ?? 2,
    group: e.groups?.[0] ?? e.group ?? "",
    lecturer: e.lecturer ?? "",
    needsLab,
    tone: needsLab ? "purple" : "navy",
    note: needsLab ? "needs a lab room" : "standard lecture",
  };
};

export default function GroupViewPage() {
  const location = useLocation();
  const [view, setView] = useState("group");
  const [groups, setGroups] = useState([]);
  const [unplacedLessons, setUnplacedLessons] = useState([]);
  const [run, setRun] = useState(null);
  // The page always opens on "Show all" (also after login and after an import)
  const [selectedId, setSelectedId] = useState(ALL_ID);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(location.state?.message ?? ""); // e.g. "Imported 22 classes"
  const [selectedLessonData, setSelectedLessonData] = useState(null);
  // "Show all" can list every timetable one by one ("separate") or put every
  // course in one timetable ("combined"). The choice is remembered.
  const [allLayout, setAllLayoutState] = useState(() => {
    try {
      return localStorage.getItem("star.allLayout") === "combined"
        ? "combined"
        : "separate";
    } catch {
      return "separate";
    }
  });
  const setAllLayout = (v) => {
    setAllLayoutState(v);
    try {
      localStorage.setItem("star.allLayout", v);
    } catch {
      /* private window: just do not remember it */
    }
  };
  const [loaded, setLoaded] = useState(false); // false until the first load finishes
  const [status, setStatus] = useState(null); // GET /timetable/status: draft / published

  // 当前正在拖的东西：{ source: 'unplaced' | 'grid', lesson } 或 null
  const [drag, setDrag] = useState(null);
  const [overZone, setOverZone] = useState(false); // dragged over the floating "unplace" box

  // Undo / Redo. Each action remembers one lesson (by session id) and where it
  // was before / after: null = unplaced, or { day, start_slot, room }.
  const [history, setHistory] = useState({ undo: [], redo: [] });
  const groupsRef = useRef([]);
  const stepRef = useRef(null);

  const [exportState, setExportState] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const isExporting = exportState !== null;

  // 可用教室名单（来自 GET /rooms，没有这个接口就只用时间表里出现过的教室）
  const roomPoolRef = useRef([]);

  // 1. 从 Backend API 加载所有数据（不用 /classes）
  const load = useCallback(async () => {
    try {
      const [timetable, meta, rooms] = await Promise.all([
        api.getTimetable(),
        api.getGroups(),
        typeof api.getRooms === "function"
          ? api.getRooms().catch(() => [])
          : [],
      ]);

      const counts = Object.fromEntries(
        meta.map((g) => [g.code, g.student_count]),
      );
      const rows = toGridGroups(timetable, counts);
      setError("");
      setGroups(rows);
      setRun(timetable.run);
      setSelectedId((id) => id ?? rows[0]?.id ?? null);
      api
        .getStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
      void refreshSemester();

      roomPoolRef.current = (Array.isArray(rooms) ? rooms : [])
        .filter(
          (r) =>
            !r.deleted &&
            !r.is_deleted &&
            (!r.status || r.status === "available"),
        )
        .map((r) => r.name ?? r.code ?? r.room_code)
        .filter(Boolean);

      // Unplaced：后端在 timetable.unplaced 里给的，加上 entries 里还没有 day / start_slot 的
      const entries = Array.isArray(timetable.entries) ? timetable.entries : [];
      const fromBackend = Array.isArray(timetable.unplaced)
        ? timetable.unplaced
        : [];
      const seen = new Set();
      setUnplacedLessons(
        [...fromBackend, ...entries.filter((e) => !isPlacedEntry(e))]
          .map(toUnplacedCard)
          .filter((c) => (seen.has(c.id) ? false : seen.add(c.id))),
      );
    } catch (e) {
      // no plan at all (new system, or the last plan was deleted) is not an error
      if (!/no active timetable/i.test(e.message)) setError(e.message);
      setGroups([]);
      setRun(null);
      setUnplacedLessons([]);
      api
        .getStatus()
        .then(setStatus)
        .catch(() => setStatus(null));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Loading data when the page opens is exactly what an effect is for
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const record = (action) => {
    if (action.sessionId == null) return;
    setHistory((h) => ({
      undo: [...h.undo, action].slice(-50),
      redo: [],
    }));
  };
  const clearHistory = () => setHistory({ undo: [], redo: [] });

  const stateOf = (l) => ({
    day: l.day + 1,
    start_slot: l.period,
    room: l.room,
  });
  const whereText = (st) =>
    st
      ? `${DAY_SHORT[st.day - 1]} ${periodTime(st.start_slot)} ${st.room}`
      : "Unplaced";

  // Put one lesson into a state: null = take it off, otherwise move / place it.
  // force = true: going back to an earlier state should not be refused.
  async function applyState(sessionId, state) {
    const cur = groupsRef.current
      .flatMap((g) => g.lessons)
      .find((l) => String(l.sessionId) === String(sessionId));
    if (state == null) {
      if (cur) await api.unplaceEntry(cur.entryId);
      return;
    }
    const body = { ...state, force: true };
    if (cur) await api.updateEntry(cur.entryId, body);
    else await api.placeUnplaced(sessionId, body);
  }

  async function step(kind) {
    const list = kind === "undo" ? history.undo : history.redo;
    const a = list[list.length - 1];
    if (!a || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await applyState(a.sessionId, kind === "undo" ? a.before : a.after);
      setHistory((h) =>
        kind === "undo"
          ? { undo: h.undo.slice(0, -1), redo: [...h.redo, a] }
          : { undo: [...h.undo, a], redo: h.redo.slice(0, -1) },
      );
      setSelectedLessonData(null);
      await load();
      setMessage(`${kind === "undo" ? "Undid" : "Redid"}: ${a.label}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    stepRef.current = step;
  });

  // Ctrl+Z = undo, Ctrl+Y or Ctrl+Shift+Z = redo (not while typing in a box)
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target;
      if (
        t &&
        (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)
      )
        return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        void stepRef.current?.("undo");
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        void stepRef.current?.("redo");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    return needsLab ? (matching[0] ?? null) : (matching[0] ?? free[0] ?? null);
  };

  // 3. 放下：既处理「从 Unplaced 拖进来」，也处理「时间表里的课换位置」
  const handleCellDrop = async ({ day, slot, entityId, source, lesson }) => {
    if (busy) return;
    setError("");
    setMessage("");

    if (lesson.locked) {
      setError(
        `"${lesson.name || lesson.module || lesson.code}" is locked. Click it, then press Unlock.`,
      );
      return;
    }
    const period = Math.ceil(slot / 2); // slot 是贴齐整点的奇数格，period 1 = 08:30
    const span = lesson.span || 2;
    const name = lesson.name || lesson.module || baseCode(lesson.code);

    // 位置没变就什么都不做（教室视图里换教室除外）
    if (
      source === "grid" &&
      view !== "room" &&
      lesson.day === day &&
      lesson.period === period
    )
      return;

    const entryId = lesson.entryId ?? null;
    const sessionId = lesson.sessionId ?? null;
    if (entryId == null && sessionId == null) {
      setError(`"${name}" has no id, so it can't be saved.`);
      return;
    }

    // 从 Unplaced 拖进别的班级的时间表：先确认
    if (
      source === "unplaced" &&
      view === "group" &&
      lesson.group &&
      lesson.group !== entityId &&
      !isCombinedId(entityId)
    ) {
      if (
        !window.confirm(
          `"${name}" belongs to ${lesson.group}, but you dropped it onto ${entityId}. Continue?`,
        )
      )
        return;
    }

    // 决定教室
    let room;
    if (source === "grid") {
      room =
        view === "room" && !isCombinedId(entityId)
          ? realRoom(entityId)
          : realRoom(lesson.room); // 教室视图里拖到另一个教室 = 换教室
    }
    if (!room) {
      room = pickRoom({
        day,
        period,
        span,
        needsLab: lesson.needsLab ?? /lab/i.test(lesson.room || ""),
        selfEntryId: entryId,
      });
    }
    if (!room) {
      setError(
        `No free ${lesson.needsLab ? "lab " : ""}room at ${DAY_SHORT[day]} ${periodTime(period)} for "${name}".`,
      );
      return;
    }

    const body = { day: day + 1, start_slot: period, room };

    setBusy(true);
    try {
      // 已排的课：改位置（PATCH）；Unplaced 的课：第一次放上去（POST .../place）
      const send = (force) =>
        entryId != null
          ? api.updateEntry(entryId, { ...body, force })
          : api.placeUnplaced(sessionId, { ...body, force });
      // 后端报冲突（和别的班级撞教室 / 讲师）时返回 saved:false + problems：显示原因，由你决定要不要强制放入
      const first = await send(false);
      if (first && first.saved === false) {
        const why =
          (first.problems ?? []).join("\n") || "This causes a conflict.";
        if (!window.confirm(`${why}\n\nPlace it anyway?`)) {
          setError(first.problems?.[0] ?? "Not saved: it causes a conflict.");
          return;
        }
        await send(true);
      }
      record({
        sessionId: lesson.sessionId,
        label: `${name} (${source === "grid" ? whereText(stateOf(lesson)) : "Unplaced"} → ${whereText(body)})`,
        before: source === "grid" ? stateOf(lesson) : null,
        after: body,
      });
      setSelectedLessonData(null);
      await load();
      setMessage(
        `Placed "${name}" on ${DAY_SHORT[day]} ${periodTime(period)} · ${room}`,
      );
    } catch (err) {
      setError(err.message || "Failed to update the timetable.");
    } finally {
      setBusy(false);
    }
  };

  // 把时间表里的一节课拖回 Unplaced lessons
  async function handleUnplace(lesson) {
    if (busy || !lesson) return;
    setError("");
    setMessage("");
    const name = lesson.name || lesson.module || baseCode(lesson.code);
    if (lesson.locked) {
      setError(`"${name}" is locked. Click it, then press Unlock.`);
      return;
    }
    if (lesson.entryId == null) return;
    setBusy(true);
    try {
      await api.unplaceEntry(lesson.entryId);
      record({
        sessionId: lesson.sessionId,
        label: `${name} (${whereText(stateOf(lesson))} → Unplaced)`,
        before: stateOf(lesson),
        after: null,
      });
      setSelectedLessonData(null);
      await load();
      setMessage(`"${name}" is back in Unplaced lessons.`);
    } catch (e) {
      setError(e.message || "Could not take the lesson off the timetable.");
    } finally {
      setBusy(false);
    }
  }

  // 拖拽对象：交给 TimetableGrid（高亮 / 变红 / 放下）和 BottomPanels（开始拖）
  const dnd = {
    drag,
    onDragStart: setDrag,
    onDragEnd: () => {
      setDrag(null);
      setOverZone(false);
    },
    onDropUnplace: () => {
      const d = drag;
      setDrag(null);
      setOverZone(false);
      if (d?.source === "grid") void handleUnplace(d.lesson);
    },
    onDrop: ({ day, start, entityId }) => {
      const d = drag;
      setDrag(null);
      if (d)
        void handleCellDrop({
          day,
          slot: start,
          entityId,
          source: d.source,
          lesson: d.lesson,
        });
    },
  };

  // Lock / Unlock 当前选中的课程（自动生成的课程默认是锁定的，解锁后才能拖动）
  async function handleToggleLock() {
    const l = selectedLessonData?.lesson;
    if (!l || l.entryId == null || busy) return;
    const next = !l.locked;
    setBusy(true);
    setError("");
    try {
      await api.setLock(l.entryId, next);
      setSelectedLessonData((s) =>
        s ? { ...s, lesson: { ...s.lesson, locked: next } } : s,
      );
      await load();
      setMessage(next ? "Locked." : "Unlocked. You can drag it now.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api.generate();
      clearHistory(); // the old plan is gone, so its undo steps no longer apply
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

  // Auto-place all：只排还没排的课，已经排好的不会动
  async function handleAutoPlaceAll() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api.autoPlaceAll();
      setMessage(
        r.placed === 0 && r.unplaced === 0
          ? "Nothing to place."
          : `Placed ${r.placed} lesson(s)` +
              (r.unplaced ? `, ${r.unplaced} could not be placed.` : "."),
      );
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Delete plan：不想要这份课表时整份删掉（回到上一份；没有上一份就变成空的）
  async function handleDeletePlan() {
    const id = status?.active_run_id ?? run?.id;
    if (id == null) return;
    const extra = status?.active_is_published
      ? "\nIt is published, so lecturers will stop seeing it."
      : "";
    if (!window.confirm(`Delete plan #${id}? This cannot be undone.${extra}`))
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api.deleteRun(id);
      clearHistory();
      setMessage(
        r.active_run_id != null
          ? `Plan #${id} deleted. Showing plan #${r.active_run_id}.`
          : `Plan #${id} deleted. There is no timetable now. Press Generate to make one.`,
      );
      setSelectedLessonData(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Publish：讲师只能看到已发布的课表
  async function handlePublish() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (status?.active_is_published) {
        await api.unpublish();
        setMessage("Unpublished. Lecturers no longer see this timetable.");
      } else {
        try {
          await api.publish(false);
        } catch (e) {
          if (
            !/unplaced/i.test(e.message) ||
            !window.confirm(`${e.message}\n\nPublish anyway?`)
          )
            throw e;
          await api.publish(true);
        }
        setMessage("Published. Lecturers can now see this timetable.");
      }
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
          lesson_id: l.sessionId,
          room: l.room,
          day: l.day + 1,
          start_slot: l.period,
        })),
      );
      const seen = new Set();
      const unique = entries.filter(
        (e) =>
          e.lesson_id &&
          (seen.has(e.lesson_id) ? false : seen.add(e.lesson_id)),
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
    if (view === "group") {
      return groups.map((g) => ({
        ...g,
        lessons: (g.lessons || []).map((l) => ({
          ...l,
          lecturer: l.lecturer || "TBA",
          room: l.room || "Unassigned",
        })),
      }));
    }

    // 一门课属于多个 group 时只算一次，code 后面标出所有 group
    const tagged = (lesson) => ({
      ...lesson,
      code: `${lesson.code || lesson.name} (${(lesson.groups?.length ? lesson.groups : []).join(", ")})`,
    });
    const byEntity = (keyOf, title) => {
      const map = new Map();
      const seen = new Set();
      groups.forEach((g) =>
        g.lessons?.forEach((lesson) => {
          const key = keyOf(lesson);
          if (!key || seen.has(`${key}|${lesson.entryId}`)) return;
          seen.add(`${key}|${lesson.entryId}`);
          if (!map.has(key)) map.set(key, { id: key, title, lessons: [] });
          map.get(key).lessons.push(tagged(lesson));
        }),
      );
      return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    };

    if (view === "lecturer") return byEntity((l) => l.lecturer, "Lecturer");
    if (view === "room")
      return byEntity((l) => realRoom(l.room), "Campus Facility");

    return groups;
  }, [view, groups]);

  // 当前选中的项：选的那项不在列表里时（例如切换了视图），退回第一项
  const activeId =
    (selectedId === ALL_ID && displayRows.length > 1) ||
    displayRows.some((r) => r.id === selectedId)
      ? selectedId
      : (displayRows[0]?.id ?? null);

  // Every course in ONE timetable (a course shared by several groups appears once)
  const combinedRow = (() => {
    const seen = new Set();
    const lessons = [];
    for (const r of displayRows) {
      for (const l of r.lessons || []) {
        const key = l.entryId ?? `${l.code}|${l.day}|${l.period}`;
        if (seen.has(key)) continue;
        seen.add(key);
        // group view: add the groups to the course code, like the lecturer / room views do
        lessons.push(
          view === "group" && l.groups?.length
            ? { ...l, code: `${l.code || l.name} (${l.groups.join(", ")})` }
            : l,
        );
      }
    }
    const noun =
      view === "lecturer" ? "lecturers" : view === "room" ? "rooms" : "groups";
    return {
      id: `All ${noun}`,
      title: `${displayRows.length} ${noun} · every course in one timetable`,
      lessons,
      freeSlots: [],
    };
  })();

  const exportTargets = useMemo(
    () => displayRows.filter((r) => r.lessons && r.lessons.length > 0),
    [displayRows],
  );

  const handleBatchExport = async (chosen) => {
    if (isExporting) return;
    if (chosen.length === 0) {
      alert("No timetable items to export.");
      return;
    }
    setExportOpen(false);
    setExportState({ done: 0, total: chosen.length });
    try {
      await exportGroupBatchZip(chosen, view, (done, total) =>
        setExportState({ done, total }),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to export ZIP file.");
    } finally {
      setExportState(null);
    }
  };

  // 真实数字：每条 entry 只算一次（一门课属于多个 group 也只算一次）
  const placedIds = new Set(
    groups.flatMap((g) => g.lessons.map((l) => l.entryId)),
  );
  const sessions = placedIds.size;
  const resources = [
    { label: "Groups", count: groups.length },
    {
      label: "Lecturers",
      count: new Set(
        groups.flatMap((g) => g.lessons.map((l) => l.lecturer).filter(Boolean)),
      ).size,
    },
    {
      label: "Rooms",
      count: new Set(
        groups.flatMap((g) =>
          g.lessons.map((l) => realRoom(l.room)).filter(Boolean),
        ),
      ).size,
    },
  ];

  const conflicts = groups.reduce(
    (n, g) => n + g.lessons.filter((l) => l.conflict).length,
    0,
  );
  const placedLessonsCount = placedIds.size;
  const totalLessonsCount = placedIds.size + unplacedLessons.length;

  const selectedGroup = selectedLessonData
    ? selectedLessonData.groupId === combinedRow.id
      ? combinedRow
      : displayRows.find((g) => g.id === selectedLessonData.groupId)
    : null;

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <PageHeader
        eyebrow="Scheduler"
        title="Timetable scheduler"
        subtitle="Generate the timetable, check it for clashes, adjust lessons by hand, then publish it.">
        {run && (
          <HeaderChip>
            Run #{run.id} · {run.status} · penalty {run.penalty}
          </HeaderChip>
        )}
        <HeaderChip>
          {status?.active_is_published ? "Published" : "Draft"}
        </HeaderChip>
      </PageHeader>
      {/* The tool area fills the screen under the banner; the banner scrolls away */}
      <div className="relative flex h-[calc(100vh-56px)] min-h-[560px] flex-col">
        <Toolbar
          view={view}
          onViewChange={(newView) => {
            setView(newView);
            setSelectedLessonData(null);
          }}
          onGenerate={handleGenerate}
          onVerify={handleVerify}
          onUndo={() => step("undo")}
          onRedo={() => step("redo")}
          undoLabel={history.undo.at(-1)?.label ?? null}
          redoLabel={history.redo.at(-1)?.label ?? null}
          onToggleLock={handleToggleLock}
          selectedLocked={
            selectedLessonData ? !!selectedLessonData.lesson.locked : null
          }
          onApprove={handlePublish}
          canApprove={conflicts === 0 && !busy}
          isPublished={!!status?.active_is_published}
          onDeletePlan={handleDeletePlan}
          canDeletePlan={!busy && (status?.active_run_id ?? run?.id) != null}
          onExportBatch={() => setExportOpen(true)}
          isExporting={isExporting}
          exportState={exportState}
          totalItemsCount={exportTargets.length}
        />

        <div className="flex min-h-0 flex-1 overflow-hidden pb-8">
          <Sidebar
            groups={displayRows}
            selectedId={activeId}
            onSelect={setSelectedId}
            view={view}
            resources={resources}
          />

          <main className="min-w-0 flex-1 flex flex-col overflow-hidden bg-canvas">
            <div className="px-4 pt-3 pb-2 flex shrink-0 items-center gap-4 bg-canvas z-10 border-b border-transparent">
              <h1 className="text-[15px] font-semibold text-ink">
                {!loaded
                  ? "Loading timetable…"
                  : view === "group"
                    ? `${groups.length} groups`
                    : view === "lecturer"
                      ? `${displayRows.length} lecturers`
                      : `${displayRows.length} rooms`}{" "}
                · {sessions} sessions
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

              <div className="ml-auto flex items-center gap-3">
                {activeId === ALL_ID && (
                  <div
                    role="group"
                    aria-label="Show all layout"
                    className="flex rounded bg-panel p-0.5 text-[12px]">
                    {[
                      ["separate", "Separate"],
                      ["combined", "One timetable"],
                    ].map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAllLayout(v)}
                        aria-pressed={allLayout === v}
                        title={
                          v === "separate"
                            ? "One timetable for each group"
                            : "Every course together in one timetable"
                        }
                        className={[
                          "rounded px-2.5 py-1 font-medium",
                          allLayout === v
                            ? "bg-surface text-navy-700 shadow-xs"
                            : "text-ink-3 hover:text-ink",
                        ].join(" ")}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center rounded border border-line bg-surface text-[13px] text-ink-2">
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
                    onClick={() => setZoom((z) => Math.min(200, z + 10))}
                    className="px-2.5 py-0.5 hover:bg-panel">
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {displayRows.length === 0 && !error ? (
                <p className="p-8 text-center text-sm text-ink-4">
                  No timetable data available for this view.
                </p>
              ) : (
                <>
                  {activeId === ALL_ID && allLayout === "combined" ? (
                    <TimetableGrid
                      groups={[combinedRow]}
                      selectedId={combinedRow.id}
                      onSelect={() => {}}
                      zoom={zoom}
                      selectedLesson={selectedLessonData}
                      onLessonSelect={setSelectedLessonData}
                      dnd={dnd}
                      view={view}
                    />
                  ) : activeId === ALL_ID ? (
                    <div className="space-y-6">
                      {displayRows.map((g) => (
                        <TimetableGrid
                          key={g.id}
                          groups={[g]}
                          selectedId={g.id}
                          onSelect={setSelectedId}
                          zoom={zoom}
                          selectedLesson={selectedLessonData}
                          onLessonSelect={setSelectedLessonData}
                          dnd={dnd}
                          view={view}
                        />
                      ))}
                    </div>
                  ) : (
                    <TimetableGrid
                      groups={displayRows}
                      selectedId={activeId}
                      onSelect={setSelectedId}
                      zoom={zoom}
                      selectedLesson={selectedLessonData}
                      onLessonSelect={setSelectedLessonData}
                      dnd={dnd}
                      view={view}
                    />
                  )}
                </>
              )}
            </div>

            {/* Pinned to the bottom of the screen so lessons can be dragged
              between the timetable and Unplaced without scrolling. */}
            {displayRows.length > 0 && (
              <div className="shrink-0 border-t border-line-strong bg-canvas px-4 pb-3 pt-2 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                <BottomPanels
                  unplacedLessons={unplacedLessons}
                  onAutoPlaceAll={handleAutoPlaceAll}
                  onLessonDragStart={dnd.onDragStart}
                  onLessonDragEnd={dnd.onDragEnd}
                  canUnplace={drag?.source === "grid"}
                  onDropUnplace={dnd.onDropUnplace}
                />
              </div>
            )}
          </main>

          {selectedLessonData && selectedGroup && (
            <LessonDetailsPanel
              lesson={selectedLessonData.lesson}
              group={selectedGroup}
              onClose={() => setSelectedLessonData(null)}
            />
          )}
        </div>

        {/* Shown only while a lesson from the timetable is being dragged, so you
          do not have to scroll down to the Unplaced lessons box. */}
        {drag?.source === "grid" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (!overZone) setOverZone(true);
            }}
            onDragLeave={() => setOverZone(false)}
            onDrop={(e) => {
              e.preventDefault();
              dnd.onDropUnplace();
            }}
            className={`absolute left-1/2 top-[60px] z-30 -translate-x-1/2 rounded-lg border-2 border-dashed px-6 py-2 text-[13px] font-semibold shadow-lg ${
              overZone
                ? "border-navy-500 bg-navy-700 text-white"
                : "border-navy-500 bg-surface text-navy-700"
            }`}>
            Drop here to put it back in Unplaced lessons
          </div>
        )}

        <footer className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-between border-t border-line-strong bg-footer px-4 text-[11px] text-ink-3 z-20">
          <div className="flex items-center gap-4">
            <span className="text-ink">
              {placedLessonsCount} of {totalLessonsCount} lessons placed
            </span>
            <span className="flex items-center gap-1.5 font-medium text-danger">
              <span className="size-1.5 rounded-full bg-danger"></span>
              {conflicts} conflicts
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>
              {run
                ? `Run #${run.id} · ${run.status} · penalty ${run.penalty}`
                : "No run yet"}
            </span>
          </div>
          <div className="font-medium"></div>
        </footer>
      </div>
      {exportOpen && (
        <ExportDialog
          targets={exportTargets}
          view={view}
          onClose={() => setExportOpen(false)}
          onConfirm={handleBatchExport}
        />
      )}
    </div>
  );
}
