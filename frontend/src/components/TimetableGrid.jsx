// src/components/TimetableGrid.jsx

// ... 导入保持不变 ...
import { DAYS, PERIODS, TONES } from '../data/timetable.js'

const LABEL_W = 104
const COLS = DAYS.length * PERIODS.length

const startCol = (day, period) => day * PERIODS.length + (period - 1) + 2

// 增加 onClick 和 isSelected 属性
function Lesson({ lesson, column, onClick, isSelected }) {
  const t = TONES[lesson.tone]
  const { conflict, retake } = lesson
  const narrow = lesson.span === 1
  const label = `${lesson.code}, ${lesson.room}${lesson.lecturer ? `, ${lesson.lecturer}` : ''}${conflict ? ', conflict' : ''}`

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick} // 绑定点击事件
      style={{
        gridColumn: `${column} / span ${lesson.span}`,
        gridRow: 1,
        background: conflict ? '#FBE2E6' : t.bg,
      }}
      className={[
        'relative z-10 m-[2px] overflow-hidden rounded-[2px] px-0.5 pt-1.5 text-center leading-tight transition-shadow cursor-pointer hover:brightness-95',
        conflict ? 'outline outline-2 -outline-offset-2 outline-danger' : '',
        // 添加选中状态的阴影效果
        isSelected && !conflict ? 'ring-2 ring-navy-500 ring-offset-1' : '',
        isSelected && conflict ? 'ring-2 ring-danger ring-offset-1' : '',
      ].join(' ')}
    >
      {!conflict && <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: t.bar }} />}
      {conflict && (
        <span
          className="absolute right-0 top-0 size-1.5 bg-danger"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}
        />
      )}
      <span className="block text-[11px] font-bold" style={{ color: conflict ? '#C8102E' : t.code }}>
        {lesson.code}
      </span>
      <span className="block text-[10px]" style={{ color: conflict ? '#A4505E' : t.sub }}>
        {lesson.room}
      </span>
      {!narrow && lesson.lecturer && (
        <span className="block text-[10px]" style={{ color: conflict ? '#B96A76' : t.sub2 }}>
          {lesson.lecturer}
        </span>
      )}
    </button>
  )
}

// 增加 selectedLesson 和 onLessonSelect 属性
export default function TimetableGrid({ groups, selectedId, onSelect, zoom, selectedLesson, onLessonSelect }) {
  const cell = Math.round(26 * (zoom / 100))
  const template = `${LABEL_W}px repeat(${COLS}, minmax(${cell}px, 1fr))`

  return (
    <div className="overflow-auto rounded-md border border-line bg-white flex-1">
      <div style={{ minWidth: LABEL_W + COLS * cell }}>
        {/* ... 表头部分保持不变 ... */}
        <div
          className="grid border-b border-line-2 bg-[#E8EDF4] text-xs font-semibold text-ink-2"
          style={{ gridTemplateColumns: `${LABEL_W}px repeat(${DAYS.length}, minmax(0, 1fr))` }}
        >
          <div />
          {DAYS.map((d) => (
            <div key={d} className="border-l border-line-strong py-1.5 text-center">{d}</div>
          ))}
        </div>

        <div className="grid bg-panel text-[10px] text-ink-4" style={{ gridTemplateColumns: template }}>
          <div />
          {Array.from({ length: COLS }, (_, i) => (
            <div
              key={i}
              className={`py-[3px] text-center ${i % 5 === 0 ? 'border-l border-line-strong' : ''}`}
            >
              {(i % 5) + 1}
            </div>
          ))}
        </div>

        {groups.map((g) => {
          const active = g.id === selectedId
          return (
            <div
              key={g.id}
              className="grid h-12 border-t border-line-2"
              style={{ gridTemplateColumns: template }}
            >
              {/* ... 组别名称和网格线保持不变 ... */}
              <button
                type="button"
                onClick={() => onSelect(g.id)}
                aria-current={active ? 'true' : undefined}
                style={{ gridColumn: 1, gridRow: 1 }}
                className={[
                  'px-3 text-left text-xs',
                  active ? 'bg-navy-50 font-semibold text-navy-700' : 'bg-[#FAFBFD] text-ink hover:bg-navy-50/60',
                ].join(' ')}
              >
                {g.id}
              </button>

              {Array.from({ length: COLS }, (_, i) => (
                <div
                  key={i}
                  style={{ gridColumn: i + 2, gridRow: 1 }}
                  className={`border-l ${i % 5 === 0 ? 'border-line-strong' : 'border-line-2'}`}
                />
              ))}

              {g.freeSlots.map((s, i) => (
                <div
                  key={`free-${i}`}
                  aria-label="Free slot"
                  style={{ gridColumn: `${startCol(s.day, s.period)} / span ${s.span}`, gridRow: 1 }}
                  className="z-10 m-[2px] rounded-[2px] border border-dashed border-ok bg-[#E4F1EA]"
                />
              ))}

              {g.lessons.map((l, i) => {
                // 判断当前 lesson 是否是选中的 lesson
                const isSelected = selectedLesson && 
                                   selectedLesson.groupId === g.id && 
                                   selectedLesson.lesson.day === l.day && 
                                   selectedLesson.lesson.period === l.period;
                
                return (
                  <Lesson 
                    key={`lesson-${i}`} 
                    lesson={l} 
                    column={startCol(l.day, l.period)} 
                    isSelected={isSelected}
                    onClick={() => {
                      // 确保点击时也选中行，并触发外部选中事件
                      onSelect(g.id);
                      if (onLessonSelect) {
                        onLessonSelect({ groupId: g.id, lesson: l });
                      }
                    }}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}