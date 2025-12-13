import { useEffect, useState, useRef } from 'react'
import { apiGetProfile, apiUpdateProfile, apiUploadProfilePhoto, apiChangePassword } from '../lib/api'
import './AdminSettings.css'
import Skeleton, { SkeletonCard } from './Skeleton'

interface AdminSettingsProps {
  onLogout: () => void
  onNavigate: (page: string) => void
  onSwitchToUser: () => void
}

function AdminSettings({ onLogout, onNavigate, onSwitchToUser }: AdminSettingsProps) {
  const [activeMenu, setActiveMenu] = useState('setting')
  const [activeTab, setActiveTab] = useState('profile')
  const [firstName, setFirstName] = useState('Kilian')
  const [lastName, setLastName] = useState('James')
  const [email, setEmail] = useState('killanjames@gmail.com')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoadingProfile(true)
      try {
        const res: any = await apiGetProfile()
        const user = res?.user || res?.data?.user || res?.user
        const profile = res?.profile || res?.data?.profile || res?.profile
        if (!mounted) return
        if (profile) {
          if (profile.photo_url) setPhotoPreview(profile.photo_url)
          const full = profile.full_name || profile.name || ''
          const parts = full.split(' ')
          setFirstName(parts.slice(0, -1).join(' ') || parts[0] || '')
          setLastName(parts.length > 1 ? parts[parts.length - 1] : '')
          setEmail(profile.email || user?.email || '')
        } else if (user) {
          setEmail(user.email || '')
        }
      } catch (err) {
        console.warn('Failed to load profile for admin settings', err)
      } finally {
        if (mounted) setLoadingProfile(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handlePhotoClick = () => {
    try {
      fileInputRef.current?.click()
    } catch (e) {}
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      // preview locally
      const url = URL.createObjectURL(f)
      setPhotoPreview(url)

      const fd = new FormData()
      fd.append('file', f, f.name)
      const res: any = await apiUploadProfilePhoto(fd)
      setMessage('Photo uploaded')
      // If server returned a profile with a reachable HTTP(S) photo_url, use it.
      if (res && (res.profile || res.data?.profile)) {
        const p = Array.isArray(res.profile) ? res.profile[0] : (res.profile || res.data?.profile)
        if (p && p.photo_url && typeof p.photo_url === 'string' && /^https?:/i.test(p.photo_url)) {
          setPhotoPreview(p.photo_url)
        }
      }
    } catch (err: any) {
      console.error('upload failed', err)
      setError(err?.body?.detail || err?.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-settings-page">

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
            onClick={() => setActiveMenu('setting')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="admin-set-main">
          

          <div className="admin-set-content">
            <div className="admin-set-profile-section">
              <div className="admin-set-avatar" onClick={handlePhotoClick} style={{ cursor: 'pointer' }}>
                {loadingProfile ? (
                  <Skeleton width={120} height={120} className="rounded-full" />
                ) : photoPreview ? (
                  <div style={{ width: 120, height: 120, borderRadius: 9999, overflow: 'hidden', backgroundColor: '#e5e7eb' }}>
                    <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div>
                    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Ccircle cx='60' cy='60' r='60' fill='%23e5e7eb'/%3E%3Cpath d='M60 65c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20zm0 5c13.3 0 40 6.7 40 20v10H20V90c0-13.3 26.7-20 40-20z' fill='%239ca3af'/%3E%3C/svg%3E" alt="Profile" />
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>

              <div className="admin-set-header">
                {loadingProfile ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Skeleton width={160} height={28} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Skeleton width={80} height={32} />
                      <Skeleton width={80} height={32} />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1>Settings</h1>
                    <div className="admin-set-actions">
                      <button className="admin-set-btn-cancel" onClick={() => { setMessage(null); setError(null); }}>Cancel</button>
                      <button className="admin-set-btn-save" onClick={async () => {
                        setLoading(true)
                        setMessage(null)
                        setError(null)
                        try {
                          if (activeTab === 'profile') {
                            const full_name = `${firstName || ''}${lastName ? ' ' + lastName : ''}`.trim()
                            const payload: any = { full_name, email }
                            await apiUpdateProfile(payload)
                            setMessage('Settings saved')
                          } else if (activeTab === 'password') {
                            if (!newPassword) {
                              setError('Please enter a new password')
                            } else if (newPassword !== confirmPassword) {
                              setError('New passwords do not match')
                            } else {
                              await apiChangePassword(newPassword)
                              setMessage('Password changed')
                              setNewPassword('')
                              setConfirmPassword('')
                            }
                          }
                        } catch (err: any) {
                          console.error('Failed to save admin settings', err)
                          setError(err?.body?.detail || err?.message || 'Failed to save settings')
                        } finally {
                          setLoading(false)
                        }
                      }}>{loading ? 'Saving…' : 'Save'}</button>
                    </div>
                  </>
                )}
              </div>

              <div className="admin-set-tabs">
                <button
                  className={`admin-set-tab ${activeTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile
                </button>
                <button
                  className={`admin-set-tab ${activeTab === 'password' ? 'active' : ''}`}
                  onClick={() => setActiveTab('password')}
                >
                  Password
                </button>
              </div>

              <div className="admin-set-form">
                {loadingProfile ? (
                  <SkeletonCard lines={5} />
                ) : (
                  <>
                    {activeTab === 'profile' && (
                      <>
                        <div className="admin-set-form-row">
                          <div className="admin-set-form-group">
                            <label>First name</label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                            />
                          </div>
                          <div className="admin-set-form-group">
                            <label>Last name</label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="admin-set-form-group">
                          <label>Email</label>
                          <div className="admin-set-input-with-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                              <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {activeTab === 'password' && (
                  <div className="password-panel">
                    <div className="admin-set-form-group">
                      <label>New password</label>
                      <input className="styled-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </div>
                    <div className="admin-set-form-group">
                      <label>Confirm new password</label>
                      <input className="styled-input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    </div>
                  </div>
                )}

                {message && <div className="text-green-600 mt-3">{message}</div>}
                {error && <div className="text-red-600 mt-3">{error}</div>}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminSettings
