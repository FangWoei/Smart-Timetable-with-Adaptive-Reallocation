import { useMemo, useState } from 'react'
import Badge from '../../components/Badge.jsx'
import { STUDENTS } from '../../data/people.js'

export default function StudentViewPage() {
  const [query, setQuery] = useState('')
  const [retakeOnly, setRetakeOnly] = useState(false)
  const [selectedId, setSelectedId] = useState('2401019')
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)

  const timetableData = {
    '2401019': {
      programme: 'DIPLOMA IN BUSINESS (DB2601A)',
      semesterStart: '05/01/2026',
      semesterEnd: '24/04/2026',
      courses: [
        {
          id: 'c1',
          name: 'Business Statistics',
          day: 'MONDAY',
          startSlot: 1, 
          colSpan: 3,  
          timeStr: '08:00 – 09:30',
          room: 'BR-201',
          instructor: 'Dr. John Doe',
          startDate: '05/01/2026',
          endDate: '20/04/2026',
          tone: 'navy'
        },
        {
          id: 'c2',
          name: 'Afternoon Lab Session',
          day: 'MONDAY',
          startSlot: 13, 
          colSpan: 4,  
          timeStr: '02:00 – 04:00',
          room: 'BR-205',
          instructor: 'Tech Team',
          startDate: '12/01/2026',
          endDate: '20/04/2026',
          tone: 'amber'
        },
        {
          id: 'c3',
          name: 'Marketing Principles',
          day: 'TUESDAY',
          startSlot: 4,  
          colSpan: 4,  
          timeStr: '09:30 – 11:30',
          room: 'BR-105',
          instructor: 'Prof. Jane Smith',
          startDate: '06/01/2026',
          endDate: '21/04/2026',
          tone: 'emerald'
        },
        {
          id: 'c4',
          name: 'Accounting II',
          day: 'WEDNESDAY',
          startSlot: 1,  
          colSpan: 3,  // 调大 colSpan，确保有足够宽度展示完整名称
          timeStr: '08:00 – 09:30',
          room: 'BR-104',
          instructor: 'Dr. Wang',
          startDate: '07/01/2026',
          endDate: '22/04/2026',
          tone: 'amber',
          isRetake: true
        },
        {
          id: 'c5',
          name: 'Microeconomics',
          day: 'WEDNESDAY',
          startSlot: 5,  
          colSpan: 3,  // 调大 colSpan，避免挤压
          timeStr: '09:30 – 11:00',
          room: 'BR-104',
          instructor: 'Dr. Wang',
          startDate: '07/01/2026',
          endDate: '22/04/2026',
          tone: 'amber',
          isRetake: true
        },
        {
          id: 'c6',
          name: 'Business Law',
          day: 'THURSDAY',
          startSlot: 2,  
          colSpan: 4,  
          timeStr: '08:30 – 10:30',
          room: 'BR-308',
          instructor: 'Mr. Alan Lee',
          startDate: '08/01/2026',
          endDate: '23/04/2026',
          tone: 'purple'
        },
        {
          id: 'c7',
          name: 'Accounting Catchup',
          day: 'THURSDAY',
          startSlot: 11, 
          colSpan: 4,  
          timeStr: '01:00 – 03:00',
          room: 'BR-203',
          instructor: 'Dr. Wang',
          startDate: '08/01/2026',
          endDate: '23/04/2026',
          tone: 'amber'
        },
        {
          id: 'c8',
          name: 'Academic English',
          day: 'FRIDAY',
          startSlot: 1,  
          colSpan: 4,  
          timeStr: '08:00 – 10:00',
          room: 'BR-112',
          instructor: 'Ms. Sarah',
          startDate: '09/01/2026',
          endDate: '24/04/2026',
          tone: 'blue'
        },
        {
          id: 'c9',
          name: 'Evening Seminar',
          day: 'FRIDAY',
          startSlot: 19, 
          colSpan: 3,  
          timeStr: '05:00 – 06:30',
          room: 'Hall B',
          instructor: 'Guest',
          startDate: '09/01/2026',
          endDate: '24/04/2026',
          tone: 'emerald'
        }
      ]
    }
  }

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return STUDENTS.filter(
      (s) => (!retakeOnly || s.retake) && (!q || s.id.includes(q) || s.name.toLowerCase().includes(q)),
    )
  }, [query, retakeOnly])

  const student = STUDENTS.find((s) => s.id === selectedId) || STUDENTS[0]
  const currentTimetable = timetableData[student.id] || timetableData['2401019']

  const timeSlots = [
    '08:00–08:30', '08:30–09:00', '09:00–09:30', '09:30–10:00',
    '10:00–10:30', '10:30–11:00', '11:00–11:30', '11:30–12:00',
    '12:00–12:30', '12:30–01:00', '01:00–01:30', '01:30–02:00',
    '02:00–02:30', '02:30–03:00', '03:00–03:30', '03:30–04:00',
    '04:00–04:30', '04:30–05:00', '05:00–05:30', '05:30–06:00',
    '06:00–06:30', '06:30–07:00'
  ]

  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-panel">
      {/* 顶部操作与筛选栏 */}
      <div className="flex h-[52px] shrink-0 items-center gap-3 border-b border-line bg-white px-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by student ID or name…"
          aria-label="Search students"
          className="h-[30px] w-64 rounded border border-line bg-panel px-3 text-xs outline-none placeholder:text-ink-4 focus:border-navy-500"
        />
        <label className="flex items-center gap-2 text-[13px] text-ink-2 cursor-pointer select-none">
          <input 
            type="checkbox" 
            checked={retakeOnly} 
            onChange={(e) => setRetakeOnly(e.target.checked)} 
            className="rounded border-line-strong text-navy-700 focus:ring-navy-500"
          />
          Retake students only
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" className="h-[30px] rounded border border-line-strong bg-white px-3 text-[13px] font-medium text-ink-2 hover:bg-panel">
            Bulk-assign retakes
          </button>
          <button type="button" className="h-[30px] rounded border border-line-strong bg-white px-3 text-[13px] font-medium text-ink-2 hover:bg-panel">
            Export student list
          </button>
        </div>
      </div>

      {/* 主体布局 */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 左侧：学生名单侧边栏 */}
        <aside className="flex w-[240px] shrink-0 flex-col border-r border-line bg-white">
          <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
            Students — DB2601A ({STUDENTS.length})
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto divide-y divide-line-2">
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
                    <span className="w-12 font-mono text-ink-4 shrink-0">{s.id}</span>
                    <span className="truncate flex-1">{s.name}</span>
                    {s.retake && <span className="ml-auto shrink-0"><Badge tone="warn">RT</Badge></span>}
                  </button>
                </li>
              )
            })}
            {list.length === 0 && <li className="px-4 py-3 text-xs text-ink-4">No students match</li>}
          </ul>
          <div className="border-t border-line-2 px-3 py-2.5 text-[11px] text-ink-4 bg-white flex justify-between items-center">
            <span>18 students</span>
            <span className="font-medium text-amber-800">3 on retake</span>
          </div>
        </aside>

        {/* 中间：类教务大表网格课表 */}
        <main className="min-w-0 flex-1 overflow-y-auto p-5 space-y-5">
          {student && (
            <>
              {/* 学生基础信息头 */}
              <div className="flex items-start justify-between bg-white p-4 rounded-lg border border-line shadow-xs">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-4">Student ID {student.id}</p>
                  <h1 className="text-xl font-bold text-ink mt-0.5">{student.name}</h1>
                  <p className="text-xs text-ink-3 mt-1">Base group DB2601A · Diploma in Business, Year 1</p>
                </div>
                <div className="flex items-center gap-3">
                  {student.retake && <span className="mt-1"><Badge tone="warn">Retaking 1 subject</Badge></span>}
                  <button 
                    type="button"
                    onClick={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                    className="rounded border border-line-strong bg-panel px-3 py-1.5 text-xs font-medium text-ink-2 hover:bg-white transition-colors"
                  >
                    {isRightSidebarOpen ? 'Hide Queue Sidebar' : 'Show Queue Sidebar'}
                  </button>
                </div>
              </div>

              {/* 教务风时间大表容器 */}
              <div className="rounded-lg border border-line bg-white shadow-xs overflow-hidden">
                <div className="grid grid-cols-2 border-b border-line bg-panel px-4 py-2.5 text-[11px] text-ink-3">
                  <div>
                    <span className="font-semibold text-ink">PROGRAMME:</span> {currentTimetable.programme}
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-ink">SEMESTER START:</span> {currentTimetable.semesterStart} &nbsp;|&nbsp; <span className="font-semibold text-ink">END:</span> {currentTimetable.semesterEnd}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {/* 将表格最小宽度从 1600px 提升到 1800px，同时增大时间单元格宽度 w-24，给课程名字留出充足空间 */}
                  <table className="w-full border-collapse text-[11px] text-ink min-w-[1800px]">
                    <thead>
                      <tr className="border-b border-line bg-panel font-semibold text-ink-3">
                        <th className="border-r border-line p-2 text-left w-28 sticky left-0 bg-panel z-10">DAY / TIME</th>
                        {timeSlots.map((slot, idx) => (
                          <th key={idx} className="border-r border-line p-1.5 text-center w-24">{slot}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {days.map((dayName) => {
                        const dayCourses = currentTimetable.courses.filter(c => c.day === dayName)
                        
                        return (
                          <tr key={dayName} className="hover:bg-panel/40 transition-colors h-16">
                            <td className="border-r border-line p-2.5 font-bold bg-white sticky left-0 z-10 text-ink">{dayName}</td>
                            
                            {(() => {
                              let currentSlotIndex = 1
                              const cells = []
                              const sortedDayCourses = [...dayCourses].sort((a, b) => a.startSlot - b.startSlot)

                              sortedDayCourses.forEach((course) => {
                                while (currentSlotIndex < course.startSlot) {
                                  cells.push(
                                    <td key={`empty-${dayName}-${currentSlotIndex}`} className="border-r border-line p-1.5"></td>
                                  )
                                  currentSlotIndex++
                                }

                                const toneClasses = {
                                  navy: 'bg-navy-50/40 border-navy-200 text-navy-900',
                                  amber: 'bg-amber-50/50 border-amber-300 text-amber-900',
                                  emerald: 'bg-emerald-50/40 border-emerald-200 text-emerald-900',
                                  purple: 'bg-purple-50/40 border-purple-200 text-purple-900',
                                  blue: 'bg-blue-50/40 border-blue-200 text-blue-900'
                                }[course.tone] || 'bg-panel border-line text-ink'

                                cells.push(
                                  <td key={course.id} colSpan={course.colSpan} className={`border-r border-line p-1.5 align-middle ${toneClasses.split(' ')[0]}`}>
                                    <div className={`rounded border ${toneClasses.split(' ')[1]} bg-white p-2 shadow-xs space-y-1`}>
                                      <div className="flex justify-between items-center gap-2">
                                        {/* 移除 truncate，允许长名字自然展示（或在宽度极小时自适应） */}
                                        <p className={`font-bold ${toneClasses.split(' ')[2]} text-[11px] leading-tight`}>{course.name}</p>
                                        <span className="text-[9px] text-ink-4 bg-panel px-1.5 py-0.5 rounded shrink-0" title={`Active: ${course.startDate} to ${course.endDate}`}>
                                          {course.startDate.slice(0, 5)} ~ {course.endDate.slice(0, 5)}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-ink-3">{course.instructor} · {course.room}</p>
                                    </div>
                                  </td>
                                )
                                currentSlotIndex += course.colSpan
                              })

                              while (currentSlotIndex <= 22) {
                                cells.push(
                                  <td key={`empty-end-${dayName}-${currentSlotIndex}`} className="border-r border-line p-1.5"></td>
                                )
                                currentSlotIndex++
                              }

                              return cells
                            })()}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 底部调整卡片 */}
              <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">Retake: Microeconomics</h3>
                    <span className="rounded bg-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-900">scheduled</span>
                  </div>
                </div>

                <div className="divide-y divide-amber-200/60 text-xs text-ink-2">
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-3">Original attempt</span>
                    <span className="font-medium text-ink">DB2601A, Aug 2025 intake — failed</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-3">Constraint</span>
                    <span className="font-medium text-ink">must not conflict with current timetable</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-3">Placed slot</span>
                    <span className="font-medium text-ink">Wed 09:30–11:00 (07/01/2026 – 22/04/2026) · BR-104 · Dr Wang</span>
                  </div>
                  <div className="py-1.5 flex justify-between">
                    <span className="text-ink-3">Schedule status</span>
                    <span className="font-medium text-amber-800">aligned with alternate retake window</span>
                  </div>
                </div>

                <div className="rounded-md bg-white p-3 border border-amber-200 flex items-center justify-between gap-4">
                  <p className="text-xs text-ink leading-relaxed">
                    <span className="font-semibold text-amber-900">Suggested:</span> assign this student to the Thursday Accounting II group catch-up section to balance weekly contact hours.
                  </p>
                  <button type="button" className="shrink-0 rounded bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

        {/* 右侧：Retake 队列与冲突侧边栏（可折叠） */}
        {isRightSidebarOpen && (
          <aside className="flex w-[280px] shrink-0 flex-col border-l border-line bg-white overflow-y-auto p-3.5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wide text-ink-4">Retake Queue</h2>
                <p className="text-[11px] text-ink-3 mt-0.5">7 students across 5 subjects</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsRightSidebarOpen(false)}
                className="text-xs text-ink-4 hover:text-ink font-bold px-1.5 py-0.5 rounded border border-line"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <div className="rounded-md border border-navy-500 bg-navy-50 p-2.5 text-xs space-y-1">
                <div className="font-bold text-navy-900">2401019 · Nur Aisyah B.</div>
                <div className="text-ink-2">Microeconomics — placed, scheduled safely</div>
              </div>

              <div className="rounded-md border border-red-300 bg-red-50 p-2.5 text-xs space-y-1">
                <div className="font-bold text-red-900">2401011 · Tan Wei Jie</div>
                <div className="text-red-800">Business Law — conflicts with retake slot DB2601A</div>
              </div>

              <div className="rounded-md border border-line bg-panel p-2.5 text-xs space-y-1">
                <div className="font-bold text-ink">2401013 · Arvind Kumar</div>
                <div className="text-ink-1">Accounting I — placed, no conflict DB2601A</div>
              </div>
            </div>

            <div className="border-t border-line pt-3.5 space-y-3">
              <div>
                <p className="font-mono text-xs font-bold text-ink">2401011 — Tan Wei Jie</p>
                <p className="text-[11px] text-ink-4">Retaking Business Law</p>
              </div>

              <div className="text-xs space-y-1.5 bg-panel p-3 rounded-md border border-line">
                <div className="flex justify-between"><span className="text-ink-3">Base group</span><span className="font-medium">DB2601A</span></div>
                <div className="flex justify-between"><span className="text-ink-3">Retake section</span><span className="font-medium">HM2601A, Thu 13:00</span></div>
                <div className="flex justify-between"><span className="text-ink-3">Conflict</span><span className="font-medium text-red-600">own Business Law lecture</span></div>
                <div className="flex justify-between"><span className="text-ink-3">Same subject?</span><span className="font-medium">yes — attends either, not both</span></div>
              </div>

              <div className="rounded-md border border-line bg-white p-3 space-y-2">
                <p className="text-xs font-bold text-ink">Suggested fix?</p>
                <p className="text-[11px] text-ink-3 leading-relaxed">
                  Re-route attendance to the alternate retake lecture slot.
                </p>
                <div className="flex gap-2 pt-1">
                  <button type="button" className="flex-1 rounded bg-navy-700 py-1.5 text-xs font-semibold text-white hover:bg-navy-900 transition-colors">
                    Apply fix
                  </button>
                  <button type="button" className="flex-1 rounded border border-line-strong py-1.5 text-xs font-medium text-ink-2 hover:bg-panel transition-colors">
                    Reassign slot
                  </button>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}