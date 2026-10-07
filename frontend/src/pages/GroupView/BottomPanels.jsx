// src/pages/GroupView/BottomPanels.jsx
import Badge from '../../components/Badge.jsx'; // 假设你有这个 Badge 组件，没有就用简单 div 替代

export default function BottomPanels() {
  return (
    <div className="mt-4 flex flex-col gap-4 shrink-0">
      
      {/* Unplaced Lessons */}
      <div className="rounded-md border border-line bg-white p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[13px] font-semibold text-ink">Unplaced lessons</h3>
            <span className="flex size-5 items-center justify-center rounded-full bg-[#FBE2E6] text-[10px] font-bold text-danger">3</span>
            <span className="text-xs text-ink-3 ml-2">Drag a card onto the grid, or let the scheduler place it</span>
          </div>
          <button className="rounded border border-line-strong bg-panel px-3 py-1 text-xs font-medium text-ink-2 hover:bg-line-2">
            Auto-place all
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-1">
          {/* Card 1 */}
          <div className="w-[180px] shrink-0 rounded border-t-2 border-[#14406E] border-x border-b border-line bg-[#F8FAFC] p-2">
             <div className="text-xs font-bold text-[#14406E]">Business Statistics</div>
             <div className="text-[11px] text-[#4A6B8F]">DB2542A · 2 periods</div>
             <div className="text-[11px] text-[#7A90AB] mt-1">needs a 40-seat room</div>
          </div>
          {/* Card 2 */}
          <div className="w-[180px] shrink-0 rounded border-t-2 border-[#5B4B8A] border-x border-b border-line bg-[#F9F8FC] p-2">
             <div className="text-xs font-bold text-[#5B4B8A]">Business Law</div>
             <div className="text-[11px] text-[#6F6295]">HM2601A · 2 periods</div>
             <div className="text-[11px] text-[#8C82AE] mt-1">Ms Chong busy Mon–Tue</div>
          </div>
          {/* Card 3 */}
          <div className="w-[180px] shrink-0 rounded border-t-2 border-[#C58A1E] border-x border-b border-line bg-[#FEFBF6] p-2">
             <div className="text-xs font-bold text-[#C58A1E]">Microeconomics</div>
             <div className="text-[11px] text-[#A57D2E]">Retake · 4 students</div>
             <div className="text-[11px] text-warn mt-1">clashes with 1 lecture</div>
          </div>
        </div>
      </div>

      {/* Retake students */}
      <div className="rounded-md border border-line bg-white p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[13px] font-semibold text-ink">Retake students</h3>
            <span className="text-xs text-ink-3">checked against each student's own group timetable</span>
          </div>
          <button className="rounded border border-line-strong bg-white px-3 py-1 text-xs font-medium text-ink-2 hover:bg-panel">
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
  )
}