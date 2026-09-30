// src/pages/GroupView/LessonDetailsPanel.jsx
import { DAYS } from '../../data/timetable.js'

export default function LessonDetailsPanel({ lesson, group, onClose }) {
  if (!lesson) return null

  // 辅助函数，将周期数组转换为字符串，例如：period 1-2
  const formatPeriod = (start, span) => {
    if (span === 1) return `period ${start}`
    return `period ${start}–${start + span - 1}`
  }

  // 模拟数据，后续需替换为真实逻辑
  const fullSubjectName = lesson.code === 'AC' ? 'Accounting II' : 
                          lesson.code === 'FM' ? 'Financial Mgmt' : lesson.code
  const seatsNeeded = 38
  const seatsTotal = 40
  const durationText = `${lesson.span} periods, not split`
  const positionText = 'unlocked'

  return (
    <aside className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-l border-line bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-ink-4 uppercase mb-1">
            Selected Lesson
          </div>
          <h2 className="text-lg font-semibold text-ink">{fullSubjectName}</h2>
          <div className="text-[13px] text-ink-3 mt-1">
            {group.id} · {DAYS[lesson.day]}, {formatPeriod(lesson.period, lesson.span)}
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-ink-4 hover:text-ink-2"
          aria-label="Close details"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l8 8m0-8l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-3 text-[13px] border-b border-line pb-4 mb-4">
        <div className="flex justify-between">
          <span className="text-ink-3">Lecturer</span>
          <span className="text-ink text-right">{lesson.lecturer || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Room</span>
          <span className={`text-right ${lesson.conflict ? 'text-danger font-medium' : 'text-ink'}`}>
            {lesson.room}{lesson.conflict ? ' — taken' : ''}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Seats needed</span>
          <span className="text-ink text-right">{seatsNeeded} of {seatsTotal}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Duration</span>
          <span className="text-ink text-right">{durationText}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-3">Position</span>
          <span className="text-ink text-right">{positionText}</span>
        </div>
      </div>

      {lesson.conflict && (
        <>
          <div className="mb-4 rounded bg-[#FBE2E6] p-3 text-[13px]">
            <div className="flex items-center gap-2 mb-1.5 font-bold text-danger">
               <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                 <path d="M7 0C3.134 0 0 3.134 0 7s3.134 7 7 7 7-3.134 7-7-3.134-7-7-7zm-.75 3.5h1.5v4h-1.5v-4zm.75 6.5c-.552 0-1-.448-1-1s.448-1 1-1 1 .448 1 1-.448 1-1 1z" />
               </svg>
               Room double-booked
            </div>
            <div className="text-[#A4505E] leading-tight mb-2">
              {lesson.room} is also held by DB2542B for {fullSubjectName} at the same time. One of the two has to move.
            </div>
            <div className="text-[11px] text-[#A4505E] font-medium opacity-80">
              Hard constraint - blocks approval
            </div>
          </div>

          <div className="mb-4">
             <div className="bg-navy-900 rounded-t p-3 text-white">
                <div className="text-[13px] font-semibold mb-1">Suggested fixes</div>
                <div className="text-[11px] text-navy-200">ranked by knock-on effect</div>
             </div>
             <div className="bg-navy-700 p-3 hover:bg-navy-500 cursor-pointer transition-colors border-b border-navy-900/50">
                <div className="text-[13px] font-semibold text-white mb-0.5">Move Financial Mgmt to BR-305</div>
                <div className="text-[11px] text-navy-100">same slot - 44 seats - free all day</div>
                <div className="text-[11px] text-[#86D6B1] font-medium mt-1">0 other lessons affected</div>
             </div>
             <div className="bg-navy-700 rounded-b p-3 hover:bg-navy-500 cursor-pointer transition-colors">
                <div className="text-[13px] font-semibold text-white mb-0.5">Shift Accounting II to period 4</div>
                <div className="text-[11px] text-navy-100">keeps the lab</div>
                <div className="text-[11px] text-warn font-medium mt-1">creates a 2-period gap for DB2601A</div>
             </div>
          </div>

          <div className="flex gap-2">
            <button className="flex-1 rounded bg-navy-700 py-2 text-[13px] font-semibold text-white hover:bg-navy-900">
              Apply fix
            </button>
            <button className="flex-1 rounded border border-line-strong bg-white py-2 text-[13px] font-medium text-ink-2 hover:bg-panel">
              Move manually
            </button>
          </div>
        </>
      )}

      {!lesson.conflict && (
         <div className="mt-auto">
            {/* 预留给非冲突状态下的操作或信息 */}
         </div>
      )}
    </aside>
  )
}