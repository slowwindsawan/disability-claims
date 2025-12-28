import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiAdminGetCase } from '../lib/api'
import './UserCaseDetail.css'
import Skeleton, { SkeletonCard } from './Skeleton'

interface UserCaseDetailProps {
  onLogout: () => void
}

function UserCaseDetail({ onLogout }: UserCaseDetailProps) {
  const { userId, caseId } = useParams<{ userId: string; caseId: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('case')
  const [caseData, setCaseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isReanalyzing, setIsReanalyzing] = useState(false)
  const [reanalyzeSuccess, setReanalyzeSuccess] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      if (!caseId) return
      setLoading(true)
      try {
        const res: any = await apiAdminGetCase(caseId)
        const data = res?.case || res?.data?.case || res
        if (mounted) setCaseData(data)
      } catch (err) {
        console.error('Failed to load case', err)
        if (mounted) setError('Failed to load case')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [caseId])

  const metadata = caseData?.metadata || {}
  const eligibility = metadata?.initial_eligibility || {}

  const userDisplay = caseData?.user_id || userId || 'User'

  async function handleReanalyze() {
    if (!caseId) return
    setIsReanalyzing(true)
    setReanalyzeSuccess(false)
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/vapi/re-analyze-call/${caseId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to re-analyze call')
      }
      
      const result = await response.json()
      // Update case data with new analysis
      setCaseData((prev: any) => ({
        ...prev,
        call_details: result.call_details
      }))
      setReanalyzeSuccess(true)
      setTimeout(() => setReanalyzeSuccess(false), 3000)
    } catch (err: any) {
      console.error('Failed to re-analyze call:', err)
      setError(err.message || 'Failed to re-analyze call')
    } finally {
      setIsReanalyzing(false)
    }
  }

  return (
    <div className="user-case-detail-page">
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

      <main className="user-case-detail-main">
        <div className="user-case-detail-breadcrumb">
          <span onClick={() => navigate('/admin/users')} className="breadcrumb-link">Users</span>
          <span className="breadcrumb-separator">/</span>
          <span onClick={() => navigate(`/admin/user/${userId}/cases`)} className="breadcrumb-link">{userDisplay}</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Case {caseId}</span>
        </div>

        <div className="user-case-detail-header">
          <div className="user-case-detail-profile">
            <div className="user-case-detail-avatar">{userDisplay.slice(0, 2).toUpperCase()}</div>
            <h1>{caseData?.title || 'Case Details'}</h1>
          </div>
        </div>

        <div className="user-case-detail-tabs">
          <button
            className={`user-case-detail-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
          </button>
          <button
            className={`user-case-detail-tab ${activeTab === 'case' ? 'active' : ''}`}
            onClick={() => setActiveTab('case')}
          >
            Case Details
          </button>
          <button
            className={`user-case-detail-tab ${activeTab === 'call' ? 'active' : ''}`}
            onClick={() => setActiveTab('call')}
          >
            Call Analysis
          </button>
          <button
            className={`user-case-detail-tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            Documents
          </button>
          <button
            className={`user-case-detail-tab ${activeTab === 'meetings' ? 'active' : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            Meetings
          </button>
        </div>

        <div className="user-case-detail-content">
          {loading ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <SkeletonCard />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1rem' }}>
                <Skeleton style={{ height: 220 }} />
                <Skeleton style={{ height: 220 }} />
              </div>
            </div>
          ) : error ? (
            <div className="user-case-detail-error">{error}</div>
          ) : (
            <>
              {activeTab === 'profile' && (
                <section className="user-case-detail-section">
                  <h3>User Profile</h3>
                  <div className="user-case-detail-field"><strong>User ID:</strong> {userId || caseData?.user_id || 'N/A'}</div>
                  <div className="user-case-detail-field"><strong>Email:</strong> {caseData?.user_id || userId || 'N/A'}</div>
                </section>
              )}

              {activeTab === 'case' && (
                <div className="user-case-detail-case-layout">
                  <div className="user-case-detail-case-left">
                    <section className="user-case-detail-case-status-card">
                      <div className="user-case-detail-case-status-header">
                        <h3>Current Case Status:</h3>
                        <span className="user-case-detail-case-id">Case Number: {caseId}</span>
                      </div>

                      <div className="user-case-detail-case-status-body">
                        <div className="user-case-detail-case-status-text">
                          <h4>Status: {caseData?.status || 'Unknown'}</h4>
                          <p><strong>Title:</strong> {caseData?.title || 'Untitled'}</p>
                          <p><strong>Description:</strong> {caseData?.description || 'No description'}</p>
                          <p><strong>Created:</strong> {caseData?.created_at ? new Date(caseData.created_at).toLocaleDateString() : 'N/A'}</p>
                          <p><strong>Updated:</strong> {caseData?.updated_at ? new Date(caseData.updated_at).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                    </section>

                    <section className="user-case-detail-metadata-card">
                      <h3>Eligibility Details</h3>
                      <div className="user-case-detail-field"><strong>Rating:</strong> {eligibility?.rating || 'N/A'}</div>
                      <div className="user-case-detail-field"><strong>Title:</strong> {eligibility?.title || 'N/A'}</div>
                      <div className="user-case-detail-field"><strong>Message:</strong> {eligibility?.message || 'N/A'}</div>
                      <div className="user-case-detail-field"><strong>Confidence:</strong> {eligibility?.confidence || 'N/A'}</div>
                    </section>
                  </div>

                  <div className="user-case-detail-case-right">
                    <div className="user-case-detail-metadata-raw">
                      <h4>Raw Metadata</h4>
                      <pre>{JSON.stringify(metadata, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'call' && (
                <section className="user-case-detail-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Call Analysis</h3>
                    {caseData?.call_details?.transcript && (
                      <button
                        onClick={handleReanalyze}
                        disabled={isReanalyzing}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: isReanalyzing ? '#ccc' : '#4F46E5',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          cursor: isReanalyzing ? 'not-allowed' : 'pointer',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        {isReanalyzing ? (
                          <>
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            Re-analyzing...
                          </>
                        ) : (
                          <>
                            🔄 Re-analyze Call
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {reanalyzeSuccess && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#D1FAE5', 
                      color: '#065F46', 
                      borderRadius: '0.5rem', 
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      ✅ Call re-analyzed successfully!
                    </div>
                  )}
                  
                  {error && activeTab === 'call' && (
                    <div style={{ 
                      padding: '1rem', 
                      backgroundColor: '#FEE2E2', 
                      color: '#991B1B', 
                      borderRadius: '0.5rem', 
                      marginBottom: '1rem'
                    }}>
                      ❌ {error}
                    </div>
                  )}
                  
                  {caseData?.call_details ? (
                    <div>
                      {/* Call Transcript */}
                      {caseData.call_details.transcript && (
                        <div style={{ marginBottom: '2rem' }}>
                          <h4 style={{ marginBottom: '0.5rem' }}>📝 Transcript</h4>
                          <div style={{ 
                            backgroundColor: '#F9FAFB', 
                            padding: '1rem', 
                            borderRadius: '0.5rem',
                            maxHeight: '300px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            fontSize: '0.9rem',
                            lineHeight: '1.6'
                          }}>
                            {caseData.call_details.transcript}
                          </div>
                        </div>
                      )}
                      
                      {/* Analysis Results */}
                      {caseData.call_details.analysis?.structured_data && (
                        <div>
                          <h4 style={{ marginBottom: '1rem' }}>📊 Analysis Results</h4>
                          
                          {/* Estimated Claim Amount */}
                          {caseData.call_details.analysis.structured_data.estimated_claim_amount && (
                            <div style={{ 
                              padding: '1rem', 
                              backgroundColor: '#D1FAE5', 
                              borderRadius: '0.5rem',
                              marginBottom: '1rem'
                            }}>
                              <div style={{ fontSize: '0.875rem', color: '#065F46', marginBottom: '0.25rem' }}>💰 Estimated Claim Amount</div>
                              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#047857' }}>
                                {caseData.call_details.analysis.structured_data.estimated_claim_amount}
                              </div>
                            </div>
                          )}
                          
                          {/* Case Summary */}
                          {caseData.call_details.analysis.structured_data.case_summary && (
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h5 style={{ marginBottom: '0.5rem' }}>⚖️ Case Summary</h5>
                              <div style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '1rem', 
                                borderRadius: '0.5rem',
                                lineHeight: '1.6'
                              }}>
                                {caseData.call_details.analysis.structured_data.case_summary}
                              </div>
                            </div>
                          )}
                          
                          {/* Risk Assessment */}
                          {caseData.call_details.analysis.structured_data.risk_assessment && (
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h5 style={{ marginBottom: '0.5rem' }}>⚠️ Risk Assessment</h5>
                              <div style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '1rem', 
                                borderRadius: '0.5rem',
                                fontWeight: '500'
                              }}>
                                {caseData.call_details.analysis.structured_data.risk_assessment}
                              </div>
                            </div>
                          )}
                          
                          {/* Documents Requested */}
                          {caseData.call_details.analysis.structured_data.documents_requested_list?.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h5 style={{ marginBottom: '0.5rem' }}>📄 Documents Requested ({caseData.call_details.analysis.structured_data.documents_requested_list.length})</h5>
                              <ul style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '1rem 1rem 1rem 2rem', 
                                borderRadius: '0.5rem',
                                lineHeight: '1.8'
                              }}>
                                {caseData.call_details.analysis.structured_data.documents_requested_list.map((doc: string, idx: number) => (
                                  <li key={idx} style={{ marginBottom: '0.5rem' }}>{doc}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Key Legal Points */}
                          {caseData.call_details.analysis.structured_data.key_legal_points?.length > 0 && (
                            <div style={{ marginBottom: '1.5rem' }}>
                              <h5 style={{ marginBottom: '0.5rem' }}>🔑 Key Legal Points</h5>
                              <ul style={{ 
                                backgroundColor: '#F9FAFB', 
                                padding: '1rem 1rem 1rem 2rem', 
                                borderRadius: '0.5rem',
                                lineHeight: '1.8'
                              }}>
                                {caseData.call_details.analysis.structured_data.key_legal_points.map((point: string, idx: number) => (
                                  <li key={idx} style={{ marginBottom: '0.5rem' }}>{point}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!caseData.call_details.analysis && (
                        <div className="user-case-detail-empty">Call details available but no analysis found.</div>
                      )}
                    </div>
                  ) : (
                    <div className="user-case-detail-empty">No call data available for this case.</div>
                  )}
                </section>
              )}

              {activeTab === 'documents' && (
                <section className="user-case-detail-section">
                  <h3>Documents</h3>
                  <div className="user-case-detail-empty">No documents available for this case.</div>
                </section>
              )}

              {activeTab === 'meetings' && (
                <section className="user-case-detail-section">
                  <h3>Meetings</h3>
                  <div className="user-case-detail-empty">No meetings scheduled for this case.</div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default UserCaseDetail
