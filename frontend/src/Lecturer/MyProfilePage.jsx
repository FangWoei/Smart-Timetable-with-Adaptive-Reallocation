// Lecturer: 我的资料 + 每周可用时间（part-time 才能改）
import { useEffect, useMemo, useState } from "react";
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
const initials = (name = "") =>
  name
    .replace(/^(dr|prof|mr|ms|mrs|puan|encik)\.?\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function Stat({ value, unit, caption }) {
  return (
    <div className="rounded-lg bg-panel px-3 py-2.5">
      <div className="text-xl font-bold leading-none text-navy-900">
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-ink-3">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] text-ink-4">{caption}</div>
    </div>
  );
}

export default function MyProfilePage() {
  const { api, email } = useLecturer();
  const [info, setInfo] = useState(null);
  const [hours, setHours] = useState(null);
  const [off, setOff] = useState(new Set());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .myAvailability()
      .then((a) => {
        if (cancelled) return;
        setInfo(a);
        setOff(new Set(a.unavailable.map(([d, s]) => key(d, s))));
      })
      .catch((e) => !cancelled && setError(e.message));
    api
      .myHours()
      .then((h) => !cancelled && setHours(h))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [api]);

  const availableCount = useMemo(() => 5 * SLOTS.length - off.size, [off]);

  if (error) return <div className="p-8 text-sm text-ink-3">{error}</div>;
  if (!info) return <div className="p-8 text-ink-3">Loading…</div>;

  const editable = info.is_part_time;

  const toggle = (d, s) => {
    if (!editable) return;
    setSaved(false);
    setOff((prev) => {
      const next = new Set(prev);
      const k = key(d, s);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const setDay = (d, blocked) => {
    if (!editable) return;
    setSaved(false);
    setOff((prev) => {
      const next = new Set(prev);
      SLOTS.forEach((s) => (blocked ? next.add(key(d, s)) : next.delete(key(d, s))));
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const cells = [...off].map((k) => k.split("-").map(Number));
      const res = await api.saveMyAvailability(cells);
      setOff(new Set(res.unavailable.map(([d, s]) => key(d, s))));
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto grid max-w-5xl items-start gap-5 lg:grid-cols-[300px_1fr]">
        {/* 左：个人信息 */}
        <aside className="rounded-xl border border-line bg-white p-5 shadow-xs">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-navy-700 text-xl font-bold text-white shadow-xs">
              {initials(info.name)}
            </span>
            <h1 className="mt-3 text-base font-semibold text-ink">{info.name}</h1>
            <p className="mt-0.5 break-all text-xs text-ink-3">{email}</p>
            <span
              className={`mt-3 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                info.is_part_time
                  ? "border-[#F3D9A4] bg-[#FDF2DF] text-[#8A6212]"
                  : "border-[#B9D7C8] bg-[#ECF7F1] text-ok"
              }`}>
              {info.is_part_time ? "Part-time" : "Full-time"}
            </span>
            <p className="mt-1.5 text-[11px] text-ink-4">Employment is set by the admin</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Stat value={hours?.per_week ?? "–"} unit="hrs" caption="per week" />
            <Stat value={hours?.semester_total ?? "–"} unit="hrs" caption="this semester" />
          </div>
        </aside>

        {/* 右：每周可用时间 */}
        <section className="rounded-xl border border-line bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Weekly availability</h2>
              <p className="mt-0.5 text-xs text-ink-3">
                {editable
                  ? "Click a time to switch it on or off. The scheduler will not place a class in an “off” time the next time it generates."
                  : "Only part-time lecturers set their available times."}
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <i className="size-3 rounded-sm border border-[#8FD0B0] bg-[#DDF1E6]" /> Available
              </span>
              <span className="flex items-center gap-1.5">
                <i className="size-3 rounded-sm border border-[#F2B8BF] bg-[#FBE2E6]" /> Off
              </span>
            </div>
          </div>

          <div
            className="mt-4 grid gap-1.5"
            style={{ gridTemplateColumns: "88px repeat(5, minmax(0, 1fr))" }}>
            <div />
            {DAYS.map((name, i) => (
              <div key={name} className="text-center">
                <div className="text-xs font-semibold text-ink-2">{name}</div>
                {editable && (
                  <div className="mt-0.5 flex justify-center gap-1.5 text-[10px] text-ink-4">
                    <button type="button" className="hover:text-ok hover:underline" onClick={() => setDay(i + 1, false)}>
                      all on
                    </button>
                    <button type="button" className="hover:text-danger hover:underline" onClick={() => setDay(i + 1, true)}>
                      all off
                    </button>
                  </div>
                )}
              </div>
            ))}

            {SLOTS.map((s) => (
              <Row key={s} slot={s} off={off} editable={editable} onToggle={toggle} />
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-xs text-ink-3">
              <b className="text-ink">{availableCount}</b> of {5 * SLOTS.length} hours available each week
            </span>
            {editable && (
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
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ slot, off, editable, onToggle }) {
  return (
    <>
      <div className="flex items-center whitespace-nowrap text-[11px] text-ink-4">
        {label(slot)}
      </div>
      {[1, 2, 3, 4, 5].map((d) => {
        const isOff = off.has(key(d, slot));
        return (
          <button
            key={d}
            type="button"
            disabled={!editable}
            onClick={() => onToggle(d, slot)}
            aria-pressed={isOff}
            aria-label={`${DAYS[d - 1]} ${label(slot)} ${isOff ? "off" : "available"}`}
            className={`h-8 rounded-md border text-[11px] font-medium transition-colors ${
              isOff
                ? "border-[#F2B8BF] bg-[#FBE2E6] text-danger hover:bg-[#F8D3D9]"
                : "border-[#CBE8D8] bg-[#EEF8F2] text-transparent hover:border-[#8FD0B0] hover:bg-[#DDF1E6] hover:text-ok"
            } ${editable ? "cursor-pointer" : "cursor-default"}`}>
            {isOff ? "off" : "on"}
          </button>
        );
      })}
    </>
  );
}
