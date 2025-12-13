import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiAdminGetUserCases, apiAdminGetUser, apiAdminPatchCase } from '../lib/api'
import './UserCases.css'
import Skeleton, { SkeletonCard } from './Skeleton'

interface UserCasesProps {
  onLogout: () => void
}

interface UserProfile {
  id: string
  email?: string
  full_name?: string
  phone?: string
  role?: string
  verified?: boolean
  onboarding_state?: any
  eligibilities?: any[]
  created_at?: string
  updated_at?: string
}

interface Case {
  id: string
  case_id?: string
  title: string
  status: string
  eligibility_rating?: number
  description?: string
  created_at?: string
  user_id?: string
}

function UserCases({ onLogout }: UserCasesProps) {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!userId) return
      setLoading(true)
      try {
        // Fetch user profile and cases in parallel
        const [userRes, casesRes]: any[] = await Promise.all([
          apiAdminGetUser(userId),
          apiAdminGetUserCases(userId)
        ])
        
        if (mounted) {
          setUser(userRes?.user || null)
          setCases(casesRes?.cases || casesRes?.data?.cases || [])
        }
      } catch (err) {
        console.error('Failed to load user data', err)
        if (mounted) setError('Failed to load user data')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [userId])

  function openCase(caseItem: Case) {
    navigate(`/admin/user/${userId}/case/${caseItem.id || caseItem.case_id}`)
  }

  async function changeCaseStatus(caseId: string, newStatus: string) {
    if (!newStatus || updatingCaseId) return
    setUpdatingCaseId(caseId)
    try {
      const res: any = await apiAdminPatchCase(caseId, { status: newStatus })
      const updated = res?.case || res
      setCases(prev => prev.map(c => (c.id === caseId ? { ...c, status: updated.status || newStatus } : c)))
    } catch (err) {
      console.error('Failed to update case status', err)
      alert('Failed to update case status')
    } finally {
      setUpdatingCaseId(null)
    }
  }

  return (
    <div className="user-cases-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-item" onClick={() => navigate('/admin/dashboard')}>
          <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Dashboard</span>
        </div>
        <div className="admin-sidebar-item active" onClick={() => navigate('/admin/users')}>
          <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Users Management</span>
        </div>
        <div className="admin-sidebar-item" onClick={() => navigate('/admin/calendar')}>
          <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Calendar</span>
        </div>
        <div className="admin-sidebar-item" onClick={() => navigate('/admin/settings')}>
          <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6"/>
          </svg>
          <span>Setting</span>
        </div>
      </aside>

      <main className="user-cases-main">
        <div className="user-cases-breadcrumb">
          <span onClick={() => navigate('/admin/users')} className="breadcrumb-link">Users</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{user?.full_name || user?.email || 'User'} Cases</span>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <SkeletonCard />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Skeleton style={{ height: 150 }} />
              <Skeleton style={{ height: 150 }} />
            </div>
          </div>
        ) : error ? (
          <div className="user-cases-error">{error}</div>
        ) : (
          <>
            {/* User Profile Card */}
            <div className="user-profile-card">
              <div className="user-profile-header">
                <div className="user-profile-avatar">
                  {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="user-profile-info">
                  <h1>{user?.full_name || 'No name provided'}</h1>
                  <div className="user-profile-meta">
                    <span className="user-profile-email">{user?.email || 'No email'}</span>
                    {user?.verified && <span className="user-profile-verified">✓ Verified</span>}
                  </div>
                </div>
              </div>

              <div className="user-profile-details">
                <div className="user-profile-row">
                  <div className="user-profile-field">
                    <label>Phone</label>
                    <span>{user?.phone || 'Not provided'}</span>
                  </div>
                  <div className="user-profile-field">
                    <label>Role</label>
                    <span className="user-role-badge">{user?.role || 'user'}</span>
                  </div>
                  <div className="user-profile-field">
                    <label>Member Since</label>
                    <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                {/* Onboarding Questionnaire Answers */}
                {user?.onboarding_state && Object.keys(user.onboarding_state).length > 0 && (
                  <div className="user-questionnaire-section">
                    <h3>Questionnaire Responses</h3>
                    <div className="user-questionnaire-grid">
                      {Object.entries(user.onboarding_state).map(([key, value]: [string, any]) => {
                        if (!value || typeof value === 'object') return null
                        return (
                          <div key={key} className="user-questionnaire-item">
                            <label>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
                            <span>{String(value)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Eligibility History */}
                {user?.eligibilities && user.eligibilities.length > 0 && (
                  <div className="user-eligibility-section">
                    <h3>Eligibility History</h3>
                    <div className="user-eligibility-list">
                      {user.eligibilities.map((elig: any, idx: number) => (
                        <div key={idx} className="user-eligibility-item">
                          <div className="eligibility-rating">
                            <strong>Rating:</strong> {elig.eligibility_rating || 'N/A'}
                          </div>
                          <div className="eligibility-date">
                            {elig.created_at ? new Date(elig.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cases Section */}
            <div className="user-cases-section">
              <h2>Cases ({cases.length})</h2>
              {cases.length === 0 ? (
                <div className="user-cases-empty">No cases found for this user.</div>
              ) : (
                <div className="user-cases-table">
                  <div className="user-cases-table-header">
                    <div className="user-cases-col-id">Case ID</div>
                    <div className="user-cases-col-title">Title</div>
                    <div className="user-cases-col-status">Status</div>
                    <div className="user-cases-col-eligibility">Eligibility</div>
                    <div className="user-cases-col-actions">Actions</div>
                  </div>
                  <div className="user-cases-table-body">
                    {cases.map((c) => (
                      <div key={c.id || c.case_id} className="user-cases-table-row">
                        <div className="user-cases-col-id" onClick={() => openCase(c)}>
                          {c.id || c.case_id || 'N/A'}
                        </div>
                        <div className="user-cases-col-title" onClick={() => openCase(c)}>
                          {c.title || 'Untitled case'}
                        </div>
                        <div className="user-cases-col-status">
                          <span className={`user-cases-status-badge ${(c.status || '').toLowerCase().replace('_', '-')}`}>
                            {(c.status || 'Unknown').replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="user-cases-col-eligibility">
                          {c.eligibility_rating !== undefined && c.eligibility_rating !== null
                            ? (Number(c.eligibility_rating) >= 1 ? 'Eligible' : 'Not Eligible')
                            : 'N/A'}
                        </div>
                        <div className="user-cases-col-actions">
                          <select
                            className="case-status-select"
                            value={c.status || ''}
                            disabled={updatingCaseId === (c.id || c.case_id)}
                            onChange={(e) => {
                              e.stopPropagation()
                              changeCaseStatus(c.id || c.case_id || '', e.target.value)
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Change Status...</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            className="case-view-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              openCase(c)
                            }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default UserCases
