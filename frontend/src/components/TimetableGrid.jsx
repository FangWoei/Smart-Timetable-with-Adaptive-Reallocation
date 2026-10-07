// src/components/TimetableGrid.jsx
import { DAYS } from "../data/timetable.js";

const LABEL_W = 104;

// 扩充至 19:00（共 23 个半小时时间槽）
const HALF_HOURS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', 
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', 
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', 
  '17:00', '17:30', '18:00', '18:30', '19:00'
];

const COLS = DAYS.length * HALF_HOURS.length; 

const startCol = (day, halfHourIndex) => day * HALF_HOURS.length + halfHourIndex + 2;

// 采用与 StudentViewPage 一致的柔和教务风配色样式
const TONE_CLASSES = {
  navy: 'bg-navy-50/40 border-navy-200 text-navy-900',
  amber: 'bg-amber-50/50 border-amber-300 text-amber-900',
  emerald: 'bg-emerald-50/40 border-emerald-200 text-emerald-900',
  purple: 'bg-purple-50/40 border-purple-200 text-purple-900',
  blue: 'bg-blue-50/40 border-blue-200 text-blue-900',
};

function Lesson({ lesson, column, onClick, isSelected }) {
  const { conflict, startDate, endDate } = lesson;
  const toneStyle = TONE_CLASSES[lesson.tone] || TONE_CLASSES.navy;
  const borderColor = conflict ? 'border-red-300 bg-red-50/50 text-red-900' : toneStyle.split(' ')[1];
  const textColor = conflict ? 'text-red-900' : toneStyle.split(' ')[2];

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    return dateStr.length >= 5 ? dateStr.slice(0, 5) : dateStr;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        gridColumn: `${column} / span ${lesson.span}`,
        gridRow: 1,
      }}
      className={[
        "relative z-10 m-[2px] overflow-hidden rounded border bg-white p-1.5 shadow-xs text-left transition-all cursor-pointer hover:shadow-sm flex flex-col justify-between",
        borderColor,
        isSelected && !conflict ? "ring-2 ring-navy-500 ring-offset-1" : "",
        conflict ? "outline outline-2 -outline-offset-2 outline-danger" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-1 w-full">
        <span className={`font-bold text-[11px] leading-tight truncate ${textColor}`}>
          {lesson.code || lesson.name}
        </span>
        {(startDate || endDate) && (
          <span 
            className="text-[9px] text-ink-4 bg-panel px-1 py-0.5 rounded shrink-0 font-mono"
            title={`Active: ${startDate || '05/01/2026'} ~ ${endDate || '24/04/2026'}`}
          >
            {formatShortDate(startDate)} ~ {formatShortDate(endDate)}
          </span>
        )}
      </div>

      <div className="mt-0.5 space-y-0.5">
        <span className="block text-[10px] text-ink-3 truncate">
          {lesson.room} {lesson.lecturer ? `· ${lesson.lecturer}` : ''}
        </span>
      </div>
    </button>
  );
}

export default function TimetableGrid({ groups, selectedId, onSelect, zoom, selectedLesson, onLessonSelect }) {
  const cell = Math.round(32 * (zoom / 100));
  const template = `${LABEL_W}px repeat(${COLS}, minmax(${cell}px, 1fr))`;

  return (
    <div className="overflow-auto rounded-md border border-line bg-white flex-1 shadow-xs">
      <div style={{ minWidth: LABEL_W + COLS * cell }}>
        
        {/* 表头第一行：星期 (Monday, Tuesday...) */}
        <div
          className="grid border-b border-line-2 bg-[#E8EDF4] text-xs font-semibold text-ink-2"
          style={{
            gridTemplateColumns: `${LABEL_W}px repeat(${DAYS.length}, minmax(0, 1fr))`,
          }}>
          <div className="px-3 py-1.5 flex items-center justify-between text-[11px] text-ink-3">
            <span>SEMESTER: 05/01/2026 – 24/04/2026</span>
          </div>
          {DAYS.map((d) => (
            <div
              key={d}
              className="border-l border-line-strong py-1.5 text-center">
              {d}
            </div>
          ))}
        </div>

        {/* 表头第二行：半小时时间刻度表头（上下两行完全统一字体大小、粗细与颜色） */}
        <div
          className="grid bg-panel text-[9px] text-ink border-b border-line"
          style={{ gridTemplateColumns: template }}>
          <div className="px-3 py-1 text-xs font-bold text-ink flex items-center">Group / Time</div>
          {DAYS.map((_, dayIdx) =>
            HALF_HOURS.map((time, hIdx) => {
              const [hourStr, minStr] = time.split(':');
              let hour = parseInt(hourStr, 10);
              let min = parseInt(minStr, 10);
              min += 30;
              if (min >= 60) {
                hour += 1;
                min -= 60;
              }
              const endTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

              return (
                <div
                  key={`${dayIdx}-${hIdx}`}
                  className={`py-1 text-center leading-tight flex flex-col justify-center ${hIdx === 0 ? "border-l border-line-strong font-medium text-ink" : "border-l border-line-2 font-medium text-ink"}`}>
                  {/* 上下两行使用完全相同的 text-ink 颜色和 text-[9px] 字号 */}
                  <span className="text-[9px] text-ink">{time}</span>
                  <span className="text-[9px] text-ink">{endTime}</span>
                </div>
              );
            })
          )}
        </div>

        {/* 内容区域：左侧 Group，右侧半小时矩阵网格 */}
        {groups.map((g) => {
          const active = g.id === selectedId;
          return (
            <div
              key={g.id}
              className="grid h-16 border-t border-line-2 items-center relative"
              style={{ gridTemplateColumns: template }}>
              
              {/* 左侧 Group 列 */}
              <button
                type="button"
                onClick={() => onSelect(g.id)}
                aria-current={active ? "true" : undefined}
                style={{ gridColumn: 1, gridRow: 1 }}
                className={[
                  "px-3 text-left text-xs h-full flex flex-col justify-center",
                  active
                    ? "bg-navy-50 font-semibold text-navy-700 border-l-[3px] border-navy-700"
                    : "bg-[#FAFBFD] text-ink hover:bg-navy-50/60",
                ].join(" ")}>
                <span className="font-bold">{g.id}</span>
                <span className="text-[10px] text-ink-4">Active Intake</span>
              </button>

              {/* 背景半小时竖线网格 */}
              {Array.from({ length: COLS }, (_, i) => (
                <div
                  key={i}
                  style={{ gridColumn: i + 2, gridRow: 1 }}
                  className={`h-full border-l ${i % HALF_HOURS.length === 0 ? "border-line-strong" : "border-line-2"}`}
                />
              ))}

              {/* 课程渲染 */}
              {g.lessons.map((l, i) => {
                const isSelected = selectedLesson && 
                                   selectedLesson.groupId === g.id && 
                                   selectedLesson.lesson.day === l.day && 
                                   selectedLesson.lesson.period === l.period;
                
                const halfHourIndex = (l.period || l.startSlot || 1) - 1;
                const spanInHalfHours = (l.span || 2) * 2;

                return (
                  <Lesson 
                    key={`lesson-${i}`} 
                    lesson={{ ...l, span: spanInHalfHours }} 
                    column={startCol(l.day, halfHourIndex)} 
                    isSelected={isSelected}
                    onClick={() => {
                      onSelect(g.id);
                      if (onLessonSelect) {
                        onLessonSelect({ groupId: g.id, lesson: l });
                      }
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}