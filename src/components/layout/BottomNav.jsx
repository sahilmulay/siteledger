import { NavLink, useLocation } from 'react-router-dom'
import { FolderOpen, BarChart2, Settings, Home } from 'lucide-react'

const navItems = [
  { to: '/projects', icon: Home, label: 'Projects' },
  { to: '/reports', icon: BarChart2, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav() {
  const location = useLocation()
  // Hide on auth pages and share pages
  const hidden = ['/login', '/register', '/share'].some(p => location.pathname.startsWith(p))
  if (hidden) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-pb">
      <div className="max-w-lg mx-auto flex">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => [
              'flex-1 flex flex-col items-center justify-center py-2 px-1 min-h-[60px]',
              'transition-colors duration-150 select-none',
              isActive ? 'text-blue-700' : 'text-gray-400 hover:text-gray-600'
            ].join(' ')}
          >
            {({ isActive }) => (
              <>
                <div className={['p-1 rounded-xl transition-colors', isActive ? 'bg-blue-50' : ''].join(' ')}>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={['text-[11px] mt-0.5 font-medium', isActive ? 'text-blue-700' : 'text-gray-500'].join(' ')}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
