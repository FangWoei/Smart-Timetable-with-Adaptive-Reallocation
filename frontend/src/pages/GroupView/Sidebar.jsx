import { useMemo, useState } from 'react'
import { CONSTRAINTS, RESOURCES } from '../../data/timetable.js'

const sectionLabel = 'px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-4'

export default function Sidebar({ groups, selectedId, onSelect }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(true)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? groups.filter((g) => g.id.toLowerCase().includes(q)) : groups
  }, [groups, query])

  return (
    <aside className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white">
      <div className="p-3">
        <label className="flex h-[30px] items-center gap-2 rounded border border-line bg-panel px-2.5 focus-within:border-navy-500">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="#8592A3" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5 L13 13" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups, subjects…"
            aria-label="Search groups and subjects"
            className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-4"
          />
        </label>
      </div>

      <div className={sectionLabel.replace('pt-4', 'pt-1')}>Intakes</div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 px-3 py-1.5 text-left text-[13px] font-semibold text-ink hover:bg-panel"
      >
        <svg
          width="8" height="8" viewBox="0 0 8 8" aria-hidden
          className={`text-ink-3 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path d="M1 0 L7 4 L1 8 Z" fill="currentColor" />
        </svg>
        <span>January 2026</span>
        <span className="ml-auto text-[11px] font-normal text-ink-4">{groups.length}</span>
      </button>

      {open && (
        <ul>
          {filtered.map((g) => {
            const active = g.id === selectedId
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onSelect(g.id)}
                  aria-current={active ? 'true' : undefined}
                  className={[
                    'flex h-[26px] w-full items-center border-l-[3px] pl-[39px] pr-3 text-left text-xs',
                    active
                      ? 'border-navy-700 bg-navy-50 font-semibold text-navy-700'
                      : 'border-transparent text-ink-2 hover:bg-panel',
                  ].join(' ')}
                >
                  {g.id}
                  <span
                    className={[
                      'ml-auto text-[11px] font-normal',
                      g.alert ? 'text-danger' : active ? 'text-navy-700' : 'text-ink-4',
                    ].join(' ')}
                  >
                    {g.count}{g.alert && ' !'}
                  </span>
                </button>
              </li>
            )
          })}
          {filtered.length === 0 && <li className="px-10 py-2 text-xs text-ink-4">No groups match</li>}
        </ul>
      )}

      <hr className="mx-3 mt-3 border-line-2" />
      <div className={sectionLabel}>Resources</div>
      <ul>
        {RESOURCES.map((r) => (
          <li key={r.label}>
            <button type="button" className="flex h-7 w-full items-center px-3 text-[13px] text-ink-2 hover:bg-panel">
              {r.label}
              <span className="ml-auto text-[11px] text-ink-4">{r.count}</span>
            </button>
          </li>
        ))}
      </ul>

      <hr className="mx-3 mt-3 border-line-2" />
      <div className={sectionLabel}>Constraints</div>
      <ul>
        {CONSTRAINTS.map((c) => (
          <li key={c.label}>
            <button
              type="button"
              className={`flex h-7 w-full items-center px-3 text-[13px] hover:bg-panel ${c.soft ? 'text-[#8A6212]' : 'text-ink-2'}`}
            >
              {c.label}
              {c.soft && (
                <span className="ml-auto rounded-full bg-[#FDF2DF] px-2 py-px text-[10px] font-semibold">soft</span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-auto p-3">
        <button
          type="button"
          className="h-[34px] w-full rounded border border-dashed border-line-strong text-[13px] text-ink-3 hover:bg-panel"
        >
          + Add constraint
        </button>
      </div>
    </aside>
  )
}
