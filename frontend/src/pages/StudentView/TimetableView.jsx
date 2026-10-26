// src/pages/StudentView/TimetableView.jsx
import { useState } from 'react'

const TIME_SLOTS = [
  '08:30–09:00', '09:00–09:30', '09:30–10:00',
  '10:00–10:30', '10:30–11:00', '11:00–11:30', '11:30–12:00',
  '12:00–12:30', '12:30–13:00', '13:00–13:30', '13:30–14:00',
  '14:00–14:30', '14:30–15:00', '15:00–15:30', '15:30–16:00',
  '16:00–16:30', '16:30–17:00', '17:00–17:30', '17:30–18:00',
  '18:00–18:30', '18:30–19:00',
]
const SLOTS = TIME_SLOTS.length

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

const TONES = {
  navy: ['bg-navy-50/40', 'border-navy-200', 'text-navy-900'],
  amber: ['bg-amber-50/50', 'border-amber-300', 'text-amber-900'],
  emerald: ['bg-emerald-50/40', 'border-emerald-200', 'text-emerald-900'],
  purple: ['bg-purple-50/40', 'border-purple-200', 'text-purple-900'],
  blue: ['bg-blue-50/40', 'border-blue-200', 'text-blue-900'],
}

// 与 Group View (TimetableGrid.jsx) 完全对齐的网格与尺寸参数
const DAY_COL_W = 96
const BASE_COL_W = 66
const ROW_H = 'h-12'

// 同一天里时间重叠的课放进不同的"行"（lane），表格不会错位
function layoutLanes(items) {
  const sorted = [...items].sort((a, b) => a.startSlot - b.startSlot)
  const lanes = []
  for (const it of sorted) {
    let lane = lanes.find((l) => l.end <= it.startSlot)
    if (!lane) {
      lane = { end: 1, items: [] }
      lanes.push(lane)
    }
    lane.items.push(it)
    lane.end = it.startSlot + it.colSpan
  }
  return lanes.length ? lanes : [{ end: 1, items: [] }]
}

// 空格子：拖拽时是放置目标。悬停时高亮这门课会占用的格子；压到原本的课就是红色，不能放。
function EmptyCell({ dayName, slot, dnd, hover, setHover }) {
  const base = 'border-r border-line p-1'
  const span = dnd?.dragSpan ?? 0
  if (!dnd || span === 0) return <td className={base} />

  const start = Math.min(slot, TIME_SLOTS.length - span + 1)
  const blocked = dnd.isBlocked(dayName, start)
  const lit = hover && hover.day === dayName && slot >= hover.start && slot < hover.start + span

  return (
    <td
      onDragOver={(e) => {
        if (!blocked) e.preventDefault()
        if (!hover || hover.day !== dayName || hover.start !== start) {
          setHover({ day: dayName, start, blocked })
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setHover(null)
        dnd.onDrop(dayName, start)
      }}
      className={`${base} transition-colors ${
        lit ? (hover.blocked ? 'bg-red-100' : 'bg-navy-100 outline outline-1 -outline-offset-1 outline-navy-500') : ''
      }`}
    />
  )
}

function CourseCell({ course, exportMode, dnd, selected, onClick }) {
  const [bg, border, text] = TONES[course.tone] || ['bg-panel', 'border-line', 'text-ink']
  const draggable = !exportMode && !!dnd && !!course.requestId

  return (
    <td colSpan={course.colSpan} className={`border-r border-line p-1 align-middle ${bg}`}>
      <div
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', course.requestId)
          dnd.onDragStart(course.requestId)
        }}
        onDragEnd={() => dnd?.onDragEnd()}
        onClick={onClick ? () => onClick(course) : undefined}
        className={`rounded border ${border} bg-white shadow-xs space-y-0.5 ${exportMode ? 'p-1' : 'p-1.5'} ${
          draggable ? 'cursor-grab active:cursor-grabbing' : onClick ? 'cursor-pointer' : ''
        } ${selected ? 'ring-2 ring-navy-500 ring-offset-1' : ''}`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className={`font-bold ${text} leading-tight ${exportMode ? 'text-[9px]' : 'text-[10px]'}`}>
            {course.name}
          </p>
          <span
            className="shrink-0 whitespace-nowrap rounded bg-panel px-1 py-0.5 font-mono text-[8px] text-ink-4"
            title={`Active: ${course.startDate} to ${course.endDate}`}
          >
            {course.startDate.slice(0, 5)} ~ {course.endDate.slice(0, 5)}
          </span>
        </div>
        <p className={`text-ink-3 ${exportMode ? 'text-[8px]' : 'text-[9px]'}`}>
          {course.instructor} · {course.room}
        </p>
      </div>
    </td>
  )
}

