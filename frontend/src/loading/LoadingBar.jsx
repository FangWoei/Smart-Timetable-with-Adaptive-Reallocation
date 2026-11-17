import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./progress.js";

const SHOW_AFTER_MS = 150; // quick calls never flash the overlay
const RING = 2 * Math.PI * 38; // circumference of the progress ring

// While anything is loading, the whole screen is covered by a see-through
// layer (so nothing can be clicked) with a progress ring and the percentage
// in the middle. Dots orbit the ring. The percentage follows finished requests
// and creeps forward while waiting; it holds at 90% until everything is done.
export default function LoadingBar() {
  const { active, total, done } = useSyncExternalStore(subscribe, getSnapshot);
  const [pct, setPct] = useState(0);
  const [shown, setShown] = useState(false);
  const live = useRef({ active, total, done });
  useEffect(() => {
    live.current = { active, total, done };
  });

  const busy = active > 0;

  useEffect(() => {
    if (busy) {
      const show = setTimeout(() => {
        setShown(true);
        document.activeElement?.blur?.(); // Enter / Space cannot trigger a button underneath
      }, SHOW_AFTER_MS);
      const id = setInterval(() => {
        const { total: t, done: d } = live.current;
        const ceiling = Math.min(90, 20 + 70 * (t ? d / t : 0));
        setPct((p) => {
          const from = p >= 100 ? 20 : p;
          return Math.min(90, from + Math.max(0.4, (ceiling - from) * 0.12));
        });
      }, 120);
      return () => {
        clearTimeout(show);
        clearInterval(id);
      };
    }
    // finished: fill the ring, then hide
    const full = setTimeout(() => setPct(100), 0);
    const hide = setTimeout(() => {
      setShown(false);
      setPct(0);
    }, 400);
    return () => {
      clearTimeout(full);
      clearTimeout(hide);
    };
  }, [busy]);

  if (!shown) return null;
  const value = Math.round(pct);
  return (
    <div
      className="fixed inset-0 z-[100] flex cursor-wait items-center justify-center bg-white/60 backdrop-blur-[2px]"
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}>
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-xl ring-1 ring-line">
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              strokeWidth="3"
              className="stroke-navy-100"
            />
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className="stroke-navy-500 transition-[stroke-dashoffset] duration-200"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - pct / 100)}
              transform="rotate(-90 50 50)"
            />
          </svg>
          {/* outer dot */}
          <div className="absolute inset-0 animate-[orbit_1.4s_linear_infinite] motion-reduce:animate-none">
            <span className="absolute left-1/2 top-[12%] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy-700 shadow" />
          </div>
          {/* inner dot, the other way round */}
          <div className="absolute inset-0 animate-[orbit_2.2s_linear_infinite_reverse] motion-reduce:animate-none">
            <span className="absolute left-1/2 top-[26%] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy-200" />
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums text-navy-900">
            {value}%
          </span>
        </div>
        <p className="text-sm font-medium text-ink-2">Loading, please wait…</p>
      </div>
    </div>
  );
}
