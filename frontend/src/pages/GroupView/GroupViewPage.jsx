// src/pages/GroupView/GroupViewPage.jsx
import { useState } from 'react'
import Toolbar from './Toolbar.jsx'
import Sidebar from './Sidebar.jsx'
import TimetableGrid from '../../components/TimetableGrid.jsx'
import LessonDetailsPanel from './LessonDetailsPanel.jsx'
import BottomPanels from './BottomPanels.jsx' // 引入新面板
import { GROUPS } from '../../data/timetable.js'

export default function GroupViewPage() {
  const [view, setView] = useState('group')
  const [selectedId, setSelectedId] = useState(GROUPS[0].id)
  const [zoom, setZoom] = useState(100)
  
  const [selectedLessonData, setSelectedLessonData] = useState(null)

  const conflicts = GROUPS.reduce((n, g) => n + g.lessons.filter((l) => l.conflict).length, 0)
  const placedLessonsCount = 42; // 模拟数据
  const totalLessonsCount = 45;

  const selectedGroup = selectedLessonData 
    ? GROUPS.find(g => g.id === selectedLessonData.groupId) 
    : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col relative">
      <Toolbar
        view={view}
        onViewChange={setView}
        onGenerate={() => {}}
        onVerify={() => {}}
        onApprove={() => {}}
        canApprove={conflicts === 0}
      />

      {/* 主体容器，减去底部状态栏的高度 */}
      <div className="flex min-h-0 flex-1 overflow-hidden pb-8"> 
        <Sidebar groups={GROUPS} selectedId={selectedId} onSelect={setSelectedId} />

        {/* 中间主要区域：表头 + 可滚动的(网格 + 底部面板) */}
        <main className="min-w-0 flex-1 flex flex-col overflow-hidden bg-canvas">
          
          {/* 固定在顶部的控制栏 */}
          <div className="px-4 pt-3 pb-2 flex shrink-0 items-center gap-4 bg-canvas z-10 border-b border-transparent">
            <h1 className="text-[15px] font-semibold text-ink">January 2026 — all groups</h1>
            <p className="text-xs text-ink-3">5 days · periods 1–5 · 08:00 to 17:00</p>
            {conflicts > 0 && (
              <p className="text-xs font-medium text-danger">
                {conflicts} conflicts to resolve before approval
              </p>
            )}

            <div className="ml-auto flex items-center rounded border border-line bg-white text-[13px] text-ink-2">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((z) => Math.max(70, z - 10))}
                className="px-2.5 py-0.5 hover:bg-panel"
              >
                −
              </button>
              <span className="w-11 text-center text-[11px] text-ink-3">{zoom}%</span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(160, z + 10))}
                className="px-2.5 py-0.5 hover:bg-panel"
              >
                +
              </button>
            </div>
          </div>

          {/* 可滚动的区域包含网格和下方面板 */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
             <TimetableGrid 
               groups={GROUPS} 
               selectedId={selectedId} 
               onSelect={setSelectedId} 
               zoom={zoom} 
               selectedLesson={selectedLessonData}
               onLessonSelect={setSelectedLessonData}
             />
             <BottomPanels />
          </div>
        </main>
        
        {/* 右侧边栏 */}
        {selectedLessonData && selectedGroup && (
          <LessonDetailsPanel 
            lesson={selectedLessonData.lesson} 
            group={selectedGroup}
            onClose={() => setSelectedLessonData(null)} 
          />
        )}
      </div>

      {/* 底部固定状态栏 */}
      <footer className="absolute bottom-0 left-0 right-0 h-8 flex items-center justify-between border-t border-line-strong bg-[#E8EDF4] px-4 text-[11px] text-ink-3 z-20">
        <div className="flex items-center gap-4">
          <span className="text-ink">{placedLessonsCount} of {totalLessonsCount} lessons placed</span>
          <span className="flex items-center gap-1.5 font-medium text-danger">
            <span className="size-1.5 rounded-full bg-danger"></span>
            2 hard conflicts
          </span>
          <span className="flex items-center gap-1.5 font-medium text-warn">
            <span className="size-1.5 rounded-full bg-warn"></span>
            1 soft warning
          </span>
        </div>
        <div className="flex items-center gap-4">
           <span>Last generated 09:42 · 4.2s · 31 constraints checked</span>
        </div>
        <div className="font-medium">
           Draft not approved
        </div>
      </footer>
    </div>
  )
}