// src/pages/StudentView/StudentViewPage.jsx
// Retake students：和 Scheduler 同样的布局（顶部工具栏 / 左侧名单 / 中间课表 / 底部面板），
// 但只处理重修学生。数据暂时是假数据（src/data/retakeData.js）。
// 重修科目可以自由拖到任何空位；唯一的限制是不能压到学生原本的课。
import { useMemo, useState } from 'react'
import Badge from '../../components/Badge.jsx'
import {
  DAYS, RETAKE_REQUESTS, RETAKE_STUDENTS, baseClashes, buildTimetable, clampStart,
  generatePicks, requestStatus, slotStart, slotText, spanOf, studentById, studentStatus,
  subjectName,
} from '../../data/retakeData.js'
import TimetableView from './TimetableView.jsx'
import { exportBatchZip } from './exportPdf.jsx'
 
const outline =
  'flex h-[30px] items-center gap-1.5 rounded border border-line-strong bg-white px-3 text-[13px] text-ink-2 hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50'
const ghost =
  'flex h-[30px] items-center gap-1.5 rounded bg-panel px-3 text-xs text-ink-2 hover:bg-line-2 disabled:cursor-not-allowed disabled:opacity-40'
const select =
  'h-[26px] rounded border border-line-strong bg-white px-1.5 text-xs outline-none focus:border-navy-500'
 
const DOT = { clear: 'bg-ok', conflict: 'bg-danger', pending: 'bg-line-strong' }
const DOT_TITLE = { clear: 'Placed, no overlap', conflict: 'Two retakes overlap', pending: 'Not placed yet' }
const START_SLOTS = Array.from({ length: 21 }, (_, i) => i + 1)
 
function Divider() {
  return <span className="mx-1 h-7 w-px bg-line" aria-hidden />
}
 
const formatPeriod = (start, span) => (span === 1 ? `period ${start}` : `period ${start}–${start + span - 1}`)
 
