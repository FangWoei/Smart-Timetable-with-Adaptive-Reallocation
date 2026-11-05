// src/pages/ManagePeople/SubjectsTab.jsx
// "Subjects" are the classes imported from the Course Listing.
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";

const inputCls =
  "mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-wide text-ink-4";

const groupsOf = (c) =>
  (c.class_groups || []).map((g) => g.intake_groups?.code).filter(Boolean);

export default function SubjectsTab() {
  const [query, setQuery] = useState("");
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  async function load() {
    try {
      setClasses(await api.getClasses());
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
      .getClasses()
      .then((rows) => {
        if (!cancelled) setClasses(rows);
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

  const selected = classes.find((c) => c.id === selectedId) || null;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classes.filter(
      (c) =>
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.module_name.toLowerCase().includes(q) ||
        (c.lecturers?.name || "").toLowerCase().includes(q) ||
        groupsOf(c).some((g) => g.toLowerCase().includes(q)),
    );
  }, [query, classes]);

  const closePanel = () => {
    setSelectedId(null);
    setForm(null);
    setFormError("");
  };
  const openEdit = (c) => {
    setSelectedId(c.id);
    setForm({
      weekly_hours: c.weekly_hours,
      session_length: c.session_length,
      students: c.students ?? "",
      needs_lab: !!c.needs_lab,
    });
    setFormError("");
  };

  async function handleSave() {
    const hours = Number(form.weekly_hours);
    const length = Number(form.session_length);
    if (!(hours >= 1 && hours <= 20)) {
      setFormError("Hours per week must be 1 to 20.");
      return;
    }
    if (!(length >= 1 && length <= 4)) {
      setFormError("Session length must be 1 to 4 hours.");
      return;
    }
    const body = {
      weekly_hours: hours,
      session_length: length,
      needs_lab: form.needs_lab,
    };
    if (form.students !== "") {
      const n = Number(form.students);
      if (!(n >= 1 && n <= 500)) {
        setFormError("Students must be 1 to 500.");
        return;
      }
      body.students = n;
    }
    setBusy(true);
    setFormError("");
    try {
      await api.updateClass(selected.id, body);
      await load();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="mb-3 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search subjects, lecturers or groups…"
            aria-label="Search subjects"
            className="h-[30px] w-72 rounded border border-line bg-white px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
          />
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-white flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel text-[11px] text-ink-4">
              <tr>
                <th className="px-3 py-2 font-semibold">Subject</th>
                <th className="px-3 py-2 font-semibold">Groups</th>
                <th className="px-3 py-2 font-semibold">Lecturer</th>
                <th className="px-3 py-2 font-semibold">Hours / week</th>
                <th className="px-3 py-2 font-semibold">Room</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openEdit(c)}
                  className={`cursor-pointer border-t border-line-2 transition-colors ${c.id === selectedId ? "bg-navy-50" : "hover:bg-panel"}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{c.module_name}</div>
                    <div className="text-ink-4 text-[11px]">{c.code}</div>
                  </td>
                  <td className="px-3 py-2 text-ink-2">
                    {groupsOf(c).join(", ") || "None"}
                  </td>
                  <td className="px-3 py-2 text-ink-2">
                    {c.lecturers?.name || "Not assigned"}
                  </td>
                  <td className="px-3 py-2 text-ink-2">
                    {c.weekly_hours} h/wk
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full bg-panel px-2 py-0.5 text-[11px] text-ink-2 font-medium border border-line">
                      {c.needs_lab ? "Computer lab" : "Classroom"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(c);
                      }}
                      className="rounded border border-line bg-white px-3 py-1 text-xs text-ink-2 hover:bg-panel transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-4">
                    Loading subjects…
                  </td>
                </tr>
              )}
              {!loading && loadError && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-danger">
                    Could not load subjects: {loadError}{" "}
                    <button type="button" onClick={retry} className="underline">
                      Retry
                    </button>
                  </td>
                </tr>
              )}
              {!loading && !loadError && classes.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-ink-4">
                    No subjects yet. Upload the Course Listing on the Add data
                    page.
                  </td>
                </tr>
              )}
              {!loading &&
                !loadError &&
                classes.length > 0 &&
                rows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-ink-4">
                      No subjects found.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-4">
          {classes.length} subjects total · showing {rows.length}
        </p>
      </div>

      {selected && form && (
        <aside className="w-80 shrink-0 self-start rounded-md border border-line bg-white p-4 overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Edit subject</h2>
            <button
              type="button"
              onClick={closePanel}
              className="text-ink-4 hover:text-ink text-sm font-bold px-1">
              ✕
            </button>
          </div>

          <div className="text-xs font-medium text-ink">
            {selected.module_name}
          </div>
          <div className="text-[11px] text-ink-4">{selected.code}</div>
          <p className="mt-2 text-[11px] text-ink-3">
            {selected.lecturers?.name || "No lecturer"} ·{" "}
            {groupsOf(selected).join(", ") || "no groups"}
          </p>
          <p className="mt-1 text-[10px] text-ink-4">
            Lecturer and groups come from the imported Course Listing.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className={labelCls}>
              Hours / week
              <input
                type="number"
                min="1"
                max="20"
                value={form.weekly_hours}
                onChange={(e) =>
                  setForm({ ...form, weekly_hours: e.target.value })
                }
                className={inputCls}
              />
            </label>
            <label className={labelCls}>
              Session length (h)
              <input
                type="number"
                min="1"
                max="4"
                value={form.session_length}
                onChange={(e) =>
                  setForm({ ...form, session_length: e.target.value })
                }
                className={inputCls}
              />
            </label>
          </div>

          <label className={`mt-3 ${labelCls}`}>
            Students
            <input
              type="number"
              min="1"
              max="500"
              value={form.students}
              onChange={(e) => setForm({ ...form, students: e.target.value })}
              placeholder="Auto (total of the groups)"
              className={inputCls}
            />
          </label>

          <label className="mt-3 flex items-center gap-2 text-xs text-ink-2">
            <input
              type="checkbox"
              checked={form.needs_lab}
              onChange={(e) =>
                setForm({ ...form, needs_lab: e.target.checked })
              }
            />
            Needs a computer lab
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
              onClick={handleSave}
              className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors disabled:opacity-60">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
