// src/pages/ManagePeople/LecturersTab.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api.js";
import Badge from "../../components/Badge.jsx";

// The database has no per-lecturer hour limit yet, so every lecturer uses this one.
const MAX_WEEKLY_HOURS = 20;

// API row -> the shape this page uses
const toLecturer = (l) => ({
  id: l.id,
  name: l.name,
  email: l.email || "",
  type: l.is_part_time ? "part-time" : "full-time",
  subjects: l.subjects || [],
  hours: l.assigned_hours || 0,
  cap: MAX_WEEKLY_HOURS,
});

function availability(l) {
  if (l.hours >= l.cap) return { tone: "danger", text: "full" };
  if (l.hours / l.cap >= 0.85) return { tone: "warn", text: "near limit" };
  return { tone: "ok", text: "open" };
}

// Lecturers tab: real data from the API
// Same hourly slots the solver uses: 08:30 to 18:30, ten one-hour slots
const DAYS = ["Mo", "Tu", "We", "Th", "Fr"];
const hhmm = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const SLOT_LABELS = Array.from({ length: 10 }, (_, i) => {
  const start = 8 * 60 + 30 + i * 60;
  return `${hhmm(start)}–${hhmm(start + 60)}`;
});
const cellKey = (day, slot) => `${day}-${slot}`;

const EMPTY_NEW = { name: "", email: "", type: "full-time" };
const inputCls =
  "mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-wide text-ink-4";

