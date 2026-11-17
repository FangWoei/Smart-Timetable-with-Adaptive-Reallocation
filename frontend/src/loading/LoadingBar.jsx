import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./progress.js";

// A thin line across the top of the window with the percentage beside it.
// The percentage follows finished requests and creeps forward while waiting
// (it stops at 90% until everything is really done, then jumps to 100%).
export default function LoadingBar() {
  const { active, total, done } = useSyncExternalStore(subscribe, getSnapshot);
  const [pct, setPct] = useState(0);
  const live = useRef({ active, total, done });
  useEffect(() => {
    live.current = { active, total, done };
  });

  const busy = active > 0;
  const visible = busy || pct > 0;

  useEffect(() => {
    if (busy) {
      const id = setInterval(() => {
        const { total: t, done: d } = live.current;
        const ceiling = Math.min(90, 20 + 70 * (t ? d / t : 0));
        setPct((p) => Math.min(90, p + Math.max(0.4, (ceiling - p) * 0.12)));
      }, 120);
      return () => clearInterval(id);
    }
    // finished: fill the line, then hide it
    const full = setTimeout(() => setPct(100), 0);
    const hide = setTimeout(() => setPct(0), 400);
    return () => {
      clearTimeout(full);
      clearTimeout(hide);
    };
  }, [busy]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[100]" role="progressbar"
      aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
      <div className="h-[3px] w-full bg-navy-100/60">
        <div
          className="h-full bg-navy-500 transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="fixed bottom-4 right-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold tabular-nums text-navy-700 shadow-sm ring-1 ring-line">
        Loading {Math.round(pct)}%
      </div>
    </div>
  );
}
