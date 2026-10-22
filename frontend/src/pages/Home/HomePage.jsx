import { Link } from 'react-router-dom'

const STATS = [
  { label: 'Active intakes', value: '12', note: '28 groups scheduled', to: '/people', cta: 'Manage data' },
  { label: 'Lecturers available', value: '47', note: '6 with restricted hours', to: '/people', cta: 'Manage data' },
  { label: 'Room utilisation', value: '78%', note: 'across 19 classrooms', to: '/group-view', cta: 'Schedule' },
  { label: 'Unresolved conflicts', value: '3', note: '2 room clashes, 1 retake', to: '/group-view', cta: 'Resolve in Schedule', danger: true },
]

export default function HomePage() {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs text-ink-3">January 2026 semester · Week 5 of 14</p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-navy-900">
              Build the semester in one sitting.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-ink-3">
              Set the constraints once, let the scheduler place every class, then review what it could not solve on its own.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/group-view" className="rounded bg-navy-700 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-900">
                Generate timetable
              </Link>
              <Link to="/group-view" className="rounded border border-line-strong px-5 py-2.5 text-[13px] text-ink-2 hover:bg-panel">
                Review conflicts
              </Link>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-md border border-line bg-panel p-4">
            <div className="grid grid-cols-5 gap-1.5" aria-hidden>
              {Array.from({ length: 25 }, (_, i) => (
                <span
                  key={i}
                  className={`h-6 rounded-[2px] ${[1, 2, 6, 8, 12, 13, 17, 19, 22].includes(i) ? 'bg-navy-200' : 'bg-white'} ${i === 13 ? '!bg-danger/30' : ''}`}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-3">42 sessions placed · 3 left to resolve</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-8 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col rounded-md border border-line bg-white p-4">
            <span className="text-xs text-ink-3">{s.label}</span>
            <span className={`mt-1 text-3xl font-bold ${s.danger ? 'text-danger' : 'text-navy-900'}`}>{s.value}</span>
            <span className="mt-1 text-xs text-ink-4">{s.note}</span>
            <Link to={s.to} className="mt-4 text-xs font-medium text-navy-700 hover:underline">
              {s.cta} →
            </Link>
          </div>
        ))}
      </section>
    </div>
  )
}
