// Part-time：每周可用时间（点格子切换，可以保存）
import { useMemo, useState } from "react";
import { useLecturer } from "./LecturerContext.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SLOTS = Array.from({ length: 10 }, (_, i) => i + 1);
const hhmm = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const label = (slot) => {
  const s = 8 * 60 + 30 + (slot - 1) * 60;
  return `${hhmm(s)} – ${hhmm(s + 60)}`;
};
const key = (d, s) => `${d}-${s}`;
const toSet = (cells) => new Set(cells.map(([d, s]) => key(d, s)));

export default function AvailabilityCard({ initial }) {
  const { api } = useLecturer();
  const [off, setOff] = useState(() => toSet(initial));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const availableCount = useMemo(() => 5 * SLOTS.length - off.size, [off]);

  const change = (fn) => {
    setSaved(false);
    setOff((prev) => {
      const next = new Set(prev);
      fn(next);
      return next;
    });
  };
  const toggle = (d, s) =>
    change((n) => (n.has(key(d, s)) ? n.delete(key(d, s)) : n.add(key(d, s))));
  const setDay = (d, blocked) =>
    change((n) => SLOTS.forEach((s) => (blocked ? n.add(key(d, s)) : n.delete(key(d, s)))));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api.saveMyAvailability([...off].map((k) => k.split("-").map(Number)));
      setOff(toSet(res.unavailable));
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Weekly availability</h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Click a time to switch it on or off. The scheduler will not place a class in an “off”
            time the next time it generates.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <i className="size-3 rounded-sm border border-ok/40 bg-ok-soft" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-3 rounded-sm border border-danger/40 bg-danger-soft" /> Off
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-1.5" style={{ gridTemplateColumns: "88px repeat(5, minmax(0, 1fr))" }}>
        <div />
        {DAYS.map((name, i) => (
          <div key={name} className="text-center">
            <div className="text-xs font-semibold text-ink-2">{name}</div>
            <div className="mt-0.5 flex justify-center gap-1.5 text-[10px] text-ink-4">
              <button type="button" className="hover:text-ok hover:underline" onClick={() => setDay(i + 1, false)}>
                all on
              </button>
              <button type="button" className="hover:text-danger hover:underline" onClick={() => setDay(i + 1, true)}>
                all off
              </button>
            </div>
          </div>
        ))}

        {SLOTS.map((s) => (
          <Row key={s} slot={s} off={off} onToggle={toggle} />
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-ink-3">
          <b className="text-ink">{availableCount}</b> of {5 * SLOTS.length} hours available each week
        </span>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-ok">Saved.</span>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-8 rounded bg-navy-700 px-4 text-xs font-semibold text-white transition-colors hover:bg-navy-900 disabled:opacity-50">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </section>
  );
}

function Row({ slot, off, onToggle }) {
  return (
    <>
      <div className="flex items-center whitespace-nowrap text-[11px] text-ink-4">{label(slot)}</div>
      {[1, 2, 3, 4, 5].map((d) => {
        const isOff = off.has(key(d, slot));
        return (
          <button
            key={d}
            type="button"
            onClick={() => onToggle(d, slot)}
            aria-pressed={isOff}
            aria-label={`${DAYS[d - 1]} ${label(slot)} ${isOff ? "off" : "available"}`}
            className={`h-8 cursor-pointer rounded-md border text-[11px] font-medium transition-colors ${
              isOff
                ? "border-danger/40 bg-danger-soft text-danger"
                : "border-ok/25 bg-ok-soft text-transparent hover:border-ok/60 hover:text-ok"
            }`}>
            {isOff ? "off" : "on"}
          </button>
        );
      })}
    </>
  );
}
