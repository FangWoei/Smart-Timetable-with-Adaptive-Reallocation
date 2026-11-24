// A date box that opens our own calendar (instead of the browser's plain one).
// value / onChange use "YYYY-MM-DD" text, the same as <input type="date">.
// rangeStart / rangeEnd only colour the days in between, so the semester shows up.
import { useEffect, useRef, useState } from "react";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const show = (s) =>
  parse(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const Chevron = ({ dir }) => (
  <svg
    className="h-4 w-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <path d={dir === "left" ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
  </svg>
);

export default function DatePicker({
  label,
  value,
  onChange,
  disableUntil, // days up to and including this date cannot be chosen
  rangeStart,
  rangeEnd,
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ y: 0, m: 0 });
  const box = useRef(null);

  // Click outside or Escape closes the calendar
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      // open on the month of the chosen date (or the one after the start date, or today)
      const base = value
        ? parse(value)
        : disableUntil
          ? parse(disableUntil)
          : new Date();
      setView({ y: base.getFullYear(), m: base.getMonth() });
    }
    setOpen(!open);
  }

  function move(step) {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }

  // 6 weeks of days, Monday first
  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = Array.from(
    { length: 42 },
    (_, i) => new Date(view.y, view.m, 1 - offset + i),
  );
  const today = iso(new Date());
  const years = Array.from({ length: 11 }, (_, i) => view.y - 5 + i);

  const nav =
    "flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-panel hover:text-ink";
  const pickBox =
    "h-8 rounded-lg border border-line bg-surface px-2 text-sm font-semibold text-ink outline-none hover:border-line-strong focus:border-navy-500";

  return (
    <div ref={box} className="relative">
      <span className="mb-2 block text-xs font-semibold text-ink-2">
        {label}
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative flex h-12 w-full items-center rounded-xl border bg-surface pl-11 pr-3 text-left text-sm shadow-sm outline-none transition hover:border-line-strong focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10 ${
          open ? "border-navy-500 ring-4 ring-navy-500/10" : "border-line"
        }`}>
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span className={value ? "text-ink" : "text-ink-4"}>
          {value ? show(value) : "Pick a date"}
        </span>
      </button>
      <span className="mt-1.5 block h-4 text-[11px] text-ink-4">
        {value
          ? parse(value).toLocaleDateString("en-GB", { weekday: "long" })
          : ""}
      </span>

      {open && (
        <div
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()}`}
          className="absolute left-0 top-[76px] z-50 w-[304px] rounded-2xl border border-line bg-surface p-3 shadow-2xl">
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous month"
              className={nav}>
              <Chevron dir="left" />
            </button>
            <select
              aria-label="Month"
              value={view.m}
              onChange={(e) => setView({ ...view, m: Number(e.target.value) })}
              className={`${pickBox} flex-1`}>
              {MONTHS.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={view.y}
              onChange={(e) => setView({ ...view, y: Number(e.target.value) })}
              className={pickBox}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next month"
              className={nav}>
              <Chevron dir="right" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {WEEK.map((w, i) => (
              <span
                key={w}
                className={`py-1.5 text-[11px] font-semibold uppercase ${i > 4 ? "text-ink-4" : "text-ink-3"}`}>
                {w}
              </span>
            ))}
            {days.map((d) => {
              const s = iso(d);
              const thisMonth = d.getMonth() === view.m;
              const selected = s === value;
              const disabled = disableUntil ? s <= disableUntil : false;
              const inRange =
                rangeStart && rangeEnd && s > rangeStart && s < rangeEnd;
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                  aria-label={show(s)}
                  aria-pressed={selected}
                  className={[
                    "m-0.5 flex h-9 items-center justify-center rounded-lg text-[13px] transition-colors",
                    selected
                      ? "bg-navy-700 font-bold text-white shadow-sm"
                      : inRange
                        ? "bg-tint text-navy-700 hover:bg-navy-100"
                        : "hover:bg-panel",
                    !selected && !inRange
                      ? !thisMonth
                        ? "text-ink-4/50"
                        : weekend
                          ? "text-ink-4"
                          : "text-ink"
                      : "",
                    s === today && !selected
                      ? "ring-1 ring-inset ring-navy-500"
                      : "",
                    disabled
                      ? "cursor-not-allowed opacity-30 hover:bg-transparent"
                      : "",
                  ].join(" ")}>
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                setView({ y: t.getFullYear(), m: t.getMonth() });
              }}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-navy-700 hover:bg-panel">
              Today
            </button>
            <span className="text-[11px] text-ink-4">
              {rangeStart && rangeEnd ? "Shaded days = the semester" : ""}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
