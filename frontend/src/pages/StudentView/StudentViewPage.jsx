// src/pages/StudentView/StudentViewPage.jsx
import { useMemo, useState } from 'react'
import Badge from '../../components/Badge.jsx'
import { STUDENTS } from '../../data/people.js'
import { TIMETABLE_DATA } from '../../data/timetables.js'
import TimetableView from './TimetableView.jsx'
import { exportBatchZip } from './exportPdf.jsx'

export default function StudentViewPage() {
  const [query, setQuery] = useState('')
  const [retakeOnly, setRetakeOnly] = useState(false)
  const [selectedId, setSelectedId] = useState('2401019')
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)
  const [exportState, setExportState] = useState(null) // null | { done, total }

  const allStudentsList = useMemo(
    () =>
      STUDENTS.map((s) =>
        ['2401019', '2401011', '2401013'].includes(s.id) ? { ...s, retake: true } : s,
      ),
    [],
  )

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allStudentsList.filter(
      (s) => (!retakeOnly || s.retake) && (!q || s.id.includes(q) || s.name.toLowerCase().includes(q)),
    )
  }, [query, retakeOnly, allStudentsList])

  const student = allStudentsList.find((s) => s.id === selectedId) || allStudentsList[0]
  const currentTimetable = TIMETABLE_DATA[student.id] || null
  const retakeCount = allStudentsList.filter((s) => s.retake).length
  const isExporting = exportState !== null

  const handleExportBatch = async () => {
    const targets = allStudentsList.filter((s) => s.retake && TIMETABLE_DATA[s.id])
    if (targets.length === 0) return alert('No retake students with a timetable found.')
    setExportState({ done: 0, total: targets.length })
    try {
      await exportBatchZip(targets, TIMETABLE_DATA, (done, total) => setExportState({ done, total }))
    } catch (err) {
      console.error(err)
      alert('Failed to generate PDF bundle.')
    } finally {
      setExportState(null)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      {/* 顶部操作与筛选栏 */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-line bg-white px-4">
        <div className="flex items-center gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student ID or name…"
            aria-label="Search students"
            className="h-[30px] w-64 rounded border border-line bg-panel px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
          />
          <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-ink-2">
            <input
              type="checkbox"
              checked={retakeOnly}
              onChange={(e) => setRetakeOnly(e.target.checked)}
              className="rounded border-line-strong text-navy-700 focus:ring-navy-500"
            />
            Retake students only
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="h-[30px] rounded border border-line-strong bg-white px-3 text-[13px] font-medium text-ink-2 hover:bg-panel">
            Bulk-assign retakes
          </button>

          {/* 只保留批量导出按钮 */}
          <button
            type="button"
            onClick={handleExportBatch}
            disabled={isExporting}
            className="flex h-[30px] items-center gap-1.5 rounded border border-amber-500 bg-amber-50 px-3 text-[13px] font-semibold text-amber-900 shadow-xs transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            {isExporting
              ? `⏳ Generating ${exportState.done}/${exportState.total}...`
              : `Download All Retake PDFs (.zip) (${retakeCount})`}
          </button>
        </div>
      </div>

      {/* 主体布局 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左侧：学生名单 */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-white">
          <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Students — DB2601A ({allStudentsList.length})
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-line-2 overflow-y-auto">
            {list.map((s) => {
              const active = s.id === selectedId
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    aria-current={active ? 'true' : undefined}
                    className={[
                      'flex h-11 w-full items-center gap-2 border-l-[3px] px-2.5 text-left text-xs transition-colors',
                      active ? 'border-navy-700 bg-navy-50 font-semibold text-navy-700' : 'border-transparent text-ink-2 hover:bg-panel',
                    ].join(' ')}
                  >
                    <span className="w-12 shrink-0 font-mono text-ink-4">{s.id}</span>
                    <span className="flex-1 truncate">{s.name}</span>
                    {s.retake && <span className="ml-auto shrink-0"><Badge tone="warn">RT</Badge></span>}
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="px-4 py-3 text-xs text-ink-4">No students match</li>}
          </ul>
          <div className="flex items-center justify-between border-t border-line-2 bg-white px-3 py-2.5 text-[11px] text-ink-4">
            <span>{allStudentsList.length} students</span>
            <span className="font-medium text-amber-800">{retakeCount} on retake</span>
          </div>
        </aside>

        {/* 中间：课表（和导出的 PDF 使用同一个 TimetableView） */}
        <main className="min-w-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex items-center justify-end gap-3">
            {student.retake && <Badge tone="warn">Retaking Subject</Badge>}
            <button
              type="button"
              onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              className="rounded border border-line-strong bg-panel px-3 py-1.5 text-xs font-medium text-ink-2 transition-colors hover:bg-white"
            >
              {isRightSidebarOpen ? 'Hide Queue Sidebar' : 'Show Queue Sidebar'}
            </button>
          </div>

          {currentTimetable ? (
            <TimetableView student={student} timetable={currentTimetable} />
          ) : (
            <div className="rounded-lg border border-line bg-white px-4 py-10 text-center text-xs text-ink-3">
              No timetable data for this student yet.
            </div>
          )}
        </main>

        {/* 右侧：Retake 队列 */}
        {isRightSidebarOpen && (
          <aside className="flex w-[280px] shrink-0 flex-col space-y-3.5 overflow-y-auto border-l border-line bg-white p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-ink-4">Retake Queue</h2>
                <p className="mt-0.5 text-[11px] text-ink-3">7 students across 5 subjects</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRightSidebarOpen(false)}
                className="rounded border border-line px-1.5 py-0.5 text-xs font-bold text-ink-4 hover:text-ink"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="space-y-1 rounded-md border border-navy-500 bg-navy-50 p-2.5 text-xs">
                <div className="font-bold text-navy-900">2401019 · Nur Aisyah B.</div>
                <div className="text-ink-2">Microeconomics — placed, scheduled safely</div>
              </div>
              <div className="space-y-1 rounded-md border border-red-300 bg-red-50 p-2.5 text-xs">
                <div className="font-bold text-red-900">2401011 · Tan Wei Jie</div>
                <div className="text-red-800">Business Law — conflicts with retake slot DB2601A</div>
              </div>
              <div className="space-y-1 rounded-md border border-line bg-panel p-2.5 text-xs">
                <div className="font-bold text-ink">2401013 · Arvind Kumar</div>
                <div className="text-ink-1">Accounting I — placed, no conflict DB2601A</div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}