/** 点课表里的课程后右侧显示的信息栏 —— 和 Scheduler 的 LessonDetailsPanel 同一个设计 */
function CourseDetails({ course, student, onClose, onRemove }) {
  const isRetake = !!course.requestId
  const periods = course.colSpan / 2 // 1 个 period = 1 小时
  const firstPeriod = Math.floor((course.startSlot - 1) / 2) + 1
  const day = course.day[0] + course.day.slice(1).toLowerCase()
 
  // 假数据：以后接数据库
  const seatsNeeded = isRetake ? 1 : 38
  const seatsTotal = 40
 
  return (
    <aside className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-l border-line bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Selected Lesson
          </div>
          <h2 className="text-lg font-semibold text-ink">{course.name.replace(' (Retake)', '')}</h2>
          <div className="mt-1 text-[13px] text-ink-3">
            {student.baseGroup} · {day}, {formatPeriod(firstPeriod, periods)}
          </div>
        </div>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-2" aria-label="Close details">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l8 8m0-8l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
 
      <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4 text-[13px]">
        <div className="flex justify-between">
          <span className="text-ink-3">Lecturer</span>
          <span className="text-right text-ink">{course.instructor || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Room</span>
          <span className="text-right text-ink">{course.room || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Seats needed</span>
          <span className="text-right text-ink">{seatsNeeded} of {seatsTotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Duration</span>
          <span className="text-right text-ink">{periods} periods, not split</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Position</span>
          <span className="text-right text-ink">{isRetake ? 'unlocked' : 'locked'}</span>
        </div>
      </div>
 
      {isRetake && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded border border-line-strong bg-white py-2 text-[13px] font-medium text-ink-2 hover:bg-panel"
        >
          Remove from timetable
        </button>
      )}
    </aside>
  )
}
 
export default function StudentViewPage() {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(RETAKE_STUDENTS[0].id)
  const [picks, setPicks] = useState({}) // { requestId: { day, startSlot } }
  const [dragReq, setDragReq] = useState(null) // 正在拖的 requestId
  const [message, setMessage] = useState(null) // { text, bad }
  const [busy, setBusy] = useState(false)
  const [courseId, setCourseId] = useState(null) // 点开详情的课程 id
  const [exportState, setExportState] = useState(null) // null | { done, total }
  const isExporting = exportState !== null
 
  const say = (text, bad = false) => setMessage({ text, bad })
 
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return RETAKE_STUDENTS.filter(
      (s) => !q || s.id.includes(q) || s.name.toLowerCase().includes(q),
    )
  }, [query])
 
  const student = studentById(selectedId) ?? RETAKE_STUDENTS[0]
  const timetable = useMemo(() => buildTimetable(student, picks), [student, picks])
 
  const course = timetable.courses.find((c) => c.id === courseId) ?? null // 换学生/取消后自动消失
  const unplaced = RETAKE_REQUESTS.filter((r) => !picks[r.id])
  const overlapping = RETAKE_REQUESTS.filter((r) => requestStatus(r, picks).clashes.length).length
  const placedCount = RETAKE_REQUESTS.length - unplaced.length
  const myRequests = RETAKE_REQUESTS.filter((r) => r.studentId === student.id)
  const dragRequest = RETAKE_REQUESTS.find((r) => r.id === dragReq) ?? null
 
  /** 把一门重修科目放到某天某格。压到学生原本的课就拒绝；其他位置随便放。 */
  function placeRetake(requestId, day, startSlot) {
    const req = RETAKE_REQUESTS.find((r) => r.id === requestId)
    if (!req) return false
    const span = spanOf(req.code)
    const start = clampStart(startSlot, span)
    const blockers = baseClashes(studentById(req.studentId), day, start, span)
    if (blockers.length) {
      say(`Can't place ${subjectName(req.code)} there — it would cover ${blockers[0].name}.`, true)
      return false
    }
    setPicks((cur) => ({ ...cur, [requestId]: { day, startSlot: start } }))
    say(`Placed ${subjectName(req.code)} on ${slotText({ day, startSlot: start, colSpan: span })}.`)
    return true
  }
 
  function unplaceRetake(requestId) {
    const req = RETAKE_REQUESTS.find((r) => r.id === requestId)
    if (!req || !picks[requestId]) return
    setPicks((cur) => {
      const next = { ...cur }
      delete next[requestId]
      return next
    })
    say(`Removed ${subjectName(req.code)} from the timetable.`)
  }
 
  // Generate：给所有重修科目找空位（假数据，稍等一下模拟计算）
  function handleGenerate() {
    setBusy(true)
    setMessage(null)
    setTimeout(() => {
      setPicks(generatePicks({}))
      say(`Generated ${RETAKE_REQUESTS.length} retake timetables.`)
      setBusy(false)
    }, 600)
  }
 
  // 只排还没排的，已经排好的不动
  function handleAutoPlaceRest() {
    const n = unplaced.length
    setPicks((cur) => generatePicks(cur))
    say(`Placed ${n} remaining retake(s).`)
  }
 
  function handleVerify() {
    if (unplaced.length) say(`${unplaced.length} retake(s) are not placed yet.`, true)
    else if (overlapping) say(`${overlapping} retake(s) overlap another retake.`, true)
    else say('No clashes found.')
  }
 
  function handleClear() {
    setPicks({})
    setMessage(null)
  }
 
  // 批量导出：所有重修学生，每人一个 PDF，打包成一个 ZIP（没排的会先自动排好，已排好的不动）
  const handleExportBatch = async () => {
    const full = generatePicks(picks)
    const students = RETAKE_STUDENTS
    const timetables = Object.fromEntries(students.map((s) => [s.id, buildTimetable(s, full)]))
    setExportState({ done: 0, total: students.length })
    try {
      await exportBatchZip(students, timetables, (done, total) => setExportState({ done, total }))
    } catch (err) {
      console.error(err)
      alert('Failed to generate PDF bundle.')
    } finally {
      setExportState(null)
    }
  }
 
  // ---------- 拖拽 ----------
  function startDrag(requestId) {
    const req = RETAKE_REQUESTS.find((r) => r.id === requestId)
    setDragReq(requestId)
    if (req) setSelectedId(req.studentId) // 拖别的学生的课，先切到他的课表
  }
 
  const dnd = {
    dragSpan: dragRequest ? spanOf(dragRequest.code) : 0,
    isBlocked: (day, start) =>
      !!dragRequest &&
      baseClashes(studentById(dragRequest.studentId), day, start, spanOf(dragRequest.code)).length > 0,
    onDragStart: startDrag,
    onDragEnd: () => setDragReq(null),
    onDrop: (day, start) => {
      const id = dragReq
      setDragReq(null)
      if (id) placeRetake(id, day, start)
    },
  }
 
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      {/* 顶部工具栏（和 Scheduler 同款） */}
      <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-line bg-white px-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="flex h-[30px] items-center gap-2 rounded bg-navy-700 px-4 text-[13px] font-semibold text-white hover:bg-navy-900 disabled:opacity-60"
        >
          <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden><path d="M0 0 L10 6 L0 12 Z" fill="currentColor" /></svg>
          {busy ? 'Generating…' : 'Generate'}
        </button>
        <button type="button" onClick={handleVerify} className={outline}>
          <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden>
            <path d="M1 6 l4 4 l8 -9" fill="none" stroke="#2E7D5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Verify
        </button>
 
        <Divider />
 
        <button type="button" onClick={handleClear} disabled={placedCount === 0} className={ghost}>
          Clear
        </button>
 
        <div className="ml-auto flex items-center gap-2">
          <button
          type="button"
          onClick={handleExportBatch}
          disabled={isExporting}
          className={outline}
        >
          {isExporting
            ? `⏳ Generating ${exportState.done}/${exportState.total}...`
            : `Download All Retake PDFs (.zip) (${RETAKE_STUDENTS.length})`}
        </button>
          <button
            type="button"
            disabled={unplaced.length > 0 || overlapping > 0}
            className="flex h-[30px] items-center rounded bg-ok px-4 text-[13px] font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve draft
          </button>
        </div>
      </div>
 
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左侧：重修学生名单 */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-white">
          <div className="p-3">
            <label className="flex h-[30px] items-center gap-2 rounded border border-line bg-panel px-2.5 focus-within:border-navy-500">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="none" stroke="#8592A3" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5 L13 13" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ID or name…"
                aria-label="Search retake students"
                className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-ink-4"
              />
            </label>
          </div>
          <div className="flex items-center px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Retake students
            <span className="ml-auto font-normal">{RETAKE_STUDENTS.length}</span>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {list.map((s) => {
              const active = s.id === selectedId
              const st = studentStatus(s.id, picks)
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
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span title={DOT_TITLE[st]} className={`size-2 shrink-0 rounded-full ${DOT[st]}`} />
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="px-4 py-3 text-xs text-ink-4">No students match</li>}
          </ul>
          <div className="flex items-center justify-between border-t border-line-2 px-3 py-2.5 text-[11px] text-ink-4">
            <span>{RETAKE_REQUESTS.length} retakes</span>
            <span className="font-medium text-amber-800">{placedCount} placed</span>
          </div>
        </aside>
 
        {/* 中间：状态行 + 课表 + 底部面板 */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-canvas">
          <div className="flex shrink-0 items-center gap-4 px-4 pb-2 pt-3">
            <h1 className="text-[15px] font-semibold text-ink">
              {RETAKE_STUDENTS.length} retake students · {RETAKE_REQUESTS.length} retakes
            </h1>
            {message && (
              <p className={`text-xs font-medium ${message.bad ? 'text-danger' : 'text-navy-700'}`}>{message.text}</p>
            )}
          </div>
 
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            {/* 课表（和导出的 PDF 使用同一个 TimetableView） */}
            <TimetableView
              student={student}
              timetable={timetable}
              dnd={dnd}
              selectedCourseId={course?.id}
              onCourseClick={(c) => setCourseId((cur) => (cur === c.id ? null : c.id))}
            />
 
            {/* 还没排的重修科目：也是拖回来取消的地方 */}
            <section
              onDragOver={(e) => {
                if (dragRequest && picks[dragRequest.id]) e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                const id = dragReq
                setDragReq(null)
                if (id) unplaceRetake(id)
              }}
              className={`rounded-md border bg-white p-3 transition-colors ${
                dragRequest && picks[dragRequest.id] ? 'border-dashed border-navy-500 bg-navy-50' : 'border-line'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-ink">Unplaced retakes</h3>
                  <span className="flex size-5 items-center justify-center rounded-full bg-[#FBE2E6] text-[10px] font-bold text-danger">
                    {unplaced.length}
                  </span>
                  <span className="ml-2 text-xs text-ink-3">Drag a card onto the timetable, or let the scheduler place it</span>
                </div>
                <button
                  type="button"
                  onClick={handleAutoPlaceRest}
                  disabled={unplaced.length === 0}
                  className="rounded border border-line-strong bg-panel px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:bg-line-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Auto-place all
                </button>
              </div>
              <div className="flex min-h-[64px] gap-3 overflow-x-auto pb-1">
                {unplaced.map((r) => {
                  const s = studentById(r.studentId)
                  return (
                    <div
                      key={r.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move'
                        e.dataTransfer.setData('text/plain', r.id)
                        startDrag(r.id)
                      }}
                      onDragEnd={() => setDragReq(null)}
                      className="w-[190px] shrink-0 cursor-grab select-none rounded border border-b border-line border-t-2 border-t-[#C58A1E] bg-[#FEFBF6] p-2 shadow-xs transition-transform hover:-translate-y-0.5 active:cursor-grabbing"
                    >
                      <div className="truncate text-xs font-bold text-[#C58A1E]">{subjectName(r.code)}</div>
                      <div className="truncate text-[11px] text-ink-3">{r.code} · {spanOf(r.code) / 2}h</div>
                      <div className="mt-1 truncate text-[11px] text-ink-4">{s.id} · {s.name}</div>
                    </div>
                  )
                })}
                {unplaced.length === 0 && (
                  <div className="flex w-full items-center justify-center py-3 text-xs text-ink-4">
                    All retakes have been placed.
                  </div>
                )}
              </div>
            </section>
 
            {/* 当前学生的重修科目：也可以用下拉框精确调整 */}
            <section className="rounded-md border border-line bg-white p-3">
              <div className="mb-3 flex items-center gap-3">
                <h3 className="text-[13px] font-semibold text-ink">{student.name}’s retakes</h3>
                <span className="text-xs text-ink-3">drag on the timetable, or set the day and time here</span>
              </div>
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-line-2 text-ink-4">
                    <th className="pb-2 font-normal">Subject</th>
                    <th className="pb-2 font-normal">Day</th>
                    <th className="pb-2 font-normal">Start</th>
                    <th className="pb-2 font-normal">Slot</th>
                    <th className="pb-2 font-normal">Check</th>
                  </tr>
                </thead>
                <tbody className="text-ink-2">
                  {myRequests.map((r) => {
                    const st = requestStatus(r, picks)
                    const span = spanOf(r.code)
                    return (
                      <tr key={r.id} className="border-b border-line-2 last:border-0">
                        <td className="py-2 font-medium text-ink">{subjectName(r.code)}</td>
                        <td className="py-2">
                          <select
                            value={st.place?.day ?? ''}
                            onChange={(e) =>
                              e.target.value
                                ? placeRetake(r.id, e.target.value, st.place?.startSlot ?? 1)
                                : unplaceRetake(r.id)
                            }
                            aria-label={`Day for ${subjectName(r.code)}`}
                            className={select}
                          >
                            <option value="">— not placed —</option>
                            {DAYS.map((d) => (
                              <option key={d} value={d}>{d[0] + d.slice(1).toLowerCase()}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">
                          <select
                            value={st.place?.startSlot ?? ''}
                            disabled={!st.placed}
                            onChange={(e) => placeRetake(r.id, st.place.day, Number(e.target.value))}
                            aria-label={`Start time for ${subjectName(r.code)}`}
                            className={select}
                          >
                            {!st.placed && <option value="">—</option>}
                            {START_SLOTS.filter((n) => n + span - 1 <= 21).map((n) => (
                              <option key={n} value={n}>{slotStart(n)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2">{st.place ? `${slotText({ ...st.place, colSpan: span })}` : '—'}</td>
                        <td className="py-2">
                          {!st.placed ? (
                            <Badge>not placed</Badge>
                          ) : st.clashes.length ? (
                            <Badge tone="danger">overlaps {st.clashes.length}</Badge>
                          ) : (
                            <Badge tone="ok">clear</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {myRequests.length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-ink-4">No retake subjects.</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          </div>
        </main>
 
        {/* 右侧：点开课程后显示课程信息 */}
        {course && (
          <CourseDetails
            course={course}
            student={student}
            onClose={() => setCourseId(null)}
            onRemove={() => {
              unplaceRetake(course.requestId)
              setCourseId(null)
            }}
          />
        )}
      </div>
 
      {/* 底部状态栏（和 Scheduler 同款） */}
      <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-line-strong bg-[#E8EDF4] px-4 text-[11px] text-ink-3">
        <span className="text-ink">{placedCount} of {RETAKE_REQUESTS.length} retakes placed</span>
        <span className="flex items-center gap-1.5 font-medium text-danger">
          <span className="size-1.5 rounded-full bg-danger" />
          {overlapping} overlaps
        </span>
        <span className="ml-auto text-ink-4">Sample data — not connected to the database yet</span>
      </footer>
    </div>
  )
}
 
 