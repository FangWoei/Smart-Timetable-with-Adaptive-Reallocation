const TONES = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-panel text-ink-3",
};

export default function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-px text-[10px] font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
