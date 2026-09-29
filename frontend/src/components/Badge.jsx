const TONES = {
  ok: 'bg-[#E4F1EA] text-ok',
  warn: 'bg-[#FDF2DF] text-[#8A6212]',
  danger: 'bg-[#FBE2E6] text-danger',
  neutral: 'bg-panel text-ink-3',
}

export default function Badge({ tone = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-px text-[10px] font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  )
}
