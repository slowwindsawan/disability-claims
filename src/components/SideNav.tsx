import { NavLink, useLocation } from 'react-router-dom'
import './SideNav.css'
import { Crown, Diamond, Settings } from 'lucide-react'

type SideNavProps = {
  onLogout: () => void
  isAdminView?: boolean
  onSwitchToAdmin?: () => void
  onSwitchToUser?: () => void
}

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconPayments() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m6-12h-6m6 6h-6M18 6l-3 3m0 6l3 3M6 18l3-3m0-6L6 6" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  )
}

function IconCase() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="7" width="18" height="13" rx="2" ry="2" />
      <path d="M16 3H8v4h8V3z" />
    </svg>
  )
}

function IconPrompts() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M7 8h10M7 12h6" />
    </svg>
  )
}

export default function SideNav({ onLogout, isAdminView = false, onSwitchToAdmin, onSwitchToUser }: SideNavProps) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `sidenav-link flex items-center gap-3 px-3 py-2 rounded-lg transition-transform duration-150 hover:bg-indigo-200 duration-200 ${
      isActive
        ? 'bg-indigo-200 shadow-xl ml-1 border-2 border-gray-200' // active-nav handled in SideNav.css (and Tailwind classes if available)
        : 'hover:bg-gray-50'
    }`

  const location = useLocation()

  return (
    <aside className="global-sidenav" style={{boxShadow:"none !important", background:"transparent !important", borderRight:"none !important"}}>
      <div className="sidenav-brand">ADHDEAL</div>
      <nav className="sidenav-links">
        {!isAdminView ? (
          <>
            <NavLink to="/dashboard" className={linkClass}>
              <IconDashboard />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/mycase"
              className={({ isActive }) =>
                linkClass({ isActive: location.pathname.startsWith('/mycase') || location.pathname.startsWith('/user') })
              }
            >
              <IconCase />
              <span>My Cases</span>
            </NavLink>

            <NavLink to="/appointment" className={linkClass}>
              <IconCalendar />
              <span>Appointment</span>
            </NavLink>

            <NavLink to="/payments" className={linkClass}>
              <IconPayments />
              <span>Payments</span>
            </NavLink>

            <NavLink to="/notifications" className={linkClass}>
              <IconBell />
              <span>Notifications</span>
            </NavLink>

            <NavLink to="/mailbox" className={linkClass}>
              <IconMail />
              <span>Mailbox</span>
            </NavLink>

            <NavLink to="/settings" className={linkClass}>
              <Settings />
              <span>Settings</span>
            </NavLink>

            {/* Subscriptions and Manage Subadmins are admin-only; hidden for regular users */}

            <div className="sidenav-divider" />
          </>
        ) : (
          <>
            <NavLink to="/admin/dashboard" className={linkClass}>
              <IconDashboard />
              <span>Admin Dashboard</span>
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                // Keep Users highlighted for both /admin/users and /admin/user/:id/* routes
                linkClass({ isActive: location.pathname.startsWith('/admin/users') || location.pathname.startsWith('/admin/user') })
              }
            >
              <IconUsers />
              <span>Users</span>
            </NavLink>
            <NavLink
              to="/admin/cases"
              className={({ isActive }) =>
                linkClass({
                  isActive:
                    location.pathname.startsWith('/admin/cases') ||
                    (location.pathname.startsWith('/admin/user') && location.pathname.includes('/case'))
                })
              }
            >
              <IconCase />
              <span>Cases</span>
            </NavLink>
            <NavLink to="/admin/calendar" className={linkClass}>
              <IconCalendar />
              <span>Calendar</span>
            </NavLink>
            <NavLink to="/admin/settings" className={linkClass}>
              <IconSettings />
              <span>Admin Settings</span>
            </NavLink>
            <NavLink
              to="/admin/prompts"
              className={({ isActive }) =>
                // Highlight for /admin/prompts and potential nested routes
                linkClass({ isActive: location.pathname.startsWith('/admin/prompts') })
              }
            >
              <IconPrompts />
              <span>AI Prompts</span>
            </NavLink>
            <NavLink to="/admin/manage-subadmins" className={linkClass}>
              <IconUsers />
              <span>Manage Subadmins</span>
            </NavLink>
            <NavLink to="/admin/user-subscriptions" className={linkClass}>
              <Crown />
              <span>Subscriptions</span>
            </NavLink>

            <div className="sidenav-divider" />
          </>
        )}
      </nav>
      <div className="sidenav-footer">
        <button className="sidenav-logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  )
}
