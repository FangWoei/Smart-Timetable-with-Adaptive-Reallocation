// src/pages/GroupView/ExportDialog.jsx
// Pick which groups / lecturers / rooms to download as PDF.
import { useEffect, useMemo, useState } from "react";

const NOUN = { group: "groups", lecturer: "lecturers", room: "rooms" };

export default function ExportDialog({ targets, view, onClose, onConfirm }) {
  const [picked, setPicked] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const noun = NOUN[view] ?? "items";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? targets.filter((t) => t.id.toLowerCase().includes(q)) : targets;
  }, [targets, query]);

  const allShownPicked =
    shown.length > 0 && shown.every((t) => picked.has(t.id));

  const toggle = (id) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleShown = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      shown.forEach((t) =>
        allShownPicked ? next.delete(t.id) : next.add(t.id),
      );
      return next;
    });

  const count = picked.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Download timetables"
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-line bg-surface shadow-lg">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-base font-bold text-heading">
            Download timetables
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Choose the {noun} you want. One choice downloads a PDF; several are
            packed into a .zip.
          </p>
        </div>

        <div className="flex items-center gap-2 px-5 pt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${noun}…`}
            className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-panel px-3 text-xs text-ink outline-none focus:border-navy-500"
          />
          <button
            type="button"
            onClick={toggleShown}
            className="h-9 shrink-0 rounded-xl border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel">
            {allShownPicked ? "Clear" : "Select all"}
          </button>
        </div>

        <ul className="mt-3 min-h-0 flex-1 overflow-y-auto border-t border-line px-2 py-1">
          {shown.length === 0 && (
            <li className="p-6 text-center text-xs text-ink-4">
              Nothing matches “{query}”.
            </li>
          )}
          {shown.map((t) => (
            <li key={t.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-ink hover:bg-panel">
                <input
                  type="checkbox"
                  checked={picked.has(t.id)}
                  onChange={() => toggle(t.id)}
                  className="size-4 accent-navy-700"
                />
                <span className="min-w-0 flex-1 truncate">{t.id}</span>
                <span className="text-[11px] text-ink-4">
                  {t.lessons.length} lesson{t.lessons.length === 1 ? "" : "s"}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-line px-5 py-3">
          <span className="text-xs text-ink-3">{count} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel">
              Cancel
            </button>
            <button
              type="button"
              disabled={count === 0}
              onClick={() => onConfirm(targets.filter((t) => picked.has(t.id)))}
              className="h-9 rounded-xl bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50">
              {count === 1
                ? "Download PDF"
                : `Download ${count || ""} PDFs (.zip)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
