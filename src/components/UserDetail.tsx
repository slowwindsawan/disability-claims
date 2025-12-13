import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import './UserDetail.css'
import { apiGetProfile, apiGetCases, apiGetCase } from '../lib/api'
import Skeleton, { SkeletonCard } from './Skeleton'

interface UserDetailProps {
  onLogout: () => void
  onNavigate: (page: string) => void
  onSwitchToUser: () => void
  userId?: number
}

interface Document {
  name: string
  status: 'Pending' | 'Submitted' | 'Rejected' | 'Approved'
  description: string
}

interface Meeting {
  id: number
  title: string
  date: string
  time: string
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  type: string
}

function UserDetail({ onLogout, onNavigate, onSwitchToUser }: UserDetailProps) {
  const { id: caseId } = useParams<{ id: string }>()
  const [activeMenu, setActiveMenu] = useState('users')
  const [activeTab, setActiveTab] = useState('profile')
  const [documentFilter, setDocumentFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [selectedCase, setSelectedCase] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [caseId])

  async function loadData() {
    setLoading(true)
    try {
      // Fetch user profile
      const profileRes = await apiGetProfile()
      if (profileRes.status === 'ok') {
        setProfile(profileRes.profile || profileRes.data)
      }

      // Fetch user cases
      const casesRes = await apiGetCases()
      if (casesRes.status === 'ok') {
        setCases(casesRes.cases || [])
        
        // If caseId in URL, fetch that specific case
        if (caseId) {
          const caseRes = await apiGetCase(caseId)
          if (caseRes.status === 'ok') {
            setSelectedCase(caseRes.case)
            setActiveTab('case')
          }
        } else if (casesRes.cases && casesRes.cases.length > 0) {
          // Default to first case if no specific case ID
          setSelectedCase(casesRes.cases[0])
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const user = {
    name: profile?.full_name || 'User',
    avatar: profile?.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U',
    email: profile?.email || '',
    phone: profile?.phone || ''
  }

  const documents: Document[] = [
    {
      name: 'Recent Pay Slips',
      status: 'Pending',
      description: 'Can be downloaded from employer portals or the Social Security website.'
    },
    {
      name: 'Current Psychiatric/Neurological Report',
      status: 'Submitted',
      description: 'Obtain report from your physician or clinic.'
    },
    {
      name: 'Previous Medical Documents',
      status: 'Rejected',
      description: 'Collect from your medical records or healthcare provider.'
    },
    {
      name: 'Current and Previous Accommodation Approvals',
      status: 'Approved',
      description: 'Can be obtained from your university or scholarship office.'
    },
    {
      name: 'Reports From Integration Teachers/Committees',
      status: 'Approved',
      description: 'Gather from your school or educational support provider.'
    },
    {
      name: 'Recent Bank Statements',
      status: 'Pending',
      description: 'Download from your online banking platform.'
    },
    {
      name: 'Proof of Address',
      status: 'Submitted',
      description: 'Utility bill, rental agreement, or government-issued document.'
    }
  ]

  const meetings: Meeting[] = [
    {
      id: 1,
      title: 'Initial Consultation',
      date: 'Monday, 8 February, 2023',
      time: '10:00 AM',
      status: 'Completed',
      type: 'Video Call'
    },
    {
      id: 2,
      title: 'Document Review Session',
      date: 'Wednesday, 10 February, 2023',
      time: '2:00 PM',
      status: 'Completed',
      type: 'In-Person'
    },
    {
      id: 3,
      title: 'Case Status Update',
      date: 'Friday, 12 February, 2023',
      time: '11:30 AM',
      status: 'Scheduled',
      type: 'Video Call'
    },
    {
      id: 4,
      title: 'Final Review Meeting',
      date: 'Monday, 15 February, 2023',
      time: '3:00 PM',
      status: 'Scheduled',
      type: 'In-Person'
    },
    {
      id: 5,
      title: 'Follow-up Consultation',
      date: 'Thursday, 4 February, 2023',
      time: '9:00 AM',
      status: 'Cancelled',
      type: 'Phone Call'
    }
  ]

  const filteredDocuments = documentFilter === 'all'
    ? documents
    : documents.filter(doc => doc.status === documentFilter)

  const progressItems = [
    { title: 'Eligibility Questionnaire', status: 'completed', date: 'Sunday, 08 Nov 2020' },
    { title: 'Profile Setup', status: 'completed', date: 'Sunday, 08 Nov 2020' },
    { title: 'Booking Schedule', status: 'completed', date: 'Sunday, 08 Nov 2020' },
    { title: 'Payment Completed', status: 'completed', date: 'Sunday, 08 Nov 2020' },
    { title: 'Documents Submission Under Verification', status: 'current', date: 'Sunday, 08 Nov 2020' },
    { title: 'Documents Rejected', status: 'pending', date: 'Sunday, 08 Nov 2020' },
    { title: 'Awaiting Fresh Eligibility Response', status: 'pending', date: 'Sunday, 08 Nov 2020' },
    { title: 'Eligibility Certificates Acquired', status: 'pending', date: 'Sunday, 08 Nov 2020' },
    { title: 'Submit Medical Report to CRDB', status: 'pending', date: 'Sunday, 08 Nov 2020' },
    { title: 'Verification and Review with CRDB', status: 'pending', date: 'Sunday, 08 Nov 2020' },
    { title: 'Automated Rights Management', status: 'pending', date: 'Sunday, 08 Nov 2020' },
    { title: 'Accommodation for Digital DAAD Registration', status: 'pending', date: 'Sunday, 08 Nov 2020' }
  ]

  return (
    <div className="user-detail-page">
      

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
            onClick={() => onNavigate('admin-settings')}
          >
            <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="user-detail-main">
{/* 
          <div className="user-detail-header">
            <div className="user-detail-profile">
              <div className="user-detail-avatar">{user.avatar}</div>
              <h1>{user.name}</h1>
            </div>
            <button className="user-detail-menu-btn">⋮</button>
          </div> */}

          <div className="user-detail-tabs">
            {/* <button
              className={`user-detail-tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button> */}
            <button
              className={`user-detail-tab ${activeTab === 'case' ? 'active' : ''}`}
              onClick={() => setActiveTab('case')}
            >
              Case Details
            </button>
            <button
              className={`user-detail-tab ${activeTab === 'documents' ? 'active' : ''}`}
              onClick={() => setActiveTab('documents')}
            >
              Documents
            </button>
            <button
              className={`user-detail-tab ${activeTab === 'meetings' ? 'active' : ''}`}
              onClick={() => setActiveTab('meetings')}
            >
              Meetings
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="user-detail-content">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <SkeletonCard lines={4} />
                </div>
              ) : (
                <>
              <section className="user-detail-section">
                <h3>Personal Information</h3>

                <div className="user-detail-form-row">
                  <div className="user-detail-form-group">
                    <label>Full Name</label>
                    <input type="text" value={profile?.full_name || ''} readOnly />
                  </div>
                  <div className="user-detail-form-group">
                    <label>Email</label>
                    <input type="text" value={user.email} readOnly />
                  </div>
                </div>

                <div className="user-detail-form-row">
                  <div className="user-detail-form-group">
                    <label>Phone Number</label>
                    <input type="text" value={user.phone || 'Not provided'} readOnly />
                  </div>
                  <div className="user-detail-form-group">
                    <label>Role</label>
                    <input type="text" value={profile?.role || 'user'} readOnly />
                  </div>
                </div>

                <div className="user-detail-form-row">
                  <div className="user-detail-form-group">
                    <label>Account Status</label>
                    <input type="text" value={profile?.verified ? 'Verified' : 'Not Verified'} readOnly />
                  </div>
                  <div className="user-detail-form-group">
                    <label>Created At</label>
                    <input type="text" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'} readOnly />
                  </div>
                </div>
              </section>

              {profile?.onboarding_state && (
              <section className="user-detail-section">
                <h3>Questionnaire Responses</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {Object.entries(profile.onboarding_state).map(([key, value]: [string, any]) => (
                    <div key={key} className="user-detail-form-group">
                      <label style={{ textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</label>
                      <input 
                        type="text" 
                        value={typeof value === 'object' ? JSON.stringify(value) : String(value || 'N/A')} 
                        readOnly 
                      />
                    </div>
                  ))}
                </div>
              </section>
              )}

              {cases.length > 0 && (
              <section className="user-detail-section">
                <h3>My Cases</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {cases.map((caseItem: any) => (
                    <div 
                      key={caseItem.id} 
                      style={{ 
                        padding: '1rem', 
                        border: '1px solid #e0e0e0', 
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setSelectedCase(caseItem)
                        setActiveTab('case')
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#84cc16'
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(132, 204, 22, 0.2)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e0e0e0'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>{caseItem.title || `Case ${caseItem.id}`}</h4>
                      <p style={{ margin: '0', color: '#666', fontSize: '0.9rem' }}>
                        Status: <span style={{ color: '#84cc16', fontWeight: '500' }}>{caseItem.status || 'Pending'}</span>
                      </p>
                      {caseItem.created_at && (
                        <p style={{ margin: '0.5rem 0 0 0', color: '#999', fontSize: '0.85rem' }}>
                          Created: {new Date(caseItem.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
              )}
              </>
              )}
            </div>
          )}

          {activeTab === 'case' && (
            <div className="user-detail-case-layout">
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <SkeletonCard lines={5} />
                </div>
              ) : !selectedCase ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <p>No case found.</p>
                  {cases.length > 0 && (
                    <div>
                      <h3>Your Cases:</h3>
                      <ul>
                        {cases.map((c: any) => (
                          <li key={c.id}>
                            <button onClick={() => setSelectedCase(c)} style={{ textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: '#84cc16' }}>
                              {c.title || `Case ${c.id}`}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
              <div className="user-detail-case-left">
                <section className="user-detail-case-status-card">
                  <div className="user-detail-case-status-header">
                    <h3>Current Case Status:</h3>
                    <span className="user-detail-case-id">Case ID: # {selectedCase.id || 'N/A'}</span>
                  </div>

                  <div className="user-detail-case-status-body">
                    <div className="user-detail-progress-circle">
                      <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="60" fill="none" stroke="#e0e0e0" strokeWidth="10"/>
                        <circle cx="70" cy="70" r="60" fill="none" stroke="#84cc16" strokeWidth="10" strokeDasharray="377" strokeDashoffset="113" strokeLinecap="round" transform="rotate(-90 70 70)"/>
                      </svg>
                      <div className="user-detail-progress-text">
                        <div className="user-detail-progress-percent">70%</div>
                        <div className="user-detail-progress-label">Your Case<br/>Completed</div>
                      </div>
                    </div>

                    <div className="user-detail-case-status-text">
                      <h4>Case Status: {selectedCase.status || 'Under Review'}</h4>
                      <p><strong>Title:</strong> {selectedCase.title || 'N/A'}</p>
                      <p><strong>Description:</strong> {selectedCase.description || 'No description available.'}</p>
                      <p><strong>Eligibility Status:</strong> {selectedCase.eligibility_status || 'Pending'}</p>
                      {selectedCase.eligibility_reasons && (
                        <p><strong>Eligibility Reasons:</strong> {selectedCase.eligibility_reasons}</p>
                      )}
                      {selectedCase.created_at && (
                        <p><strong>Created:</strong> {new Date(selectedCase.created_at).toLocaleDateString()}</p>
                      )}
                      {selectedCase.updated_at && (
                        <p><strong>Last Updated:</strong> {new Date(selectedCase.updated_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section className="user-detail-documents-card">
                  <h3>Documents</h3>
                  <div className="user-detail-documents-header">
                    <span>Document Name</span>
                    <span>Status</span>
                  </div>
                  <div className="user-detail-documents-list">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="user-detail-document-item">
                        <div className="user-detail-document-info">
                          <div className="user-detail-document-name">{doc.name}</div>
                          <div className="user-detail-document-desc">{doc.description}</div>
                        </div>
                        <div className="user-detail-document-status">
                          <span className={`user-detail-status-badge ${doc.status.toLowerCase()}`}>
                            {doc.status === 'Submitted' && '✓'}
                            {doc.status === 'Approved' && '✓'}
                            {doc.status === 'Rejected' && '●'}
                            {doc.status === 'Pending' && '⚠'}
                            {' '}{doc.status}
                          </span>
                          <button className="user-detail-doc-menu">⋮</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="user-detail-case-right">
                <div className="user-detail-progress-tracker-card">
                  <h4>Progress Tracker</h4>
                  <div className="user-detail-progress-timeline">
                    {progressItems.map((item, idx) => (
                      <div key={idx} className={`user-detail-timeline-item ${item.status}`}>
                        <div className="user-detail-timeline-indicator">
                          <div className="user-detail-timeline-dot">
                            {item.status === 'completed' && '✓'}
                          </div>
                          {idx < progressItems.length - 1 && <div className="user-detail-timeline-line" />}
                        </div>
                        <div className="user-detail-timeline-content">
                          <div className="user-detail-timeline-title">{item.title}</div>
                          <div className="user-detail-timeline-date">{item.date}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="user-detail-content">
              <div className="user-detail-documents-header-bar">
                <h2>Documents</h2>
                <div className="user-detail-documents-actions">
                  <select
                    className="user-detail-filter-select"
                    value={documentFilter}
                    onChange={(e) => setDocumentFilter(e.target.value)}
                  >
                    <option value="all">All Documents</option>
                    <option value="Pending">Pending</option>
                    <option value="Submitted">Submitted</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Approved">Approved</option>
                  </select>
                  <button className="user-detail-add-btn" title="Add Document">
                    +
                  </button>
                </div>
              </div>

              <div className="user-detail-documents-table">
                <div className="user-detail-documents-table-header">
                  <div className="user-detail-doc-col-name">Document Name</div>
                  <div className="user-detail-doc-col-status">Status</div>
                </div>

                <div className="user-detail-documents-table-body">
                  {filteredDocuments.map((doc, idx) => (
                    <div key={idx} className="user-detail-documents-table-row">
                      <div className="user-detail-doc-col-name">
                        <div className="user-detail-doc-title">{doc.name}</div>
                        <div className="user-detail-doc-subtitle">{doc.description}</div>
                      </div>
                      <div className="user-detail-doc-col-status">
                        <span className={`user-detail-doc-status-badge ${doc.status.toLowerCase()}`}>
                          {doc.status === 'Pending' && '⚠'}
                          {doc.status === 'Submitted' && '✓'}
                          {doc.status === 'Rejected' && '●'}
                          {doc.status === 'Approved' && '✓'}
                          {' '}{doc.status}
                        </span>
                        <button className="user-detail-doc-menu-btn">⋮</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'meetings' && (
            <div className="user-detail-content">
              <div className="user-detail-meetings-header-bar">
                <h2>Meetings</h2>
                <button className="user-detail-add-btn" title="Schedule Meeting">
                  +
                </button>
              </div>

              <div className="user-detail-meetings-list">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className={`user-detail-meeting-card ${meeting.status.toLowerCase()}`}>
                    <div className="user-detail-meeting-header">
                      <div className="user-detail-meeting-icon">
                        {meeting.status === 'Completed' && '✓'}
                        {meeting.status === 'Scheduled' && '📅'}
                        {meeting.status === 'Cancelled' && '✕'}
                      </div>
                      <div className="user-detail-meeting-info">
                        <h3>{meeting.title}</h3>
                        <div className="user-detail-meeting-meta">
                          <span className="user-detail-meeting-date">{meeting.date}</span>
                          <span className="user-detail-meeting-time">{meeting.time}</span>
                          <span className="user-detail-meeting-type">{meeting.type}</span>
                        </div>
                      </div>
                      <div className="user-detail-meeting-status">
                        <span className={`user-detail-meeting-status-badge ${meeting.status.toLowerCase()}`}>
                          {meeting.status}
                        </span>
                        <button className="user-detail-doc-menu-btn">⋮</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default UserDetail
