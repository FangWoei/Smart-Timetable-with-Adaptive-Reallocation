import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar.jsx'

const USER = { name: 'Siti Yasmin', initials: 'SY', role: 'Receptionist' }

export default function AppShell() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const isGroupView = pathname.startsWith('/group-view')

  return (
    <div className="flex h-full flex-col bg-canvas">
      <TopBar
        variant={isHome ? 'home' : 'workspace'}
        user={USER}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  )
}
