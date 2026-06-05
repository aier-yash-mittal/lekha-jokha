import { type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { HomeIcon, GroupIcon, UserIcon } from './icons'

const tabs = [
  { to: '/', label: 'Home', Icon: HomeIcon, exact: true },
  { to: '/groups', label: 'Groups', Icon: GroupIcon },
  { to: '/account', label: 'Account', Icon: UserIcon }
]

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  // Hide bottom nav on deep pages (group detail / add expense) for a focused view.
  const hideNav = /^\/(groups\/[^/]+|expense)/.test(pathname)

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-[#f4f6f8]">
      <main className={`flex-1 ${hideNav ? '' : 'pb-24'}`}>{children}</main>
      {!hideNav && (
        <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-gray-100 bg-white/95 backdrop-blur">
          <div className="grid grid-cols-3">
            {tabs.map(({ to, label, Icon, exact }) => (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition ${
                    isActive ? 'text-brand-500' : 'text-gray-400'
                  }`
                }
              >
                <Icon width={24} height={24} />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
