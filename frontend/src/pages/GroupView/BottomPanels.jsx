// src/pages/GroupView/BottomPanels.jsx
import React from 'react';

export default function BottomPanels({ unplacedLessons = [], onAutoPlaceAll }) {
  return (
    <div className="mt-4 flex flex-col gap-4 shrink-0">
      {/* Unplaced Lessons */}
      <div className="rounded-md border border-line bg-white p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-ink">Unplaced lessons</h3>
            <span className="flex size-5 items-center justify-center rounded-full bg-[#FBE2E6] text-[10px] font-bold text-danger">
              {unplacedLessons.length}
            </span>
            <span className="text-xs text-ink-3 ml-2">Drag a card onto the grid, or let the scheduler place it</span>
          </div>
          <button
            type="button"
            onClick={onAutoPlaceAll}
            className="rounded border border-line-strong bg-panel px-3 py-1 text-xs font-medium text-ink-2 hover:bg-line-2 transition-colors"
          >
            Auto-place all
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1 min-h-[76px]">
          {unplacedLessons.map((lesson) => {
            const toneBorder =
              lesson.tone === 'amber'
                ? 'border-[#C58A1E]'
                : lesson.tone === 'purple'
                ? 'border-[#5B4B8A]'
                : 'border-[#14406E]';
            const toneBg =
              lesson.tone === 'amber'
                ? 'bg-[#FEFBF6]'
                : lesson.tone === 'purple'
                ? 'bg-[#F9F8FC]'
                : 'bg-[#F8FAFC]';
            const toneTitle =
              lesson.tone === 'amber'
                ? 'text-[#C58A1E]'
                : lesson.tone === 'purple'
                ? 'text-[#5B4B8A]'
                : 'text-[#14406E]';

            return (
              <div
                key={lesson.id || lesson.code}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify(lesson));
                }}
                className={`w-[180px] shrink-0 rounded border-t-2 ${toneBorder} border-x border-b border-line ${toneBg} p-2 cursor-grab active:cursor-grabbing shadow-xs transition-transform hover:-translate-y-0.5 select-none`}
              >
                <div className={`text-xs font-bold ${toneTitle}`}>{lesson.name || lesson.code}</div>
                <div className="text-[11px] text-ink-3">
                  {lesson.group || 'DB2601A'} · {lesson.span || 2} periods
                </div>
                <div className="text-[11px] text-ink-4 mt-1 truncate">{lesson.note || (lesson.needs_lab ? 'needs a lab' : 'needs a room')}</div>
              </div>
            );
          })}
          {unplacedLessons.length === 0 && (
            <div className="flex items-center justify-center w-full text-xs text-ink-4 py-4">
              All lessons have been placed on the timetable! 🎉
            </div>
          )}
        </div>
      </div>

      {/* Retake students */}
      <div className="rounded-md border border-line bg-white p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[13px] font-semibold text-ink">Retake students</h3>
            <span className="text-xs text-ink-3">checked against each student's own group timetable</span>
          </div>
          <button type="button" className="rounded border border-line-strong bg-white px-3 py-1 text-xs font-medium text-ink-2 hover:bg-panel">
            Open manager
          </button>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-ink-4 border-b border-line-2">
              <th className="pb-2 font-normal">Student</th>
              <th className="pb-2 font-normal">Subject</th>
              <th className="pb-2 font-normal">Placed in</th>
              <th className="pb-2 font-normal">Slot</th>
              <th className="pb-2 font-normal">Check</th>
            </tr>
          </thead>
          <tbody className="text-ink-2">
            <tr className="border-b border-line-2 last:border-0">
              <td className="py-2 font-medium text-ink">Nur Aisyah B.</td>
              <td className="py-2">Microeconomics</td>
              <td className="py-2">DB2542A session</td>
              <td className="py-2">Mon P4 · BR-104</td>
              <td className="py-2">
                <span className="rounded-full bg-[#E4F1EA] px-2 py-0.5 text-[10px] font-bold text-ok">clear</span>
              </td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-ink">Tan Wei Jie</td>
              <td className="py-2">Business Law</td>
              <td className="py-2">DB2542B session</td>
              <td className="py-2">Thu P3 · BR-308</td>
              <td className="py-2">
                <span className="rounded-full bg-[#FBE2E6] px-2 py-0.5 text-[10px] font-bold text-danger">overlaps 1</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}