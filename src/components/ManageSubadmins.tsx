import { useEffect, useState } from 'react'
import { apiListSubadmins, apiCreateSubadmin, apiPatchSubadmin, apiDeleteSubadmin } from '../lib/api'
import './ManageSubadmins.css'

interface ManageSubadminsProps {
  onLogout: () => void
  onNavigate: (page: string) => void
}

interface Admin {
  id: number
  name: string
  email: string
  role: 'Admin' | 'Member'
  status: 'Active' | 'Inactive'
  joinedDate: string
  avatar: string
}

function ManageSubadmins({ onLogout, onNavigate }: ManageSubadminsProps) {
  const [activeMenu, setActiveMenu] = useState('subadmins')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', phone: '', password: '' })
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email) {
      setError('Please fill in name and email')
      return
    }
    setError(null)
    try {
      setLoading(true)
      const payload: any = { email: newAdmin.email, name: newAdmin.name }
      if (newAdmin.phone) payload.phone = newAdmin.phone
      if (newAdmin.password) payload.password = newAdmin.password
      const res: any = await apiCreateSubadmin(payload)
      const created = res?.subadmin || res?.data?.subadmin || res
      // Map to Admin shape
      const profile = Array.isArray(created) ? created[0] : (created || {})
      const name = profile.full_name || profile.name || profile.email || newAdmin.name
      const avatar = name.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0,2)
      const adminObj: Admin = {
        id: profile.user_id || profile.id || Math.random(),
        name,
        email: profile.email || newAdmin.email,
        role: (profile.role || 'subadmin') === 'subadmin' ? 'Admin' : 'Member',
        status: profile.verified ? 'Active' : 'Inactive',
        joinedDate: profile.created_at ? new Date(profile.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        avatar
      }
      setAdmins([adminObj, ...admins])
      setNewAdmin({ name: '', email: '', phone: '', password: '' })
      setShowAddModal(false)
    } catch (err: any) {
      console.error('create subadmin failed', err)
      setError(err?.body?.detail || err?.message || 'Failed to create subadmin')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveAdmin = async (id: number) => {
    const ok = confirm('Are you sure you want to remove this subadmin? This will delete the auth user.')
    if (!ok) return
    try {
      setLoading(true)
      // ids may be user_id or profile id; prefer user_id if available on object
      const admin = admins.find(a => a.id === id)
      const userId = (admin as any)?.id
      await apiDeleteSubadmin(String(userId))
      setAdmins(admins.filter(admin => admin.id !== id))
    } catch (err) {
      console.error('delete subadmin failed', err)
      setError('Failed to delete subadmin')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRole = async (id: number) => {
    // Toggle between 'subadmin' and 'member'
    try {
      setLoading(true)
      const admin = admins.find(a => a.id === id)
      if (!admin) return
      const currentRole = admin.role === 'Admin' ? 'subadmin' : 'member'
      const newRole = currentRole === 'subadmin' ? 'member' : 'subadmin'
      await apiPatchSubadmin(String((admin as any).id), { role: newRole })
      setAdmins(admins.map(a => a.id === id ? { ...a, role: newRole === 'subadmin' ? 'Admin' : 'Member' } : a))
    } catch (err) {
      console.error('toggle role failed', err)
      setError('Failed to toggle role')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleStatus = async (id: number) => {
    try {
      setLoading(true)
      const admin = admins.find(a => a.id === id)
      if (!admin) return
      const newVerified = admin.status !== 'Active'
      await apiPatchSubadmin(String((admin as any).id), { verified: newVerified })
      setAdmins(admins.map(a => a.id === id ? { ...a, status: newVerified ? 'Active' : 'Inactive' } : a))
    } catch (err) {
      console.error('toggle status failed', err)
      setError('Failed to toggle status')
    } finally {
      setLoading(false)
    }
  }

  // load subadmins on mount
  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res: any = await apiListSubadmins()
        const rows = res?.subadmins || res?.data?.subadmins || res || []
        const mapped: Admin[] = (rows || []).map((p: any) => {
          const name = p.full_name || p.name || p.email || 'Unknown'
          const avatar = name.split(' ').map((s: string) => s[0]).join('').toUpperCase().slice(0,2)
          return {
            id: p.user_id || p.id || Math.random(),
            name,
            email: p.email || '',
            role: (p.role === 'subadmin') ? 'Admin' : (p.role === 'admin' ? 'Admin' : 'Member'),
            status: p.verified ? 'Active' : 'Inactive',
            joinedDate: p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
            avatar
          }
        })
        if (mounted) setAdmins(mapped)
      } catch (err) {
        console.warn('Failed to load subadmins', err)
        if (mounted) setError('Failed to load subadmins')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="manage-subadmins-page">
      

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
            onClick={() => setActiveMenu('subadmins')}
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

        <main className="manage-subadmins-main">
          <div className="manage-subadmins-header">
            <h1>Manage Subadmins</h1>
            <button className="add-admin-btn" onClick={() => setShowAddModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Admin
            </button>
          </div>

          <div className="subadmins-stats">
            <div className="subadmin-stat-card">
              <h3>Total Admins</h3>
              <p className="stat-value">{admins.filter(a => a.role === 'Admin').length}</p>
            </div>
            <div className="subadmin-stat-card">
              <h3>Total Members</h3>
              <p className="stat-value">{admins.filter(a => a.role === 'Member').length}</p>
            </div>
            <div className="subadmin-stat-card">
              <h3>Active</h3>
              <p className="stat-value">{admins.filter(a => a.status === 'Active').length}</p>
            </div>
            <div className="subadmin-stat-card">
              <h3>Inactive</h3>
              <p className="stat-value">{admins.filter(a => a.status === 'Inactive').length}</p>
            </div>
          </div>

          <div className="subadmins-grid">
            {admins.length === 0 && !loading && (
              <div className="empty-state">No subadmins found.</div>
            )}
            {admins.map((admin) => (
              <div key={String(admin.id)} className="subadmin-card">
                <div className="subadmin-card-header">
                  <div className="subadmin-avatar-large">{admin.avatar}</div>
                  <div className="subadmin-info">
                    <h3>{admin.name}</h3>
                    <p>{admin.email}</p>
                  </div>
                </div>
                <div className="subadmin-card-body">
                  <div className="subadmin-detail">
                    <span className="detail-label">Role:</span>
                    <span className={`role-badge ${admin.role.toLowerCase()}`}>
                      {admin.role}
                    </span>
                  </div>
                  <div className="subadmin-detail">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge-mini ${admin.status.toLowerCase()}`}>
                      {admin.status}
                    </span>
                  </div>
                  <div className="subadmin-detail">
                    <span className="detail-label">Joined:</span>
                    <span>{admin.joinedDate}</span>
                  </div>
                </div>
                <div className="subadmin-card-actions">
                  <button
                    className="action-btn toggle-role"
                    onClick={() => handleToggleRole(admin.id)}
                  >
                    Toggle Role
                  </button>
                  <button
                    className="action-btn toggle-status"
                    onClick={() => handleToggleStatus(admin.id)}
                  >
                    {admin.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="action-btn remove"
                    onClick={() => handleRemoveAdmin(admin.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Admin</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone (optional)</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={newAdmin.phone}
                  onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Password (optional)</label>
                <input
                  type="text"
                  placeholder="Temporary password (optional)"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
              </div>
              <div className="form-group">
                <div className="text-sm text-gray-600">New accounts are created as <strong>subadmin</strong> role by default. You may edit role after creation.</div>
              </div>
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button className="submit-btn" onClick={handleAddAdmin} disabled={loading}>
                  {loading ? 'Creating…' : 'Add Subadmin'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageSubadmins
