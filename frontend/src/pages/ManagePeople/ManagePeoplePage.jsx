import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Tabs from '../../components/Tabs.jsx'
import Badge from '../../components/Badge.jsx'
import { LECTURERS } from '../../data/people.js'

const TABS = [
  { id: 'lecturers', label: 'Lecturers' },
  { id: 'students', label: 'Students' },
  { id: 'subjects', label: 'Subjects' },
]

function availability(l) {
  if (l.hours >= l.cap) return { tone: 'danger', text: 'full' }
  if (l.hours / l.cap >= 0.85) return { tone: 'warn', text: 'near limit' }
  return { tone: 'ok', text: 'open' }
}

function LecturersTab() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(LECTURERS[0].id)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return LECTURERS.filter((l) => !q || l.name.toLowerCase().includes(q) || l.email.includes(q))
  }, [query])
  const selected = LECTURERS.find((l) => l.id === selectedId)

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lecturers…"
            aria-label="Search lecturers"
            className="h-[30px] w-72 rounded border border-line bg-white px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
          />
          <button type="button" className="ml-auto h-[30px] rounded bg-navy-700 px-4 text-[13px] font-semibold text-white hover:bg-navy-900">
            Add lecturer
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-line bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-panel text-[11px] text-ink-4">
              <tr>
                <th className="px-3 py-2 font-semibold">Lecturer</th>
                <th className="px-3 py-2 font-semibold">Subjects taught</th>
                <th className="px-3 py-2 font-semibold">Weekly hours</th>
                <th className="px-3 py-2 font-semibold">Availability</th>
                <th className="px-3 py-2 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => {
                const a = availability(l)
                const active = l.id === selectedId
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`cursor-pointer border-t border-line-2 ${active ? 'bg-navy-50' : 'hover:bg-panel'}`}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink">{l.name}</div>
                      <div className="text-ink-4">{l.email}</div>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{l.subjects.join(', ')}</td>
                    <td className="px-3 py-2 text-ink-2">{l.hours} / {l.cap} hrs</td>
                    <td className="px-3 py-2"><Badge tone={a.tone}>{a.text}</Badge></td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-navy-700 hover:underline">Edit</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-ink-4">47 lecturers total · showing {rows.length}</p>
      </div>

      {selected && (
        <aside key={selected.id} className="hidden w-72 shrink-0 self-start rounded-md border border-line bg-white p-4 lg:block">
          <h2 className="text-sm font-semibold text-ink">Edit lecturer</h2>
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Full name
            <input defaultValue={selected.name} className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal normal-case tracking-normal text-ink outline-none focus:border-navy-500" />
          </label>
          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Email
            <input defaultValue={selected.email} className="mt-1 h-[30px] w-full rounded border border-line px-2 text-xs font-normal normal-case tracking-normal text-ink outline-none focus:border-navy-500" />
          </label>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Subjects this lecturer can teach</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {selected.subjects.map((s) => (
              <span key={s} className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] text-navy-700">{s} ×</span>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="h-[28px] rounded border border-line-strong px-3 text-xs text-ink-2 hover:bg-panel">Cancel</button>
            <button type="button" className="h-[28px] rounded bg-navy-700 px-3 text-xs font-semibold text-white hover:bg-navy-900">Save changes</button>
          </div>
        </aside>
      )}
    </div>
  )
}

export default function ManagePeoplePage() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'lecturers'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line bg-white px-6 pt-3">
        <Tabs tabs={TABS} value={tab} onChange={(id) => setParams({ tab: id })} label="People and resources" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
        {tab === 'lecturers' ? (
          <LecturersTab />
        ) : (
          <div className="rounded-md border border-dashed border-line-strong bg-white p-8 text-center text-xs text-ink-4">
            {TABS.find((t) => t.id === tab).label} table goes here
          </div>
        )}
      </div>
    </div>
  )
}
