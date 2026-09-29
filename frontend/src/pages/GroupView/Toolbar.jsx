const VIEWS = [
  { id: 'group', label: 'By group' },
  { id: 'lecturer', label: 'By lecturer' },
  { id: 'room', label: 'By room' },
]

const ghost =
  'flex h-[30px] items-center gap-1.5 rounded bg-panel px-3 text-xs text-ink-2 hover:bg-line-2 disabled:opacity-40'
const outline =
  'flex h-[30px] items-center gap-1.5 rounded border border-line-strong bg-white px-3 text-[13px] text-ink-2 hover:bg-panel'

function Divider() {
  return <span className="mx-1 h-7 w-px bg-line" aria-hidden />
}

export default function Toolbar({ view, onViewChange, onGenerate, onVerify, onApprove, canApprove }) {
  return (
    <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line bg-white px-3">
      <button
        type="button"
        onClick={onGenerate}
        className="flex h-[30px] items-center gap-2 rounded bg-navy-700 px-4 text-[13px] font-semibold text-white hover:bg-navy-900"
      >
        <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden><path d="M0 0 L10 6 L0 12 Z" fill="currentColor" /></svg>
        Generate
      </button>
      <button type="button" onClick={onVerify} className={outline}>
        <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden>
          <path d="M1 6 l4 4 l8 -9" fill="none" stroke="#2E7D5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Verify
      </button>

      <Divider />

      <button type="button" className={ghost}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 3 L1.5 5.5 L4 8" /><path d="M2 5.5 h6.5 a3.5 3.5 0 0 1 0 7 H5" />
        </svg>
        Undo
      </button>
      <button type="button" className={ghost}>
        Redo
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3 L12.5 5.5 L10 8" /><path d="M12 5.5 h-6.5 a3.5 3.5 0 0 0 0 7 H9" />
        </svg>
      </button>
      <button type="button" className={ghost}>
        <svg width="12" height="14" viewBox="0 0 12 14" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="6" width="10" height="7" rx="1.5" /><path d="M3 6 V4 a3 3 0 0 1 6 0 v2" />
        </svg>
        Lock
      </button>

      <Divider />

      <div role="tablist" aria-label="Timetable view" className="flex rounded bg-panel p-0.5">
        {VIEWS.map((v) => {
          const active = v.id === view
          return (
            <button
              key={v.id}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={[
                'h-[26px] w-[98px] rounded-[3px] text-[13px] transition-colors',
                active
                  ? 'border border-line-strong bg-white font-semibold text-navy-700'
                  : 'border border-transparent text-ink-3 hover:text-ink',
              ].join(' ')}
            >
              {v.label}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={() => window.print()} className={outline}>Print</button>
        <button type="button" className={outline}>Export</button>
        <button
          type="button"
          onClick={onApprove}
          disabled={!canApprove}
          className="flex h-[30px] items-center rounded bg-ok px-4 text-[13px] font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Approve draft
        </button>
      </div>
    </div>
  )
}
