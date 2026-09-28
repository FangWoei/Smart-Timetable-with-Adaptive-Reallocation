import { NavLink } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { NAV_ITEMS } from '../nav.js'

const MENUS = ['File', 'Edit', 'Data', 'Constraints', 'Timetable', 'View', 'Help']

export default function TopBar({ variant = 'workspace', user, fileName, dirty }) {
  const light = variant === 'home'

  const tabClass = ({ isActive }) =>
    [
      'relative flex h-11 items-center px-1 text-[13px] transition-colors',
      'after:absolute after:inset-x-0 after:bottom-[7px] after:h-[3px] after:rounded-full',
      light
        ? isActive
          ? 'font-semibold text-navy-700 after:bg-navy-700'
          : 'text-ink-3 hover:text-ink'
        : isActive
          ? 'font-semibold text-white after:bg-white'
          : 'text-navy-200 hover:text-white',
    ].join(' ')

  return (
    <header
      className={[
        'flex h-11 shrink-0 items-center gap-5 px-3',
        light ? 'border-b border-line bg-white' : 'bg-navy-900',
      ].join(' ')}
    >
      <Logo bordered={light} />

      <span className={`text-sm font-semibold ${light ? 'text-navy-700' : 'text-white'}`}>
        {light ? 'Scheduler' : 'Timetable Scheduler'}
      </span>

      {fileName && (
        <div className="hidden items-center gap-2 text-[13px] text-navy-200 lg:flex">
          <span>{fileName}</span>
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="size-2 rounded-full bg-warn" />
              unsaved changes
            </span>
          )}
        </div>
      )}

      <nav className="ml-2 flex items-center gap-5" aria-label="Sections">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={tabClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {variant === 'workspace' && fileName && (
        <div className="hidden items-center gap-1 2xl:flex">
          {MENUS.map((m) => (
            <button
              key={m}
              type="button"
              className="rounded px-2 py-1 text-[13px] text-navy-100 hover:bg-white/10 hover:text-white"
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden text-right sm:block">
          <div className={`text-xs ${light ? 'font-medium text-ink' : 'text-navy-100'}`}>{user.name}</div>
          {light && user.role && <div className="text-[11px] text-ink-4">{user.role}</div>}
        </div>
        <span
          aria-hidden
          className="flex size-6 items-center justify-center rounded-full bg-navy-500 text-[10px] font-semibold text-white"
        >
          {user.initials}
        </span>
      </div>
    </header>
  )
}
