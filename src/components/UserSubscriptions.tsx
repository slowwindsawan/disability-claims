import { useState } from 'react'
import './UserSubscriptions.css'

interface UsersSubscriptionsProps {
  onLogout: () => void
  onNavigate: (page: string) => void
}

interface User {
  id: number
  name: string
  email: string
  subscriptionStatus: 'Active' | 'Expired' | 'Cancelled' | 'Trial'
  plan: string
  startDate: string
  endDate: string
  avatar: string
}

interface SubscriptionHistory {
  date: string
  action: string
  plan: string
  amount: string
}

function UsersSubscriptions({ onLogout, onNavigate }: UsersSubscriptionsProps) {
  const [activeMenu, setActiveMenu] = useState('subscriptions')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const itemsPerPage = 10

  const allUsers: User[] = Array.from({ length: 47 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    subscriptionStatus: ['Active', 'Expired', 'Cancelled', 'Trial'][Math.floor(Math.random() * 4)] as any,
    plan: ['Premium', 'Basic', 'Pro', 'Enterprise'][Math.floor(Math.random() * 4)],
    startDate: `Jan ${Math.floor(Math.random() * 28) + 1}, 2024`,
    endDate: `Dec ${Math.floor(Math.random() * 28) + 1}, 2024`,
    avatar: `U${i + 1}`
  }))

  const subscriptionHistory: SubscriptionHistory[] = [
    { date: 'Jan 15, 2024', action: 'Subscription Started', plan: 'Premium', amount: '$29.99' },
    { date: 'Feb 15, 2024', action: 'Payment Successful', plan: 'Premium', amount: '$29.99' },
    { date: 'Mar 15, 2024', action: 'Payment Successful', plan: 'Premium', amount: '$29.99' },
    { date: 'Apr 15, 2024', action: 'Upgraded Plan', plan: 'Pro', amount: '$49.99' },
    { date: 'May 15, 2024', action: 'Payment Successful', plan: 'Pro', amount: '$49.99' }
  ]

  const filteredUsers = allUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'active'
      case 'Expired': return 'expired'
      case 'Cancelled': return 'cancelled'
      case 'Trial': return 'trial'
      default: return ''
    }
  }

  return (
    <div className="users-subscriptions-page">
      

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
            onClick={() => onNavigate('admin-users')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Users Management</span>
          </div>
          <div
            className={`admin-sidebar-item ${activeMenu === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveMenu('subscriptions')}
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
            onClick={() => onNavigate('admin-settings')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="users-subscriptions-main">
          <div className="users-subscriptions-header">
            <h1>Users & Subscriptions</h1>
            <div className="users-subscriptions-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
          </div>

          <div className="users-subscriptions-stats">
            <div className="subscription-stat-card">
              <h3>Total Users</h3>
              <p className="stat-value">{allUsers.length}</p>
            </div>
            <div className="subscription-stat-card">
              <h3>Active Subscriptions</h3>
              <p className="stat-value">{allUsers.filter(u => u.subscriptionStatus === 'Active').length}</p>
            </div>
            <div className="subscription-stat-card">
              <h3>Expired</h3>
              <p className="stat-value">{allUsers.filter(u => u.subscriptionStatus === 'Expired').length}</p>
            </div>
            <div className="subscription-stat-card">
              <h3>Trial Users</h3>
              <p className="stat-value">{allUsers.filter(u => u.subscriptionStatus === 'Trial').length}</p>
            </div>
          </div>

          <div className="users-subscriptions-table-container">
            <table className="users-subscriptions-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-cell">
                        <div className="user-avatar">{user.avatar}</div>
                        <span>{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td><span className="plan-badge">{user.plan}</span></td>
                    <td>
                      <span className={`status-badge ${getStatusColor(user.subscriptionStatus)}`}>
                        {user.subscriptionStatus}
                      </span>
                    </td>
                    <td>{user.startDate}</td>
                    <td>{user.endDate}</td>
                    <td>
                      <button
                        className="view-history-btn"
                        onClick={() => setSelectedUser(user)}
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </main>
      </div>

      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subscription History - {selectedUser.name}</h2>
              <button className="modal-close" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="history-list">
                {subscriptionHistory.map((item, idx) => (
                  <div key={idx} className="history-item">
                    <div className="history-date">{item.date}</div>
                    <div className="history-details">
                      <h4>{item.action}</h4>
                      <p>Plan: {item.plan} - {item.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersSubscriptions
