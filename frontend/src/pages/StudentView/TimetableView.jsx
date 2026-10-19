// src/pages/StudentView/TimetableView.jsx
const TIME_SLOTS = [
  '08:00–08:30', '08:30–09:00', '09:00–09:30', '09:30–10:00',
  '10:00–10:30', '10:30–11:00', '11:00–11:30', '11:30–12:00',
  '12:00–12:30', '12:30–13:00', '13:00–13:30', '13:30–14:00',
  '14:00–14:30', '14:30–15:00', '15:00–15:30', '15:30–16:00',
  '16:00–16:30', '16:30–17:00', '17:00–17:30', '17:30–18:00',
  '18:00–18:30', '18:30–19:00',
]

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

const TONES = {
  navy: ['bg-navy-50/40', 'border-navy-200', 'text-navy-900'],
  amber: ['bg-amber-50/50', 'border-amber-300', 'text-amber-900'],
  emerald: ['bg-emerald-50/40', 'border-emerald-200', 'text-emerald-900'],
  purple: ['bg-purple-50/40', 'border-purple-200', 'text-purple-900'],
  blue: ['bg-blue-50/40', 'border-blue-200', 'text-blue-900'],
}

function renderDayCells(dayName, courses) {
  const cells = []
  let cursor = 1
  const sorted = [...courses].sort((a, b) => a.startSlot - b.startSlot)

  sorted.forEach((course) => {
    while (cursor < course.startSlot) {
      cells.push(<td key={`empty-${dayName}-${cursor}`} className="border-r border-line p-1.5" />)
      cursor++
    }
    const [bg, border, text] = TONES[course.tone] || ['bg-panel', 'border-line', 'text-ink']

    cells.push(
      <td key={course.id} colSpan={course.colSpan} className={`border-r border-line p-1.5 align-middle ${bg}`}>
        <div className={`rounded border ${border} bg-white p-2 shadow-xs space-y-1`}>
          <div className="flex items-center justify-between gap-2">
            <p className={`font-bold ${text} text-[11px] leading-tight`}>{course.name}</p>
            <span
              className="shrink-0 rounded bg-panel px-1.5 py-0.5 font-mono text-[9px] text-ink-4"
              title={`Active: ${course.startDate} to ${course.endDate}`}
            >
              {course.startDate.slice(0, 5)} ~ {course.endDate.slice(0, 5)}
            </span>
          </div>
          <p className="text-[10px] text-ink-3">
            {course.instructor} · {course.room}
          </p>
        </div>
      </td>,
    )
    cursor += course.colSpan
  })

  while (cursor <= TIME_SLOTS.length) {
    cells.push(<td key={`empty-end-${dayName}-${cursor}`} className="border-r border-line p-1.5" />)
    cursor++
  }
  return cells
}

/**
 * 页面显示和 PDF 导出共用同一个组件
 * exportMode = true 时：隐藏 Student ID、去掉 sticky、固定宽度
 */
export default function TimetableView({ student, timetable, exportMode = false }) {
  return (
    <div className={exportMode ? 'bg-white p-6' : 'space-y-5'}>
      {/* 学生信息头 */}
      <div
        className={
          exportMode
            ? 'mb-3'
            : 'flex items-start justify-between rounded-lg border border-line bg-white p-4 shadow-xs'
        }
      >
        <div>
          {!exportMode && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">
              Student ID {student.id}
            </p>
          )}
          <h1 className="mt-0.5 text-xl font-bold text-ink">{student.name}</h1>
          <p className="mt-1 text-xs text-ink-3">Base group DB2601A · Diploma in Business, Year 1</p>
        </div>
      </div>

      {/* 时间表 */}
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-xs">
        <div className="grid grid-cols-2 border-b border-line bg-panel px-4 py-2.5 text-[11px] text-ink-3">
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
            className="w-full border-collapse text-[11px] text-ink"
            style={{ minWidth: exportMode ? 1600 : 1800 }}
          >
            <thead>
              <tr className="border-b border-line bg-panel font-semibold text-ink-3">
                <th
                  className={`w-28 border-r border-line bg-panel p-2 text-left ${
                    exportMode ? '' : 'sticky left-0 z-10'
                  }`}
                >
                  DAY / TIME
                </th>
                {TIME_SLOTS.map((slot) => (
                  <th key={slot} className="w-24 border-r border-line p-1.5 text-center">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {DAYS.map((dayName) => (
                <tr key={dayName} className="h-16">
                  <td
                    className={`border-r border-line bg-white p-2.5 font-bold text-ink ${
                      exportMode ? '' : 'sticky left-0 z-10'
                    }`}
                  >
                    {dayName}
                  </td>
                  {renderDayCells(
                    dayName,
                    timetable.courses.filter((c) => c.day === dayName),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}