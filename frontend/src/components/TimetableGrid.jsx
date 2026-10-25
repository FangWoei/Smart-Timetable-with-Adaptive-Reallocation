// src/components/TimetableGrid.jsx
const DAY_NAMES = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

const TIME_SLOTS = [
  '08:30–09:00', '09:00–09:30', '09:30–10:00',
  '10:00–10:30', '10:30–11:00', '11:00–11:30', '11:30–12:00',
  '12:00–12:30', '12:30–13:00', '13:00–13:30', '13:30–14:00',
  '14:00–14:30', '14:30–15:00', '15:00–15:30', '15:30–16:00',
  '16:00–16:30', '16:30–17:00', '17:00–17:30', '17:30–18:00',
  '18:00–18:30', '18:30–19:00',
]
const SLOTS = TIME_SLOTS.length

const DAY_COL_W = 96
const BASE_COL_W = 66
const ROW_H = 'h-12'

const EXPORT_PAGE_W = 1047
const EXPORT_DAY_COL_W = 84
const EXPORT_SLOT_W = (EXPORT_PAGE_W - 2 - EXPORT_DAY_COL_W) / SLOTS
const EXPORT_ROW_H = 56
const EXPORT_CARD_H = 48
const CHAR_W = 0.58
const CHAR_W_BOLD = 0.64
const MIN_FONT = 5

const SEMESTER_START = '05/01/2026'
const SEMESTER_END = '24/04/2026'

function courseKey(lesson) {
  const raw = String(lesson.code || lesson.name || '')
  return raw.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s*·.*$/, '').trim().toLowerCase()
}

function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const GOLDEN_ANGLE = 137.508
const colorCache = new Map()

function courseColors(lesson) {
  const key = courseKey(lesson)
  if (colorCache.has(key)) return colorCache.get(key)
  const hue = Math.round((hashString(key) * GOLDEN_ANGLE) % 360)
  const colors = {
    bg: `hsl(${hue} 75% 96%)`,
    border: `hsl(${hue} 55% 62%)`,
    text: `hsl(${hue} 65% 22%)`,
  }
  colorCache.set(key, colors)
  return colors
}

const shortDate = (d) => (d ? (d.length >= 5 ? d.slice(0, 5) : d) : '')

// 核心：精准计算课程在半小时网格中的起始位与跨度
function toCells(lesson) {
  const start = lesson.startSlot != null 
    ? lesson.startSlot 
    : (lesson.period != null ? lesson.period * 2 - 1 : 1)
  const span = lesson.slotSpan != null 
    ? lesson.slotSpan 
    : ((lesson.span || 2) * 2)
  return { start, span: Math.max(1, Math.min(span, SLOTS - start + 1)) }
}

function layoutDay(lessons) {
  const items = lessons
    .map((lesson) => ({ lesson, ...toCells(lesson) }))
    .filter((it) => it.start >= 1 && it.start <= SLOTS)
    .sort((a, b) => a.start - b.start)

  const lanes = []
  for (const it of items) {
    let lane = lanes.find((l) => l.end <= it.start)
    if (!lane) {
      lane = { end: 1, items: [] }
      lanes.push(lane)
    }
    lane.items.push(it)
    lane.end = it.start + it.span
  }
  return lanes.length ? lanes : [{ end: 1, items: [] }]
}

function splitCode(raw) {
  const s = String(raw || '')
  const m = s.match(/^(.*?)\s*(?:\(([^)]+)\)|·\s*(.+))\s*$/)
  return m ? { title: m[1], tag: (m[2] || m[3]).trim() } : { title: s, tag: '' }
}

function fitSize(text, width, base, charW = CHAR_W) {
  const need = String(text ?? '').length * charW
  if (need * base <= width) return base
  return Math.max(MIN_FONT, Math.floor((width / need) * 10) / 10)
}

