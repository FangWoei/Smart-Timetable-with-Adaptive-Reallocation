// src/layouts/Footer.jsx
import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="w-full shrink-0 border-t border-line bg-white text-ink-3 z-30">
      {/* 上半部分：系统状态与主要链接 */}
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-4 md:flex-row">
        {/* 左侧：品牌 logo 与系统版本信息 */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-navy-700 text-xs font-bold text-white shadow-xs">
            ST
          </div>
          <div>
            <div className="text-xs font-bold text-navy-900">
              Smart Timetable <span className="text-[10px] font-semibold text-navy-500">v0.1.0</span>
            </div>
            <p className="text-[11px] text-ink-4">Adaptive Reallocation System</p>
          </div>
        </div>

        {/* 中间：系统实时状态监控指示器 */}
        <div className="flex items-center gap-4 rounded-full border border-line bg-panel px-3.5 py-1 text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-ok">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ok"></span>
            </span>
            Engine Operational
          </span>
          <span className="h-3 w-px bg-line"></span>
          <span className="text-ink-3">Supabase Connected</span>
          <span className="h-3 w-px bg-line"></span>
          <span className="font-mono text-ink-4">PNG Campus</span>
        </div>

        {/* 右侧：快速导航链接 */}
        <nav className="flex items-center gap-5 text-xs font-medium text-ink-2">
          <Link to="/group-view" className="transition-colors hover:text-navy-700">Scheduler</Link>
          <Link to="/students" className="transition-colors hover:text-navy-700">Students</Link>
          <Link to="/people" className="transition-colors hover:text-navy-700">Manage</Link>
          <Link to="/import" className="transition-colors hover:text-navy-700">Import</Link>
          <Link to="/holidays" className="transition-colors hover:text-navy-700">Holidays</Link>
        </nav>
      </div>

      {/* 下半部分：版权与法律声明底条 */}
      <div className="border-t border-line-2 bg-panel py-2.5 px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-[11px] text-ink-4 sm:flex-row">
          <p>© 2026 Peninsula College Malaysia. All rights reserved.</p>
          <p className="font-mono text-[10px]">
            STAR Timetable Scheduler · Powered by React 19 & Deno Edge
          </p>
        </div>
      </div>
    </footer>
  )
}