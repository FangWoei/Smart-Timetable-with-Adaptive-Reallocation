// src/pages/GroupView/LessonDetailsPanel.jsx
import { DAYS } from '../../data/timetable.js'

const Row = ({ label, children, danger }) => (
  <div className="flex justify-between gap-3">
    <span className="shrink-0 text-ink-3">{label}</span>
    <span className={`text-right ${danger ? 'font-medium text-danger' : 'text-ink'}`}>{children}</span>
  </div>
)

export default function LessonDetailsPanel({ lesson, group, onClose }) {
  if (!lesson) return null

  const title = lesson.module || lesson.name || lesson.code
  const time =
    lesson.startTime && lesson.endTime ? `${lesson.startTime}–${lesson.endTime}` : `period ${lesson.period}`
  const hours = lesson.span ?? 0
  const groups = lesson.groups?.length ? lesson.groups.join(', ') : group.id

  return (
    <aside className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-l border-line bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-4">Selected Lesson</div>
          <h2 className="break-words text-lg font-semibold text-ink">{title}</h2>
          <div className="mt-1 text-[13px] text-ink-3">
            {DAYS[lesson.day]}, {time}
          </div>
        </div>
        <button onClick={onClose} className="text-ink-4 hover:text-ink-2" aria-label="Close details">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4l8 8m0-8l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4 text-[13px]">
        <Row label="Lecturer">{lesson.lecturer || '—'}</Row>
        <Row label="Room" danger={lesson.conflict}>
          {lesson.room || '—'}
          {lesson.conflict ? ' — taken' : ''}
        </Row>
        <Row label={lesson.groups?.length > 1 ? 'Groups' : 'Group'}>{groups}</Row>
        <Row label="Duration">
          {hours} {hours === 1 ? 'hour' : 'hours'}
        </Row>
        <Row label="Position">{lesson.locked ? 'locked' : 'unlocked'}</Row>
      </div>

      {lesson.conflict && (
        <div className="rounded bg-[#FBE2E6] p-3 text-[13px]">
          <div className="mb-1 font-bold text-danger">Clash</div>
          <div className="leading-tight text-[#A4505E]">
            This lesson clashes with another one at the same time. Move one of them.
          </div>
        </div>
      )}
    </aside>
  )
}