function ExportLessonCard({ lesson, colors, span, view }) {
  const { conflict, startDate, endDate } = lesson
  const inner = span * EXPORT_SLOT_W - 22
  const { title, tag } = splitCode(lesson.code || lesson.name)
  const showDate = (startDate || endDate) && span >= 4
  const dateText = showDate ? `${shortDate(startDate)}~${shortDate(endDate)}` : ''
  const titleRoom = inner - (showDate ? dateText.length * 4.4 + 6 : 0)
  const titleSize = fitSize(title, titleRoom, 10, CHAR_W_BOLD)

  const stacked = span < 4
  const half = stacked ? inner : inner / 2 - 2
  const lecturerText = lesson.lecturer || 'TBA'
  const roomText = lesson.room || 'No Room'

  const left = view === 'lecturer' ? tag : lecturerText
  const right = view === 'room' ? tag : roomText
  const leftSize = fitSize(left, half, 9)
  const rightSize = fitSize(right, half - 8, 9)

  const cell = 'block min-w-0 overflow-hidden whitespace-nowrap'

  return (
    <div
      style={{ height: EXPORT_CARD_H, borderColor: conflict ? undefined : colors.border }}
      className={`flex w-full flex-col justify-center gap-[3px] overflow-hidden rounded border bg-white px-1.5 ${
        conflict ? 'border-red-300 outline outline-2 -outline-offset-2 outline-danger' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span style={{ lineHeight: '13px', fontSize: titleSize, color: conflict ? undefined : colors.text }} className={`${cell} font-bold ${conflict ? 'text-red-900' : ''}`}>
          {title}
        </span>
        {showDate && (
          <span style={{ lineHeight: '13px' }} className="shrink-0 whitespace-nowrap font-mono text-[7px] text-ink-4">
            {dateText}
          </span>
        )}
      </div>

      <div className={stacked ? 'flex flex-col items-start gap-[2px]' : 'grid grid-cols-2 items-center gap-1'}>
        <span style={{ lineHeight: '14px', fontSize: leftSize }} className={`${cell} text-ink-3`}>{left}</span>
        <span style={{ lineHeight: '14px', fontSize: rightSize }} className={`${cell} rounded bg-panel px-1 font-medium text-ink-2 ${stacked ? '' : 'justify-self-end'}`}>
          {right}
        </span>
      </div>
    </div>
  )
}

function LessonCard({ lesson, isSelected, colors, onClick }) {
  const { conflict, startDate, endDate } = lesson

  return (
    <button
      type="button"
      onClick={onClick}
      style={conflict ? undefined : { borderColor: colors.border }}
      className={[
        'block w-full cursor-pointer space-y-1 overflow-hidden rounded border bg-white p-1.5 text-left shadow-xs transition-shadow hover:shadow-sm',
        conflict ? 'border-red-300 outline outline-2 -outline-offset-2 outline-danger' : '',
        isSelected && !conflict ? 'ring-2 ring-navy-500 ring-offset-1' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-1">
        <p style={conflict ? undefined : { color: colors.text }} className={`min-w-0 truncate text-[10px] font-bold leading-tight ${conflict ? 'text-red-900' : ''}`}>
          {lesson.code || lesson.name}
        </p>
        {(startDate || endDate) && (
          <span className="shrink-0 whitespace-nowrap rounded bg-panel px-1 py-0.5 font-mono text-[8px] text-ink-4" title={`Active: ${startDate || SEMESTER_START} to ${endDate || SEMESTER_END}`}>
            {shortDate(startDate)} ~ {shortDate(endDate)}
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-1.5">
        <p className="min-w-0 flex-1 break-words text-[9px] leading-tight text-ink-3" title={lesson.lecturer}>
          {lesson.lecturer || 'TBA'}
        </p>
        <span className="shrink-0 whitespace-nowrap rounded bg-panel px-1 py-0.5 text-[9px] font-medium leading-tight text-ink-2">
          {lesson.room || 'No Room'}
        </span>
      </div>
    </button>
  )
}

export default function TimetableGrid({
  groups,
  selectedId,
  onSelect,
  zoom = 100,
  selectedLesson,
  onLessonSelect,
  onCellDrop,
  exportMode = false,
  view = 'group',
}) {
  const entity = groups.find((g) => g.id === selectedId) ?? groups[0]
  if (!entity) return null

  const colW = Math.round(BASE_COL_W * (zoom / 100))
  const tableMinW = DAY_COL_W + SLOTS * colW
  const subtitle = entity.title ?? (entity.count != null ? `${entity.count} students` : 'Active Intake')

  return (
    <div className={exportMode ? 'space-y-2 bg-white' : 'space-y-3'}>
      <div className={exportMode ? 'px-1' : 'rounded-lg border border-line bg-white px-3 py-2.5 shadow-xs'}>
        <h2 className={`font-bold text-ink ${exportMode ? 'text-xl' : 'text-base'}`}>{entity.id}</h2>
        <p className={`mt-0.5 text-ink-3 ${exportMode ? 'text-xs' : 'text-[11px]'}`}>{subtitle}</p>
      </div>

      <div className={`overflow-hidden rounded-lg border bg-white ${exportMode ? 'border-slate-300' : 'border-line shadow-xs'}`}>
        <div className={`grid grid-cols-2 border-b border-line text-ink-3 ${exportMode ? 'bg-slate-100 px-4 py-2.5 text-[11px]' : 'bg-panel px-3 py-2 text-[10px]'}`}>
          <div><span className="font-semibold text-ink">TIMETABLE:</span> {entity.id}</div>
          <div className="text-right"><span className="font-semibold text-ink">SEMESTER START:</span> {SEMESTER_START} &nbsp;|&nbsp; <span className="font-semibold text-ink">END:</span> {SEMESTER_END}</div>
        </div>

        <div className={exportMode ? '' : 'overflow-x-auto'}>
          <table
            className={`w-full border-collapse text-ink ${exportMode ? 'text-[9px]' : 'text-[10px]'}`}
            style={exportMode ? { tableLayout: 'fixed', width: '100%' } : { tableLayout: 'fixed', minWidth: tableMinW }}
          >
            <colgroup>
              <col style={{ width: exportMode ? EXPORT_DAY_COL_W : DAY_COL_W }} />
              {TIME_SLOTS.map((slot) => (
                <col key={slot} style={exportMode ? undefined : { width: colW }} />
              ))}
            </colgroup>
            <thead>
              <tr className={`border-b border-line font-semibold text-ink-3 ${exportMode ? 'bg-slate-100' : 'bg-panel'}`}>
                <th className={`border-r border-line p-1.5 text-left ${exportMode ? 'bg-slate-100' : 'sticky left-0 z-10 bg-panel'}`}>
                  DAY / TIME
                </th>
                {TIME_SLOTS.map((slot) => {
                  const [from, to] = slot.split('–')
                  return (
                    <th key={slot} className={`border-r border-line text-center ${exportMode ? 'p-1 text-[8px]' : 'whitespace-nowrap p-1 text-[9px]'}`}>
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
              {DAY_NAMES.map((dayName, dayIdx) => {
                const lanes = layoutDay(entity.lessons.filter((l) => l.day === dayIdx))

                const emptyCell = (dayIndex, slot) => {
                  const canDrop = !exportMode && !!onCellDrop

                  return (
                    <td
                      key={`e-${slot}`}
                      onDragOver={(e) => { if (canDrop) e.preventDefault() }}
                      onDrop={(e) => {
                        if (canDrop) {
                          e.preventDefault()
                          try {
                            const raw = e.dataTransfer.getData('application/json')
                            if (raw) {
                              const lessonData = JSON.parse(raw)
                              onCellDrop({ day: dayIndex, slot, lesson: lessonData })
                            }
                          } catch (err) {
                            console.error(err)
                          }
                        }
                      }}
                      className={`border-r border-line p-1 ${canDrop ? 'cursor-pointer transition-colors hover:bg-navy-50/60' : ''}`}
                    />
                  )
                }

                return lanes.map((lane, laneIdx) => {
                  const cells = []
                  let cursor = 1

                  lane.items.forEach(({ lesson, start, span }) => {
                    for (; cursor < start; cursor++) {
                      cells.push(emptyCell(dayIdx, cursor))
                    }
                    const colors = courseColors(lesson)
                    const isSelected =
                      !exportMode &&
                      !!selectedLesson &&
                      selectedLesson.groupId === entity.id &&
                      selectedLesson.lesson.day === lesson.day &&
                      selectedLesson.lesson.period === lesson.period

                    cells.push(
                      <td
                        key={`l-${start}`}
                        colSpan={span}
                        className={`border-r border-line bg-white p-1 ${exportMode ? 'align-middle' : 'align-top'}`}
                      >
                        {exportMode ? (
                          <ExportLessonCard lesson={lesson} colors={colors} span={span} view={view} />
                        ) : (
                          <LessonCard
                            lesson={lesson}
                            isSelected={isSelected}
                            colors={colors}
                            onClick={() => {
                              onSelect?.(entity.id)
                              onLessonSelect?.({ groupId: entity.id, lesson })
                            }}
                          />
                        )}
                      </td>,
                    )
                    cursor = start + span
                  })
                  for (; cursor <= SLOTS; cursor++) {
                    cells.push(emptyCell(dayIdx, cursor))
                  }

                  return (
                    <tr key={`${dayName}-${laneIdx}`} className={exportMode ? '' : ROW_H} style={exportMode ? { height: EXPORT_ROW_H } : undefined}>
                      {laneIdx === 0 && (
                        <td
                          rowSpan={lanes.length}
                          className={`border-r border-line bg-white p-1.5 text-[10px] font-bold text-ink ${exportMode ? '' : 'sticky left-0 z-10'}`}
                        >
                          {dayName}
                        </td>
                      )}
                      {cells}
                    </tr>
                  )
                })
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}