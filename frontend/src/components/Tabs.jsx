/** Underline tabs. Controlled: pass `value` + `onChange`. */
export default function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-5 border-b border-line">
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={[
              '-mb-px border-b-2 px-1 pb-2 pt-1 text-[13px] transition-colors',
              active
                ? 'border-navy-700 font-semibold text-navy-700'
                : 'border-transparent text-ink-3 hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
