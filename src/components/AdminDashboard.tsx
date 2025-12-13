import { useEffect, useState } from 'react'
import { apiAdminStats } from '../lib/api'
import './AdminDashboard.css'
import { useNotificationStore } from '../stores/notificationStore'
import Skeleton, { SkeletonCard } from './Skeleton'
import Notifications from './Notifications'

interface AdminDashboardProps {
  onLogout: () => void
  onNavigate: (page: string) => void
  onSwitchToUser: () => void
}

interface User {
  id: number
  name: string
  email: string
  phone: string
  status: 'Eligible' | 'Not Eligible'
  stage: 'Under Review' | 'Submitted'
  avatar: string
  scholarship: boolean
}

function AdminDashboard({ onLogout, onNavigate, onSwitchToUser }: AdminDashboardProps) {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [statusFilter, setStatusFilter] = useState('Eligible')
  const [stageFilter, setStageFilter] = useState('Submitted')
  const [activeUsersView, setActiveUsersView] = useState('Monthly')
  const [loadingStats, setLoadingStats] = useState(false)
  const [stats, setStats] = useState<any | null>(null)
  const [recentUsers, setRecentUsers] = useState<any[]>([])
  const [recentCases, setRecentCases] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false)
  const { notifications, loading: loadingNotifications, fetchNotifications, unreadCount } = useNotificationStore()
  const [showNotifModal, setShowNotifModal] = useState(false)

  useEffect(() => {
    let mounted = true
    async function loadStats() {
      setLoadingStats(true)
      try {
        const res: any = await apiAdminStats()
        if (!mounted) return
        const s = res?.stats || res?.data?.stats || null
        setStats(s)
        setRecentUsers(s?.recent_users || [])
        setRecentCases(s?.recent_cases || [])
      } catch (err) {
        console.warn('Failed to load admin stats', err)
        setStats(null)
        setRecentUsers([])
        setRecentCases([])
      } finally {
        if (mounted) setLoadingStats(false)
      }
    }
    loadStats()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    // Fetch notifications for admin view
    async function loadNotifications() {
      try {
        await fetchNotifications({ limit: 50 })
      } catch (e) {
        console.warn('Failed to fetch notifications', e)
      }
    }
    if (mounted) loadNotifications()
    return () => { mounted = false }
  }, [fetchNotifications])

  // Load regular users (exclude admins) via dedicated endpoint
  useEffect(() => {
    let mounted = true
    async function loadUsers() {
      setLoadingUsers(true)
      try {
        const res: any = await (await import('../lib/api')).apiAdminUsers()
        if (!mounted) return
        const usersList = res?.users || res?.data?.users || []
        setRecentUsers(usersList)
      } catch (err) {
        console.warn('Failed to load admin users', err)
      }
      finally {
        if (mounted) setLoadingUsers(false)
      }
    }
    loadUsers()
    return () => { mounted = false }
  }, [])

  const users: User[] = recentUsers && recentUsers.length > 0 ? recentUsers.map((u: any) => {
    const name = u.full_name || u.name || u.email || 'Unknown'
    const avatar = name.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0,2)
    const eligibility_rating = u.eligibility_rating ?? u.eligibility_rating
    const status = (eligibility_rating !== undefined && eligibility_rating !== null) ? (Number(eligibility_rating) >= 1 ? 'Eligible' : 'Not Eligible') : 'Not Eligible'
    const stage = (u.metadata && u.metadata.stage) || (u.onboarding_state && u.onboarding_state.step ? 'Submitted' : 'Under Review')
    const scholarship = !!u.rental_scholarship || !!u.scholarship || false
    return {
      id: u.id || u.user_id || Math.random(),
      name,
      email: u.email || '',
      phone: u.phone || '',
      status: status as 'Eligible' | 'Not Eligible',
      stage: stage as 'Under Review' | 'Submitted',
      avatar,
      scholarship
    }
  }) : []

  // notifications come from the global notification store (fetched on mount)

  const activeUsersData = [
    { month: 'Jan', value: 45 },
    { month: 'Feb', value: 65 },
    { month: 'Mar', value: 85 },
    { month: 'Apr', value: 120 },
    { month: 'May', value: 180 },
    { month: 'Jun', value: 90 },
    { month: 'Jul', value: 65 },
    { month: 'Aug', value: 75 },
    { month: 'Sept', value: 90 },
    { month: 'Oct', value: 95 },
    { month: 'Nov', value: 85 },
    { month: 'Dec', value: 95 }
  ]

  const growthTrendData = [
    { month: 'JAN', value: 1000 },
    { month: 'FEB', value: 2100 },
    { month: 'MAR', value: 2800 },
    { month: 'APR', value: 3400 },
    { month: 'MAY', value: 4200 },
    { month: 'JUN', value: 4800 }
  ]

  return (
    <div className="admin-dashboard">

      <div >
        <aside className="admin-sidebar">
          <div
            className={`admin-sidebar-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Dashboard</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'users' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-users')}
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
            className={`admin-sidebar-item ${activeMenu === 'subscriptions' ? 'active' : ''}`}
            onClick={() => onNavigate('users-subscriptions')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            <span>Users & Subscriptions</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'subadmins' ? 'active' : ''}`}
            onClick={() => onNavigate('manage-subadmins')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            <span>Manage Subadmins</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'calendar' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-calendar')}
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
            onClick={() => onNavigate('mailbox')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>MailBox</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'setting' ? 'active' : ''}`}
            onClick={() => onNavigate('admin-settings')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="admin-main">
          

          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <h4>Total Users</h4>
              <div className="admin-stat-value">
                {loadingStats ? <Skeleton style={{ width: 120, height: 28 }} /> : (stats?.total_users ?? '—')}
              </div>
            </div>
            <div className="admin-stat-card">
              <h4>Users by Status</h4>
              <select className="admin-stat-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>Eligible</option>
                <option>Not Eligible</option>
              </select>
              <div className="admin-stat-value">{loadingStats ? <Skeleton style={{ width: 120, height: 28 }} /> : (stats ? (stats.total_users ?? '—') : '—')}</div>
            </div>
            <div className="admin-stat-card">
              <h4>Users by Stage</h4>
              <select className="admin-stat-select" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option>Submitted</option>
                <option>Under Review</option>
              </select>
              <div className="admin-stat-value">{loadingStats ? <Skeleton style={{ width: 120, height: 28 }} /> : (stats ? (stats.total_cases_sampled ?? '—') : '—')}</div>
            </div>
            <div className="admin-stat-card">
              <h4>Pending Admin Action</h4>
              <div className="admin-stat-value">{loadingStats ? <Skeleton style={{ width: 120, height: 28 }} /> : (stats ? (stats.total_cases_sampled ?? '—') : '—')}</div>
            </div>
          </div>

          <div className="admin-charts-row">
            <div className="admin-chart-card admin-active-users">
              <div className="admin-chart-header">
                <h3>Active Users</h3>
                <select className="admin-chart-select" value={activeUsersView} onChange={(e) => setActiveUsersView(e.target.value)}>
                  <option>Monthly</option>
                  <option>Weekly</option>
                  <option>Daily</option>
                </select>
              </div>
              <div className="admin-chart-content">
                {loadingStats ? (
                  <Skeleton style={{ height: 180, width: '100%' }} />
                ) : (
                  <svg width="100%" height="180" viewBox="0 0 600 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="activeUsersGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                      <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                    </linearGradient>
                  </defs>

                  <path
                    d={
                      'M 0,' + (160 - (activeUsersData[0].value * 0.8)) + ' ' +
                      activeUsersData.map((d, i) => 'L ' + ((i * 600) / (activeUsersData.length - 1)) + ',' + (160 - (d.value * 0.8))).join(' ') +
                      ' L 600,160 L 0,160 Z'
                    }
                    fill="url(#activeUsersGradient)"
                  />

                  <path
                    d={activeUsersData.map((d, i) => (i === 0 ? 'M' : 'L') + ' ' + ((i * 600) / (activeUsersData.length - 1)) + ',' + (160 - (d.value * 0.8))).join(' ')}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                  />

                  {activeUsersData.map((d, i) => (
                    <g key={i}>
                      <circle
                        cx={(i * 600) / (activeUsersData.length - 1)}
                        cy={160 - (d.value * 0.8)}
                        r="4"
                        fill="#3b82f6"
                      />
                      <text
                        x={(i * 600) / (activeUsersData.length - 1)}
                        y="175"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#9ca3af"
                      >
                        {d.month}
                      </text>
                    </g>
                  ))}

                  <line x1="250" y1="10" x2="250" y2="160" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
                  <text x="250" y="20" textAnchor="middle" fontSize="11" fill="#3b82f6" fontWeight="600">36 ONLINE</text>
                  </svg>
                )}
              </div>
            </div>

            <div className="admin-notifications-card">
              <div className="admin-notifications-header">
                <h3>Notifications</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {unreadCount > 0 && <div style={{ fontSize: 12, color: '#ef4444' }}>{unreadCount} unread</div>}
                  <button className="admin-expand-btn" onClick={() => setShowNotifModal(true)}>See more</button>
                </div>
              </div>
              <div className="admin-notifications-list">
                {loadingNotifications ? (
                  // compact skeletons while notifications load
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} style={{ marginBottom: 6 }}>
                      <Skeleton style={{ height: 12, width: '80%' }} />
                    </div>
                  ))
                ) : notifications && notifications.length === 0 ? (
                  <div className="admin-notif-content">No notifications</div>
                ) : (
                  // show only first 4 inline to preserve card size
                  (notifications || []).slice(0, 4).map((n: any, idx: number) => (
                    <div key={n.id || idx} className="admin-notification-item">
                      <span className={`admin-notif-dot ${n.type === 'case_submitted' ? 'red' : (n.type === 'message' ? 'blue' : 'orange')}`}></span>
                      <div className="admin-notif-content">
                        <p>{n.title || n.message || 'Notification'}</p>
                        <span className="admin-notif-time">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {(notifications || []).length > 4 && (
                <div style={{ marginTop: 8, textAlign: 'right' }}>
                  <button className="admin-expand-btn" onClick={() => setShowNotifModal(true)} style={{ fontSize: 12 }}>See all</button>
                </div>
              )}
            </div>
          </div>

          <div className="admin-charts-row">
            <div className="admin-chart-card admin-acquisition">
              <div className="admin-chart-header">
                <h3>User Acquisition Source</h3>
                <div className="admin-chart-filters">
                  <select className="admin-chart-select">
                    <option>Metric</option>
                  </select>
                  <select className="admin-chart-select">
                    <option>Today</option>
                    <option>This Week</option>
                    <option>This Month</option>
                  </select>
                </div>
              </div>
              <div className="admin-chart-content admin-donut-chart">
                {loadingStats ? (
                  <Skeleton style={{ height: 180, width: '100%' }} />
                ) : (
                  <svg width="180" height="180" viewBox="0 0 180 180">
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#86efac" strokeWidth="28" strokeDasharray="110 330" transform="rotate(-90 90 90)" />
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#fbbf24" strokeWidth="28" strokeDasharray="88 352" strokeDashoffset="-110" transform="rotate(-90 90 90)" />
                  <circle cx="90" cy="90" r="70" fill="none" stroke="#fb923c" strokeWidth="28" strokeDasharray="132 308" strokeDashoffset="-198" transform="rotate(-90 90 90)" />
                  <text x="90" y="85" textAnchor="middle" fontSize="13" fill="#9ca3af" fontWeight="500">Acquisition</text>
                  <text x="90" y="100" textAnchor="middle" fontSize="13" fill="#9ca3af" fontWeight="500">Source</text>
                  </svg>
                )}
                <div className="admin-donut-legend">
                  <div className="admin-legend-item">
                    <span className="admin-legend-dot" style={{ background: '#86efac' }}></span>
                    <span>Bookmark 40%</span>
                  </div>
                  <div className="admin-legend-item">
                    <span className="admin-legend-dot" style={{ background: '#fbbf24' }}></span>
                    <span>Direct link 20%</span>
                  </div>
                  <div className="admin-legend-item">
                    <span className="admin-legend-dot" style={{ background: '#fb923c' }}></span>
                    <span>Referrals 30%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-chart-card admin-growth-trend">
              <div className="admin-chart-header">
                <h3>User Growth Trend</h3>
                <select className="admin-chart-select">
                  <option>Year</option>
                  <option>Month</option>
                </select>
              </div>
              <div className="admin-chart-content">
                {loadingStats ? (
                  <Skeleton style={{ height: 180, width: '100%' }} />
                ) : (
                  <svg width="100%" height="180" viewBox="0 0 400 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="growthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="rgba(239, 68, 68, 0.2)" />
                      <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
                    </linearGradient>
                  </defs>

                  <path
                    d={`M 0,${160 - (growthTrendData[0].value / 40)} ${growthTrendData.map((d, i) =>
                      `L ${(i * 400) / (growthTrendData.length - 1)},${160 - (d.value / 40)}`
                    ).join(' ')} L 400,160 L 0,160 Z`}
                    fill="url(#growthGradient)"
                  />

                  <path
                    d={growthTrendData.map((d, i) => (i === 0 ? 'M' : 'L') + ' ' + ((i * 400) / (growthTrendData.length - 1)) + ',' + (160 - (d.value / 40))).join(' ')}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2.5"
                  />

                  {growthTrendData.map((d, i) => (
                    <g key={i}>
                      <circle
                        cx={(i * 400) / (growthTrendData.length - 1)}
                        cy={160 - (d.value / 40)}
                        r="5"
                        fill="#ef4444"
                      />
                      <text
                        x={(i * 400) / (growthTrendData.length - 1)}
                        y="175"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#9ca3af"
                      >
                        {d.month}
                      </text>
                    </g>
                  ))}

                  {[1, 2, 3, 4, 5].map((i) => (
                    <line key={i} x1="0" y1={i * 32} x2="400" y2={i * 32} stroke="#f3f4f6" strokeWidth="1" />
                  ))}

                  <text x="0" y="10" fontSize="10" fill="#9ca3af">5000</text>
                  <text x="0" y="42" fontSize="10" fill="#9ca3af">4000</text>
                  <text x="0" y="74" fontSize="10" fill="#9ca3af">3000</text>
                  <text x="0" y="106" fontSize="10" fill="#9ca3af">2000</text>
                  <text x="0" y="138" fontSize="10" fill="#9ca3af">1000</text>
                  <text x="0" y="170" fontSize="10" fill="#9ca3af">0</text>
                  </svg>
                )}
              </div>
            </div>
          </div>

          <div className="admin-funnel-section">
            <div className="admin-funnel-header">
              <h3>Conversion Funnel</h3>
              <h3>Users</h3>
            </div>
            <div className="admin-funnel-chart">
                {loadingStats ? (
                  // show skeleton bars while stats load
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ height: 60 }}><Skeleton style={{ height: 60, width: '100%' }} /></div>
                    <div style={{ height: 60 }}><Skeleton style={{ height: 60, width: '90%' }} /></div>
                    <div style={{ height: 60 }}><Skeleton style={{ height: 60, width: '60%' }} /></div>
                    <div style={{ height: 60 }}><Skeleton style={{ height: 60, width: '40%' }} /></div>
                  </div>
                ) : (
                  <>
                    <div className="admin-funnel-bar" style={{ width: '100%', background: '#3b82f6' }}>
                      <span className="admin-funnel-label">
                        <span className="admin-funnel-dot" style={{ background: '#3b82f6' }}></span>
                        Registered
                      </span>
                      <span className="admin-funnel-value">5000</span>
                    </div>
                    <div className="admin-funnel-bar" style={{ width: '90%', background: '#3b82f6' }}>
                      <span className="admin-funnel-label">
                        <span className="admin-funnel-dot" style={{ background: '#3b82f6' }}></span>
                        Eligible
                      </span>
                      <span className="admin-funnel-value">4000</span>
                    </div>
                    <div className="admin-funnel-bar" style={{ width: '60%', background: '#16a34a' }}>
                      <span className="admin-funnel-label">
                        <span className="admin-funnel-dot" style={{ background: '#16a34a' }}></span>
                        Submitted
                      </span>
                      <span className="admin-funnel-value">3000</span>
                    </div>
                    <div className="admin-funnel-bar" style={{ width: '40%', background: '#9333ea' }}>
                      <span className="admin-funnel-label">
                        <span className="admin-funnel-dot" style={{ background: '#9333ea' }}></span>
                        Approved
                      </span>
                      <span className="admin-funnel-value">2000</span>
                    </div>
                  </>
                )}
            </div>
          </div>

          <div className="admin-users-section">
            <div className="admin-users-header">
              <h3>All Users</h3>
              <button className="admin-dropdown-btn">▼</button>
            </div>

            <div className="admin-users-table">
              <div className="admin-table-header">
                <div className="admin-col-name">Name</div>
                <div className="admin-col-email">Email</div>
                <div className="admin-col-phone">Phone Number</div>
                <div className="admin-col-status">
                  Status
                  <button className="admin-sort-btn">▼</button>
                </div>
              </div>
              {loadingUsers ? (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="admin-table-row">
                      <div className="admin-col-name">
                        <div className="admin-user-avatar" style={{ background: '#f3f4f6' }}></div>
                        <Skeleton style={{ width: 140, height: 14 }} />
                      </div>
                      <div className="admin-col-email"><Skeleton style={{ width: 200, height: 12 }} /></div>
                      <div className="admin-col-phone"><Skeleton style={{ width: 160, height: 12 }} /></div>
                      <div className="admin-col-status"><Skeleton style={{ width: 100, height: 20 }} /></div>
                    </div>
                  ))}
                </>
              ) : (
                <>
                  {users.map((user) => (
                    <div key={user.id} className="admin-table-row">
                      <div className="admin-col-name">
                        <div className="admin-user-avatar">{user.avatar}</div>
                        <span>{user.name}</span>
                      </div>
                      <div className="admin-col-email">{user.email}</div>
                      <div className="admin-col-phone">{user.phone}</div>
                      <div className="admin-col-status">
                        <span className={`admin-status-badge ${user.status === 'Eligible' ? 'eligible' : 'not-eligible'}`}>
                          {user.status === 'Eligible' ? '✓' : '○'} {user.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          {showNotifModal && (
            <div className="admin-notif-modal-overlay" onClick={() => setShowNotifModal(false)}>
              <div className="admin-notif-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Notifications</h3>
                  <button className="admin-expand-btn" onClick={() => setShowNotifModal(false)}>✕</button>
                </div>
                <div style={{ maxHeight: '90vh', overflow: 'auto' }}>
                  <Notifications onNavigate={(p) => { onNavigate(p); setShowNotifModal(false); }} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
