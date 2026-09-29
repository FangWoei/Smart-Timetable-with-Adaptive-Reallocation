import { useState } from 'react'
import Toolbar from './Toolbar.jsx'
import Sidebar from './Sidebar.jsx'
import TimetableGrid from '../../components/TimetableGrid.jsx'
import { GROUPS } from '../../data/timetable.js'

export default function GroupViewPage() {
  const [view, setView] = useState('group')
  const [selectedId, setSelectedId] = useState(GROUPS[0].id)
  const [zoom, setZoom] = useState(100)

  const conflicts = GROUPS.reduce((n, g) => n + g.lessons.filter((l) => l.conflict).length, 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Toolbar
        view={view}
        onViewChange={setView}
        onGenerate={() => {/* TODO: call scheduler API */}}
        onVerify={() => {/* TODO: verify constraints */}}
        onApprove={() => {/* TODO: approve draft */}}
        canApprove={conflicts === 0}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar groups={GROUPS} selectedId={selectedId} onSelect={setSelectedId} />

        <main className="min-w-0 flex-1 overflow-auto p-3">
          <div className="mb-2 flex items-center gap-4">
            <h1 className="text-[15px] font-semibold text-ink">January 2026 — all groups</h1>
            <p className="text-xs text-ink-3">5 days · periods 1–5 · 08:00 to 17:00</p>
            {conflicts > 0 && (
              <p className="text-xs font-medium text-danger">
                {conflicts} conflicts to resolve before approval
              </p>
            )}

            <div className="ml-auto flex items-center rounded border border-line bg-white text-[13px] text-ink-2">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(70, z - 10))}
                className="px-2.5 py-0.5 hover:bg-panel"
              >
                −
              </button>
              <span className="w-11 text-center text-[11px] text-ink-3">{zoom}%</span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(160, z + 10))}
                className="px-2.5 py-0.5 hover:bg-panel"
              >
                +
              </button>
            </div>
          </div>

          <TimetableGrid groups={GROUPS} selectedId={selectedId} onSelect={setSelectedId} zoom={zoom} />
    </main>
      </div>
    </div>
  )
}
