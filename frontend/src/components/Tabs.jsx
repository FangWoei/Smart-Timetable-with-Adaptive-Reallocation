// src/components/Tabs.jsx
export default function Tabs({ tabs, value, onChange, label }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 items-center pb-2">
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
              'h-[28px] px-4 rounded-md text-xs transition-colors flex items-center justify-center min-w-[90px]',
              active
                ? 'bg-[#EBF1F6] text-[#1B365D] font-medium shadow-sm' 
                : 'bg-panel text-ink-3 hover:bg-line-2 hover:text-ink font-medium',
            ].join(' ')}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}