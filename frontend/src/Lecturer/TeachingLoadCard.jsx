// Full-time：不用设可用时间，这里显示教学时数（每天 / 每月）
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

function Bar({ label, value, max }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="w-20 shrink-0 text-ink-3">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-panel">
        <div
          className="h-full rounded-full bg-navy-600"
          style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-medium text-ink">{value}h</span>
    </div>
  );
}

export default function TeachingLoadCard({ hours }) {
  const perDay = DAYS.map((d, i) => ({ label: d, value: hours?.per_day?.[i + 1] ?? 0 }));
  const dayMax = Math.max(8, ...perDay.map((d) => d.value));
  const months = Object.entries(hours?.per_month ?? {}).sort(([a], [b]) => a.localeCompare(b));
  const monthMax = Math.max(1, ...months.map(([, v]) => v));

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <h2 className="text-sm font-semibold text-ink">Teaching load</h2>
      <p className="mt-0.5 text-xs text-ink-3">
        As a full-time lecturer you do not need to set your available times. Your classes are placed by
        the admin; you can see them under My timetable.
      </p>

      <h3 className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Hours per day</h3>
      <div className="mt-2 space-y-2">
        {perDay.map((d) => (
          <Bar key={d.label} {...d} max={dayMax} />
        ))}
      </div>

      <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
        Hours per month (holidays left out)
      </h3>
      {months.length === 0 ? (
        <p className="mt-2 text-xs text-ink-4">Semester dates have not been set yet.</p>
      ) : (
        <div className="mt-2 space-y-2">
          {months.map(([ym, v]) => (
            <Bar key={ym} label={monthName(ym)} value={v} max={monthMax} />
          ))}
        </div>
      )}
    </section>
  );
}
