import { useEffect, useState } from 'react'
import { apiAdminUsers, apiAdminPatchUser, apiAdminDeleteUser } from '../lib/api'
import './AdminUserManagement.css'

interface AdminUserManagementProps {
  onLogout: () => void
  onNavigate: (page: string) => void
  onSwitchToUser: () => void
}

interface User {
  id: string
  name: string
  email: string
  phone: string
  status: 'Eligible' | 'Not Eligible'
  stage: 'Under Review' | 'Submitted'
  avatar: string
  scholarship: boolean
  role?: string
  raw?: any
}

function AdminUserManagement({ onLogout, onNavigate, onSwitchToUser }: AdminUserManagementProps) {
  const [activeMenu, setActiveMenu] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res: any = await apiAdminUsers()
        const rows = res?.users || res?.data?.users || []
        const mapped = (rows || []).map((u: any) => {
          const name = u.full_name || u.name || u.email || 'Unknown'
          const avatar = name.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0,2)
          const eligibility_rating = u.eligibility_rating ?? u.eligibility_rating
          const status = (eligibility_rating !== undefined && eligibility_rating !== null) ? (Number(eligibility_rating) >= 1 ? 'Eligible' : 'Not Eligible') : 'Not Eligible'
          const stage = (u.metadata && (u.metadata.stage || u.metadata?.status)) || (u.onboarding_state && u.onboarding_state.step ? 'Submitted' : 'Under Review')
          const scholarship = !!u.rental_scholarship || !!u.scholarship || false
          return {
            // Prefer the Supabase auth `user_id` (auth.users.id) for actions
            // such as fetching cases and admin operations. Fall back to
            // profile row `id` when `user_id` is absent.
            id: String(u.user_id || u.id || Math.random()),
            name,
            email: u.email || '',
            phone: u.phone || '',
            status: status as 'Eligible' | 'Not Eligible',
            stage: stage as 'Under Review' | 'Submitted',
            avatar,
            scholarship,
              role: u.role || u.roles || null,
            raw: u
          } as User
        })
        if (mounted) setUsers(mapped)
      } catch (err) {
        console.warn('Failed to load users', err)
        if (mounted) setError('Failed to load users')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  function openUserCases(user: User) {
    // Navigate to user cases page using URL params
    window.location.href = `/admin/user/${user.id}/cases`
  }

  async function removeUser(user: User, e?: React.MouseEvent) {
    e?.stopPropagation()
    if (!confirm('Delete this user? This cannot be undone.')) return
    try {
      await apiAdminDeleteUser(String(user.id))
      setUsers((prev) => prev.filter(u => u.id !== user.id))
    } catch (err) {
      console.error('Delete failed', err)
      setError('Failed to delete user')
    }
  }

  async function promote(user: User, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      await apiAdminPatchUser(String(user.id), { role: 'admin' })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'admin' } : u))
    } catch (err) {
      console.error('Promote failed', err)
      setError('Failed to promote user')
    }
  }

  async function demote(user: User, e?: React.MouseEvent) {
    e?.stopPropagation()
    try {
      await apiAdminPatchUser(String(user.id), { role: 'user' })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'user' } : u))
    } catch (err) {
      console.error('Demote failed', err)
      setError('Failed to demote user')
    }
  }


  return (
    <div className="admin-user-mgmt">
      

      <div >
        <aside className="admin-sidebar">
          <div
            className={`admin-sidebar-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-dashboard')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Dashboard</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'users' ? 'active' : ''}`}
            onClick={() => setActiveMenu('users')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Users</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'cases' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-cases')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <span>Cases</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveMenu('calendar')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Calendar</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'mailbox' ? 'active' : ''}`}
            onClick={() => setActiveMenu('mailbox')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>MailBox</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'setting' ? 'active' : ''}`}
            onClick={() => setActiveMenu('setting')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="admin-um-main">
          

          <div className="admin-um-header">
            <h1>Users Management</h1>
          </div>

          <div className="admin-um-users-section">
            <div className="admin-um-users-header">
              <h3>All Users</h3>
              <button className="admin-um-dropdown-btn">
                <span>▼</span>
              </button>
            </div>

            <div className="admin-um-users-table">
              <div className="admin-um-table-header">
                <div className="admin-um-col-name">Name</div>
                <div className="admin-um-col-email">Email</div>
                <div className="admin-um-col-phone">Phone Number</div>
                <div className="admin-um-col-status">
                  Status
                  <button className="admin-um-sort-btn">▼</button>
                </div>
                <div className="admin-um-col-actions">Actions</div>
              </div>

              <div className="admin-um-rows">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="admin-um-table-row">
                      <div className="admin-um-col-name"><div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" /></div>
                      <div className="admin-um-col-email"><div className="h-4 bg-gray-200 rounded w-36 animate-pulse" /></div>
                      <div className="admin-um-col-phone"><div className="h-4 bg-gray-200 rounded w-28 animate-pulse" /></div>
                      <div className="admin-um-col-status"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse" /></div>
                      <div className="admin-um-col-actions"><div className="h-6 bg-gray-200 rounded w-32 animate-pulse" /></div>
                    </div>
                  ))
                ) : (
                  users.map((user) => (
                    <div key={user.id} className="admin-um-table-row" onClick={() => openUserCases(user)}>
                      <div className="admin-um-col-name">
                        <div className="admin-um-user-avatar">{user.avatar}</div>
                        <span>{user.name}</span>
                      </div>
                      <div className="admin-um-col-email">{user.email}</div>
                      <div className="admin-um-col-phone">{user.phone}</div>
                      <div className="admin-um-col-status">
                        <span className={`admin-um-status-badge ${user.status === 'Eligible' ? 'eligible' : 'not-eligible'}`}>
                          {user.status === 'Eligible' ? '✓' : '○'} {user.status}
                        </span>
                      </div>
                      <div className="admin-um-col-actions">
                        <div className="admin-um-actions">
                          <button onClick={(e) => { e.stopPropagation(); ((user as any).role === 'admin') ? demote(user, e) : promote(user, e) }}>
                            {((user as any).role === 'admin') ? 'Demote' : 'Promote'}
                          </button>
                          <button onClick={(e) => removeUser(user, e)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {(!loading && users.length === 0) && (
                  <div className="p-6 text-gray-600">No users found.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

    </div>
  )
}

export default AdminUserManagement
