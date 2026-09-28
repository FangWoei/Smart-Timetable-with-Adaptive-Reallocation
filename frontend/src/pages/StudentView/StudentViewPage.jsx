import { useMemo, useState } from 'react'
import Badge from '../../components/Badge.jsx'
import { STUDENTS } from '../../data/people.js'

export default function StudentViewPage() {
  const [query, setQuery] = useState('')
  const [retakeOnly, setRetakeOnly] = useState(false)
  const [selectedId, setSelectedId] = useState(STUDENTS[0].id)

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STUDENTS.filter(
      (s) => (!retakeOnly || s.retake) && (!q || s.id.includes(q) || s.name.toLowerCase().includes(q)),
    )
  }, [query, retakeOnly])

  const student = STUDENTS.find((s) => s.id === selectedId)
  const retakes = STUDENTS.filter((s) => s.retake).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-white px-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student ID or name…"
          aria-label="Search students"
          className="h-[30px] w-72 rounded border border-line bg-panel px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
        />
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={retakeOnly} onChange={(e) => setRetakeOnly(e.target.checked)} />
          Retake students only
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" className="h-[30px] rounded border border-line-strong bg-white px-3 text-[13px] text-ink-2 hover:bg-panel">
            Bulk-assign retakes
          </button>
          <button type="button" className="h-[30px] rounded border border-line-strong bg-white px-3 text-[13px] text-ink-2 hover:bg-panel">
            Export student list
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[260px] shrink-0 flex-col border-r border-line bg-white">
          <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Students — DB2601A ({STUDENTS.length})
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {list.map((s) => {
              const active = s.id === selectedId
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-current={active ? 'true' : undefined}
                    className={[
                      'flex h-8 w-full items-center gap-2 border-l-[3px] px-3 text-left text-xs',
                      active ? 'border-navy-700 bg-navy-50 font-semibold text-navy-700' : 'border-transparent text-ink-2 hover:bg-panel',
                    ].join(' ')}
                  >
                    <span className="w-14 text-ink-4">{s.id}</span>
                    <span className="truncate">{s.short}</span>
                    {s.retake && <span className="ml-auto"><Badge tone="warn">RT</Badge></span>}
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="px-4 py-3 text-xs text-ink-4">No students match</li>}
          </ul>
          <div className="border-t border-line-2 px-3 py-2 text-[11px] text-ink-4">
            {STUDENTS.length} shown · {retakes} on retake
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-4">
          {student && (
            <>
              <div className="mb-3 flex items-start gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Student ID {student.id}</p>
                  <h1 className="text-lg font-semibold text-ink">{student.name}</h1>
                  <p className="text-xs text-ink-3">Base group {student.group} · {student.programme}</p>
                </div>
                {student.retake && (
                  <span className="mt-1"><Badge tone="warn">Retaking {student.retakeSubjects.length} subject</Badge></span>
                )}
              </div>
              {/* TODO: reuse <TimetableGrid> once it supports a time-of-day axis */}
              <div className="flex h-72 items-center justify-center rounded-md border border-dashed border-line-strong bg-white text-xs text-ink-4">
                Weekly timetable for this student goes here
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
