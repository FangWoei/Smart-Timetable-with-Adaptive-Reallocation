// src/pages/ManagePeople/RoomsTab.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api.js";
import Badge from "../../components/Badge.jsx";

const ROOM_TYPES = { lecture: "Classroom", lab: "Computer lab" };
const STATUS = {
  available: { label: "Available", tone: "ok" },
  maintenance: { label: "Under maintenance", tone: "warn" },
  out_of_service: { label: "Out of service", tone: "danger" },
};
const EMPTY = {
  code: "",
  name: "",
  capacity: 30,
  room_type: "lecture",
  status: "available",
  remarks: "",
  unavailable_from: "",
  unavailable_to: "",
};
const inputCls =
  "mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal text-ink outline-none focus:border-navy-500";
const labelCls =
  "block text-[11px] font-semibold uppercase tracking-wide text-ink-4";

const toForm = (r) => ({
  code: r.code,
  name: r.name || "",
  capacity: r.capacity,
  room_type: r.room_type,
  status: r.status,
  remarks: r.remarks || "",
  unavailable_from: r.unavailable_from || "",
  unavailable_to: r.unavailable_to || "",
});

export default function RoomsTab() {
  const [query, setQuery] = useState("");
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      setRooms(await api.getRooms());
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
      .getRooms()
      .then((rows) => {
        if (!cancelled) setRooms(rows);
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

  const selected = rooms.find((r) => r.id === selectedId) || null;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rooms.filter(
      (r) =>
        !q ||
        r.code.toLowerCase().includes(q) ||
        (r.name || "").toLowerCase().includes(q) ||
        ROOM_TYPES[r.room_type].toLowerCase().includes(q),
    );
  }, [query, rooms]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const closePanel = () => {
    setAdding(false);
    setSelectedId(null);
    setFormError("");
  };
  const openAdd = () => {
    setSelectedId(null);
    setForm(EMPTY);
    setFormError("");
    setNotice("");
    setAdding(true);
  };
  const openEdit = (r) => {
    setAdding(false);
    setSelectedId(r.id);
    setForm(toForm(r));
    setFormError("");
    setNotice("");
  };

  const details = () => ({
    code: form.code.trim(),
    name: form.name.trim() || null,
    capacity: Number(form.capacity),
    room_type: form.room_type,
    remarks: form.remarks.trim() || null,
  });

  function validate() {
    if (!form.code.trim()) return "Enter the room code.";
    if (!(Number(form.capacity) >= 1)) return "Capacity must be at least 1.";
    if (
      form.status !== "available" &&
      form.unavailable_from &&
      form.unavailable_to &&
      form.unavailable_to < form.unavailable_from
    )
      return "“Back in use” date must be on or after “Out from”.";
    return "";
  }

  async function run(action) {
    const problem = validate();
    if (problem) {
      setFormError(problem);
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await action();
      await load();
    } catch (err) {
      setFormError(err.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    closePanel();
  }

  const handleAdd = () => run(() => api.addRoom(details()));

  const handleSave = () =>
    run(async () => {
      await api.updateRoom(selected.id, details());
      const changed =
        form.status !== selected.status ||
        (form.unavailable_from || "") !== (selected.unavailable_from || "") ||
        (form.unavailable_to || "") !== (selected.unavailable_to || "");
      if (changed) {
        const res = await api.setRoomStatus(selected.id, {
          status: form.status,
          remarks: form.remarks.trim() || null,
          unavailable_from:
            form.status === "available" ? null : form.unavailable_from || null,
          unavailable_to:
            form.status === "available" ? null : form.unavailable_to || null,
        });
        const n = res.affected_classes?.length || 0;
        if (n > 0)
          setNotice(
            `${form.code} is now ${STATUS[form.status].label.toLowerCase()}: ${n} scheduled class${n > 1 ? "es are" : " is"} in this room and need a new room.`,
          );
      }
    });

  async function handleDelete() {
    if (
      !confirm(
        `Delete ${selected.code}? It will be hidden from the timetable; past timetables keep it.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api.deleteRoom(selected.id);
      await load();
      closePanel();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const fields = (
    <>
      <label className={labelCls}>
        Room code
        <input
          value={form.code}
          onChange={(e) => set({ code: e.target.value })}
          placeholder="e.g. L6-01"
          className={inputCls}
        />
      </label>
      <label className={`mt-3 ${labelCls}`}>
        Full name (optional)
        <input
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          className={inputCls}
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className={labelCls}>
          Type
          <select
            value={form.room_type}
            onChange={(e) => set({ room_type: e.target.value })}
            className={`${inputCls} bg-white`}>
            <option value="lecture">Classroom</option>
            <option value="lab">Computer lab</option>
          </select>
        </label>
        <label className={labelCls}>
          Capacity
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => set({ capacity: e.target.value })}
            className={inputCls}
          />
        </label>
      </div>
    </>
  );

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms…"
            aria-label="Search rooms"
            className="h-[30px] w-72 rounded border border-line bg-white px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
          />
          <button
            type="button"
            onClick={openAdd}
            className="h-[30px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 transition-colors">
            + Add room
          </button>
        </div>

        {notice && (
          <div className="mb-3 flex items-start justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span>{notice} Use the Scheduler to reallocate.</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              className="font-bold">
              ✕
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-line bg-white flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel text-[11px] text-ink-4">
              <tr>
                <th className="px-3 py-2 font-semibold">Room</th>
                <th className="px-3 py-2 font-semibold">Type</th>
                <th className="px-3 py-2 font-semibold">Capacity</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                <th className="px-3 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => openEdit(r)}
                  className={`cursor-pointer border-t border-line-2 transition-colors ${r.id === selectedId ? "bg-navy-50" : "hover:bg-panel"}`}>
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{r.code}</div>
                    {r.name && (
                      <div className="text-ink-4 text-[11px]">{r.name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-ink-2">
                    {ROOM_TYPES[r.room_type]}
                  </td>
                  <td className="px-3 py-2 text-ink-2">{r.capacity} seats</td>
                  <td className="px-3 py-2">
                    <Badge tone={STATUS[r.status].tone}>
                      {STATUS[r.status].label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(r);
                      }}
                      className="rounded border border-line bg-white px-3 py-1 text-xs text-ink-2 hover:bg-panel transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {loading && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-ink-4">
                    Loading rooms…
                  </td>
                </tr>
              )}
              {!loading && loadError && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-danger">
                    Could not load rooms: {loadError}{" "}
                    <button type="button" onClick={retry} className="underline">
                      Retry
                    </button>
                  </td>
                </tr>
              )}
              {!loading && !loadError && rooms.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-ink-4">
                    No rooms yet. Click “+ Add room”, or import the classroom
                    list on the Add data page.
                  </td>
                </tr>
              )}
              {!loading &&
                !loadError &&
                rooms.length > 0 &&
                rows.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-ink-4">
                      No rooms found.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-4">
          {rooms.length} rooms total · showing {rows.length}
        </p>
      </div>

      {adding && (
        <aside className="w-80 shrink-0 self-start rounded-md border border-line bg-white p-4 overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Add room</h2>
            <button
              type="button"
              onClick={closePanel}
              className="text-ink-4 hover:text-ink text-sm font-bold px-1">
              ✕
            </button>
          </div>
          {fields}
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
              {busy ? "Adding…" : "Add room"}
            </button>
          </div>
        </aside>
      )}

      {!adding && selected && (
        <aside className="w-80 shrink-0 self-start rounded-md border border-line bg-white p-4 overflow-y-auto max-h-[85vh] shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Edit room</h2>
            <button
              type="button"
              onClick={closePanel}
              className="text-ink-4 hover:text-ink text-sm font-bold px-1">
              ✕
            </button>
          </div>
          {fields}

          <label className={`mt-3 ${labelCls}`}>
            Operational status
            <select
              value={form.status}
              onChange={(e) => set({ status: e.target.value })}
              className={`${inputCls} bg-white`}>
              <option value="available">Available (normal)</option>
              <option value="maintenance">Under maintenance</option>
              <option value="out_of_service">Out of service</option>
            </select>
          </label>

          {form.status !== "available" && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className={labelCls}>
                Out from
                <input
                  type="date"
                  value={form.unavailable_from}
                  onChange={(e) => set({ unavailable_from: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className={labelCls}>
                Back in use
                <input
                  type="date"
                  value={form.unavailable_to}
                  onChange={(e) => set({ unavailable_to: e.target.value })}
                  className={inputCls}
                />
              </label>
              <p className="col-span-2 text-[10px] text-ink-4">
                Leave both empty if it is out until further notice.
              </p>
            </div>
          )}

          <label className={`mt-3 ${labelCls}`}>
            Remarks
            <input
              value={form.remarks}
              onChange={(e) => set({ remarks: e.target.value })}
              className={inputCls}
            />
          </label>

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