function renderDayRows(dayName, items, exportMode, dnd, hover, setHover, selectedCourseId, onCourseClick) {
  const lanes = layoutLanes(items)
  return lanes.map((lane, laneIdx) => {
    const cells = []
    let cursor = 1
    lane.items.forEach((it) => {
      for (; cursor < it.startSlot; cursor++) {
        cells.push(<EmptyCell key={`e-${cursor}`} dayName={dayName} slot={cursor} dnd={dnd} hover={hover} setHover={setHover} />)
      }
      cells.push(<CourseCell key={it.id} course={it} exportMode={exportMode} dnd={dnd} selected={!exportMode && it.id === selectedCourseId} onClick={onCourseClick} />)
      cursor = it.startSlot + it.colSpan
    })
    for (; cursor <= TIME_SLOTS.length; cursor++) {
      cells.push(<EmptyCell key={`e-${cursor}`} dayName={dayName} slot={cursor} dnd={dnd} hover={hover} setHover={setHover} />)
    }

    return (
      <tr key={`${dayName}-${laneIdx}`} className={exportMode ? 'h-12' : ROW_H}>
        {laneIdx === 0 && (
          <td
            rowSpan={lanes.length}
            className={`border-r border-line bg-white font-bold text-ink ${
              exportMode ? 'p-2.5' : 'sticky left-0 z-10 p-1.5 text-[10px]'
            }`}
          >
            {dayName}
          </td>
        )}
        {cells}
      </tr>
    )
  })
}

export default function TimetableView({
  student,
  timetable,
  exportMode = false,
  dnd = null,
  selectedCourseId = null,
  onCourseClick = null,
}) {
  const [hover, setHover] = useState(null)
  const colW = BASE_COL_W
  const tableMinW = DAY_COL_W + SLOTS * colW

  return (
    <div className={exportMode ? 'bg-white' : 'space-y-3'}>
      {/* 学生信息头 */}
      <div
        className={
          exportMode
            ? 'mb-2'
            : 'flex items-start justify-between rounded-lg border border-line bg-white px-3 py-2.5 shadow-xs'
        }
      >
        <div>
          {!exportMode && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-4">
              Student ID {student.id}
            </p>
          )}
          <h1 className={`mt-0.5 font-bold text-ink ${exportMode ? 'text-xl' : 'text-base'}`}>{student.name}</h1>
          <p className={`mt-0.5 text-ink-3 ${exportMode ? 'text-xs' : 'text-[11px]'}`}>
            Base group {student.baseGroup ?? 'DB2601A'} · {student.programme ?? 'Diploma in Business, Year 1'}
          </p>
        </div>
      </div>

      {/* 时间表 */}
      <div
        className={`overflow-hidden rounded-lg border bg-white shadow-xs ${
          exportMode ? 'border-slate-300' : 'border-line'
        }`}
      >
        <div
          className={`grid grid-cols-2 border-b border-line text-ink-3 ${
            exportMode ? 'bg-slate-100 px-4 py-2.5 text-[11px]' : 'bg-panel px-3 py-2 text-[10px]'
          }`}
        >
          <div>
            <span className="font-semibold text-ink">PROGRAMME:</span> {timetable.programme}
          </div>
          <div className="text-right">
            <span className="font-semibold text-ink">SEMESTER START:</span> {timetable.semesterStart}
            &nbsp;|&nbsp;
            <span className="font-semibold text-ink">END:</span> {timetable.semesterEnd}
          </div>
        </div>

        <div className={exportMode ? '' : 'overflow-x-auto'}>
          <table
            className={`w-full border-collapse text-ink ${exportMode ? 'text-[9px]' : 'text-[10px]'}`}
            style={exportMode ? { tableLayout: 'fixed' } : { tableLayout: 'fixed', minWidth: tableMinW }}
          >
            <colgroup>
              <col style={{ width: exportMode ? 84 : DAY_COL_W }} />
              {TIME_SLOTS.map((slot) => (
                <col key={slot} style={exportMode ? undefined : { width: colW }} />
              ))}
            </colgroup>
            <thead>
              <tr
                className={`border-b border-line font-semibold text-ink-3 ${
                  exportMode ? 'bg-slate-100' : 'bg-panel'
                }`}
              >
                <th
                  className={`border-r border-line text-left ${
                    exportMode
                      ? 'w-28 bg-slate-100 p-2'
                      : 'sticky left-0 z-10 bg-panel p-1.5'
                  }`}
                >
                  DAY / TIME
                </th>
                {TIME_SLOTS.map((slot) => {
                  const [from, to] = slot.split('–')
                  return (
                    <th
                      key={slot}
                      className={`border-r border-line text-center ${
                        exportMode ? 'p-1.5' : 'whitespace-nowrap p-1 text-[9px]'
                      }`}
                    >
                      {exportMode ? (
                        <>
                          <span className="block" style={{ lineHeight: '10px' }}>{from}–</span>
                          <span className="block" style={{ lineHeight: '10px' }}>{to}</span>
                        </>
                      ) : (
                        slot
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DAYS.map((dayName) =>
                renderDayRows(
                  dayName,
                  timetable.courses.filter((c) => c.day === dayName),
                  exportMode,
                  dnd,
                  hover,
                  setHover,
                  selectedCourseId,
                  exportMode ? null : onCourseClick,
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}