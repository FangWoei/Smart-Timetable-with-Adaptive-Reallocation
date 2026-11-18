// 左边的个人信息卡（Full-time 和 Part-time 共用）
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
      <div className="text-xl font-bold leading-none text-heading">
        {value}
        {unit && <span className="ml-0.5 text-xs font-medium text-ink-3">{unit}</span>}
      </div>
      <div className="mt-1 text-[11px] text-ink-4">{caption}</div>
    </div>
  );
}

export default function ProfileCard({ info, email, hours }) {
  const pt = info.is_part_time;
  return (
    <aside className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-navy-700 text-xl font-bold text-white shadow-xs">
          {initials(info.name)}
        </span>
        <h1 className="mt-3 text-base font-semibold text-ink">{info.name}</h1>
        <p className="mt-0.5 break-all text-xs text-ink-3">{email}</p>
        <span
          className={`mt-3 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            pt ? "bg-warn-soft text-warn-ink" : "bg-ok-soft text-ok"
          }`}>
          {pt ? "Part-time" : "Full-time"}
        </span>
        <p className="mt-1.5 text-[11px] text-ink-4">Employment is set by the admin</p>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <Stat value={hours?.per_week ?? "–"} unit="hrs" caption="per week" />
        <Stat value={hours?.semester_total ?? "–"} unit="hrs" caption="this semester" />
      </div>
    </aside>
  );
}