export default function LecturersTab() {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'full-time' | 'part-time'
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [editType, setEditType] = useState("full-time");
  const [blocked, setBlocked] = useState(null); // Set of "day-slot" the lecturer cannot teach; null = loading
  const [blockedBefore, setBlockedBefore] = useState(""); // as loaded, to see if it changed
  const openToken = useRef(0);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  // Used after add / save / delete. The first load below runs in the effect.
  async function load() {
    try {
      setLecturers((await api.getLecturers()).map(toLecturer));
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  }

  function retry() {
    setLoading(true);
    load().finally(() => setLoading(false));
  }

  useEffect(() => {
    let cancelled = false;
    api
      .getLecturers()
      .then((rows) => {
        if (!cancelled) setLecturers(rows.map(toLecturer));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = lecturers.find((l) => l.id === selectedId) || null;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return lecturers.filter((l) => {
      const matchesQuery =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q);
      const matchesType = filterType === "all" || l.type === filterType;
      return matchesQuery && matchesType;
    });
  }, [query, filterType, lecturers]);

  const openAdd = () => {
    setSelectedId(null);
    setNewForm(EMPTY_NEW);
    setFormError("");
    setAdding(true);
  };
  const openEdit = (id) => {
    const lec = lecturers.find((l) => l.id === id);
    setAdding(false);
    setSelectedId(id);
    setEditType(lec?.type || "full-time");
    setFormError("");
    setBlocked(null);
    const token = ++openToken.current;
    api
      .getLecturerAvailability(id)
      .then((a) => {
        if (token !== openToken.current) return; // another lecturer was opened meanwhile
        const keys = a.unavailable.map(([d, sl]) => cellKey(d, sl));
        setBlocked(new Set(keys));
        setBlockedBefore([...keys].sort().join(","));
      })
      .catch((err) => {
        if (token !== openToken.current) return;
        setBlocked(new Set());
        setBlockedBefore("");
        setFormError(`Could not load availability: ${err.message}`);
      });
  };
  const closePanel = () => {
    openToken.current++;
    setAdding(false);
    setSelectedId(null);
    setFormError("");
  };

  async function handleAdd() {
    if (newForm.name.trim().length < 2) {
      setFormError("Enter the lecturer's full name.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await api.addLecturer({
        name: newForm.name.trim(),
        email: newForm.email.trim() || null,
        is_part_time: newForm.type === "part-time",
      });
      await load();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleCell(day, slot) {
    if (blocked === null) return;
    const key = cellKey(day, slot);
    const next = new Set(blocked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setBlocked(next);
  }

  async function handleSave() {
    if (!selected) return;
    setBusy(true);
    setFormError("");
    try {
      if (editType !== selected.type) {
        await api.setLecturerPartTime(selected.id, editType === "part-time");
      }
      // Only part-time lecturers have restricted times; a full-time lecturer is free all week.
      if (blocked !== null) {
        const keys = editType === "part-time" ? [...blocked] : [];
        if (keys.sort().join(",") !== blockedBefore) {
          await api.saveLecturerAvailability(
            selected.id,
            keys.map((k) => k.split("-").map(Number)),
          );
        }
      }
      await load();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (
      !confirm(
        `Delete ${selected.name}? Their classes will have no lecturer until you reassign them.`,
      )
    )
      return;
    setBusy(true);
    setFormError("");
    try {
      await api.deleteLecturer(selected.id);
      await load();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const filterBtn = (id, label, count) => (
    <button
      type="button"
      onClick={() => setFilterType(id)}
      className={`rounded px-2.5 py-1 font-medium transition-colors ${filterType === id ? "bg-white text-ink shadow-sm" : "text-ink-3 hover:text-ink"}`}>
      {label} ({count})
    </button>
  );

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="min-w-0 flex-1 flex flex-col basis-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lecturers…"
              aria-label="Search lecturers"
              className="h-[30px] w-72 rounded border border-line bg-white px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded bg-panel p-0.5 border border-line text-xs">
              {filterBtn("all", "All", lecturers.length)}
              {filterBtn(
                "full-time",
                "Full-time",
                lecturers.filter((l) => l.type === "full-time").length,
              )}
              {filterBtn(
                "part-time",
                "Part-time",
                lecturers.filter((l) => l.type === "part-time").length,
              )}
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="h-[30px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors">
              + Add lecturer
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-white flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel text-[11px] text-ink-4">
              <tr>
                <th className="px-3 py-2 font-semibold">Lecturer</th>
                <th className="px-3 py-2 font-semibold">Employment</th>
                <th className="px-3 py-2 font-semibold">Subjects taught</th>
                <th className="px-3 py-2 font-semibold">Weekly hours</th>
                <th className="px-3 py-2 font-semibold">Availability</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const a = availability(l);
                const isFullTime = l.type === "full-time";
                return (
                  <tr
                    key={l.id}
                    onClick={() => openEdit(l.id)}
                    className={`cursor-pointer border-t border-line-2 transition-colors ${l.id === selectedId ? "bg-navy-50" : "hover:bg-panel"}`}>
                    <td className="px-3 py-2 flex items-center gap-2.5">
                      <div className="size-8 rounded-full bg-navy-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {l.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-ink">{l.name}</div>
                        <div className="text-ink-4 text-[11px]">
                          {l.email || "No login yet"}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${isFullTime ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                        {isFullTime ? "Full-time" : "Part-time"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink-2">
                      {l.subjects.join(", ") || "None"}
                    </td>
                    <td className="px-3 py-2 text-ink-2">
                      {l.hours} / {l.cap} hrs
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={a.tone}>{a.text}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(l.id);
                        }}
                        className="rounded border border-line bg-white px-3 py-1 text-xs text-ink-2 hover:bg-panel transition-colors">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-4">
                    Loading lecturers…
                  </td>
                </tr>
              )}
              {!loading && loadError && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-danger">
                    Could not load lecturers: {loadError}{" "}
                    <button type="button" onClick={retry} className="underline">
                      Retry
                    </button>
                  </td>
                </tr>
              )}
              {!loading && !loadError && lecturers.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-4">
                    No lecturers yet. Click “+ Add lecturer”, or upload the
                    Lecturer Allocation CSV on the Add data page.
                  </td>
                </tr>
              )}
              {!loading &&
                !loadError &&
                lecturers.length > 0 &&
                rows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-ink-4">
                      No lecturers found.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-4">
          {lecturers.length} lecturers total · showing {rows.length}
        </p>
      </div>

      {adding && (
        <aside className="w-[36rem] max-w-[50%] shrink-0 self-start rounded-md border border-line bg-white p-5 overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Add lecturer</h2>
            <button
              type="button"
              onClick={closePanel}
              className="text-ink-4 hover:text-ink text-sm font-bold px-1">
              ✕
            </button>
          </div>

          <label className={labelCls}>
            Full name
            <input
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              placeholder="e.g. Dr Lim Chee Keong"
              className={inputCls}
            />
          </label>

          <label className={`mt-3 ${labelCls}`}>
            School email (optional)
            <input
              type="email"
              value={newForm.email}
              onChange={(e) =>
                setNewForm({ ...newForm, email: e.target.value })
              }
              placeholder="name@peninsulamalaysia.edu.my"
              className={inputCls}
            />
          </label>
          <p className="mt-1 text-[10px] text-ink-4">
            With an email, this lecturer is also allowed to sign in.
          </p>

          <label className={`mt-3 ${labelCls}`}>
            Employment type
            <select
              value={newForm.type}
              onChange={(e) => setNewForm({ ...newForm, type: e.target.value })}
              className={`${inputCls} bg-white`}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
            </select>
          </label>

          {formError && (
            <p className="mt-3 text-[11px] text-danger">{formError}</p>
          )}

          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-3">
            <button
              type="button"
              onClick={closePanel}
              className="h-[28px] rounded border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel transition-colors">
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleAdd}
              className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors disabled:opacity-60">
              {busy ? "Adding…" : "Add lecturer"}
            </button>
          </div>
        </aside>
      )}

      {!adding && selected && (
        <aside className="w-[36rem] max-w-[50%] shrink-0 self-start rounded-md border border-line bg-white p-5 overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Edit lecturer</h2>
            <button
              type="button"
              onClick={closePanel}
              className="text-ink-4 hover:text-ink text-sm font-bold px-1">
              ✕
            </button>
          </div>

          <div className={labelCls}>Full name</div>
          <div className="mt-1 text-xs text-ink">{selected.name}</div>
          <div className={`mt-3 ${labelCls}`}>Email</div>
          <div className="mt-1 text-xs text-ink">
            {selected.email || "No login yet"}
          </div>

          <label className={`mt-3 ${labelCls}`}>
            Employment type
            <select
              value={editType}
              onChange={(e) => setEditType(e.target.value)}
              className={`${inputCls} bg-white`}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
            </select>
          </label>

          <p className={`mt-3 ${labelCls}`}>Subjects taught</p>
          <p className="mt-1 text-xs text-ink-2">
            {selected.subjects.join(", ") || "None assigned yet"}
          </p>
          <p className="mt-1 text-[10px] text-ink-4">
            Subjects come from the imported classes, so change them there.
          </p>

          <p className="mt-3 text-xs text-ink-3">
            {selected.hours} hrs assigned this week
          </p>

          {/* Only part-time lecturers set which times they can teach, so it appears as soon as Part-time is chosen */}
          {editType === "part-time" && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
                Weekly availability — click a cell to toggle
              </div>
              {blocked === null ? (
                <p className="mt-2 text-[11px] text-ink-4">
                  Loading availability…
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1.5 text-center text-[11px]">
                  <div></div>
                  {DAYS.map((d) => (
                    <div key={d} className="font-semibold text-ink-3">
                      {d}
                    </div>
                  ))}
                  {SLOT_LABELS.map((label, i) => (
                    <div key={label} className="contents">
                      <div className="flex items-center justify-end whitespace-nowrap pr-2 text-[10px] text-ink-4">
                        {label}
                      </div>
                      {DAYS.map((_, di) => {
                        const off = blocked.has(cellKey(di + 1, i + 1));
                        return (
                          <button
                            key={di}
                            type="button"
                            onClick={() => toggleCell(di + 1, i + 1)}
                            aria-label={`${DAYS[di]} ${label} ${off ? "unavailable" : "available"}`}
                            className={`flex h-7 items-center justify-center rounded border text-[10px] font-medium transition-all hover:opacity-80 ${off ? "border-red-300 bg-[#FBE2E6] text-danger" : "border-emerald-300 bg-emerald-50 text-emerald-700"}`}>
                            {off ? "off" : "avail"}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[10px] text-ink-4">
                Each row is one hour, from 08:30 to 18:30. “off” means the
                scheduler will not place a class there.
              </p>
            </div>
          )}

          {formError && (
            <p className="mt-3 text-[11px] text-danger">{formError}</p>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleDelete}
              className="h-[28px] rounded border border-danger/40 bg-white px-2.5 text-xs font-semibold text-danger hover:bg-red-50 transition-colors disabled:opacity-60">
              Delete
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closePanel}
                className="h-[28px] rounded border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel transition-colors">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSave}
                className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors disabled:opacity-60">
                Save changes
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
