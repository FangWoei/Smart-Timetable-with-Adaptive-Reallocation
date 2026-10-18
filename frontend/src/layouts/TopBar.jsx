// src/layouts/TopBar.jsx
import { NavLink } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { NAV_ITEMS } from '../nav.js'

const MENUS = ['File', 'Edit', 'Data', 'Constraints', 'Timetable', 'View', 'Help']

export default function TopBar({ variant = 'workspace', user, fileName, dirty }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-6 border-b border-line bg-white px-5 shadow-xs">
      {/* 进一步加大外层容器的宽高和内部图片的最大高度限制 */}
      <div className="flex items-center [&>div]:h-[42px] [&>div]:w-[210px] [&_img]:max-h-[36px]">
        <Logo bordered={false} />
      </div>

      <span className="text-sm font-bold tracking-tight text-navy-900">
        Timetable Scheduler
      </span>

      {fileName && (
        <div className="hidden items-center gap-2 text-[13px] text-ink-3 lg:flex">
          <span>{fileName}</span>
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="size-2 rounded-full bg-warn" />
              unsaved changes
            </span>
          )}
        </div>
      )}

      {/* 导航栏：带有文字向上滚动 Hover 动效 */}
      <nav className="ml-2 flex items-center gap-6" aria-label="Sections">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                'relative flex h-6 items-center px-1 text-[13px] overflow-hidden group transition-colors font-medium',
                isActive ? 'text-navy-700 font-semibold' : 'text-ink-3 hover:text-ink',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span className="block group-hover:-translate-y-full transition-transform duration-300">
                  {item.label}
                </span>
                <span className="block absolute top-full left-1 group-hover:translate-y-[-100%] transition-transform duration-300">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {variant === 'workspace' && fileName && (
        <div className="hidden items-center gap-1 2xl:flex">
          {MENUS.map((m) => (
            <button
              key={m}
              type="button"
              className="rounded px-2.5 py-1 text-[13px] text-ink-2 hover:bg-panel hover:text-ink transition-colors"
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* 右侧用户信息 */}
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <div className="text-xs font-semibold text-ink">{user.name}</div>
          {user.role && <div className="text-[11px] text-ink-4">{user.role}</div>}
        </div>
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-navy-700 text-[10px] font-bold text-white shadow-xs"
        >
          {user.initials}
        </span>
      </div>
    </header>
  )
}