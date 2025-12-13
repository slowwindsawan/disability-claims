import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiAdminGetAllCases } from '../lib/api'
import './AdminCases.css'
import Skeleton, { SkeletonCard } from './Skeleton'

interface AdminCasesProps {
  onLogout: () => void
  onSwitchToUser?: () => void
}

interface Case {
  id: string
  case_id?: string
  user_id: string
  title: string
  status: string
  eligibility_rating?: number
  description?: string
  created_at?: string
  updated_at?: string
  user_email?: string
  user_name?: string
}

function AdminCases({ onLogout, onSwitchToUser }: AdminCasesProps) {
  const navigate = useNavigate()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterEligibility, setFilterEligibility] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  const casesPerPage = 10

  useEffect(() => {
    loadCases()
  }, [currentPage, filterStatus, filterEligibility, searchQuery])

  async function loadCases() {
    setLoading(true)
    setError(null)
    try {
      const params: any = {
        limit: casesPerPage,
        offset: (currentPage - 1) * casesPerPage
      }
      if (filterStatus) params.status = filterStatus
      if (filterEligibility) params.eligibility = filterEligibility
      if (searchQuery) params.search = searchQuery

      const res: any = await apiAdminGetAllCases(params)
      const rows = res?.cases || []
      const total = res?.total || rows.length

      setCases(rows)
      setTotalPages(Math.ceil(total / casesPerPage))
    } catch (err) {
      console.error('Failed to load cases', err)
      setError('Failed to load cases')
    } finally {
      setLoading(false)
    }
  }

  function goToCase(caseItem: Case) {
    navigate(`/admin/user/${caseItem.user_id}/case/${caseItem.id || caseItem.case_id}`)
  }

  function goToUser(userId: string, e: React.MouseEvent) {
    e.stopPropagation()
    navigate(`/admin/user/${userId}/cases`)
  }

  function handlePageChange(page: number) {
    if (page < 1 || page > totalPages) return
    setCurrentPage(page)
  }

  function resetFilters() {
    setFilterStatus('')
    setFilterEligibility('')
    setSearchQuery('')
    setCurrentPage(1)
  }

  return (
    <div className="admin-cases-page">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-item" onClick={() => navigate('/admin/dashboard')}>
          <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <span>Dashboard</span>
        </div>
        <div className="admin-sidebar-item" onClick={() => navigate('/admin/users')}>
          <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>Users</span>
        </div>
        <div className="admin-sidebar-item active" onClick={() => navigate('/admin/cases')}>
          <svg className="admin-sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <span>Cases</span>
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
          <span>Settings</span>
        </div>
      </aside>

      <main className="admin-cases-main">
        <div className="admin-cases-header">
          <h1>All Cases</h1>
        </div>

        {/* Filters Section */}
        <div className="admin-cases-filters">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search by title, ID, or user..."
              className="filter-search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>

          <div className="filter-group">
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Statuses</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="closed">Closed</option>
            </select>

            <select
              className="filter-select"
              value={filterEligibility}
              onChange={(e) => {
                setFilterEligibility(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Eligibility</option>
              <option value="eligible">Eligible</option>
              <option value="not_eligible">Not Eligible</option>
              <option value="pending">Pending</option>
            </select>

            <button className="filter-reset-btn" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        </div>

        {/* Cases Table */}
        <div className="admin-cases-content">
          {loading ? (
            <div style={{ display: 'grid', gap: '1rem' }}>
              <SkeletonCard />
              <div>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 180px 120px 120px 120px', gap: '12px', padding: '10px 0', alignItems: 'center' }}>
                    <Skeleton style={{ height: 14, width: 80 }} />
                    <Skeleton style={{ height: 14 }} />
                    <Skeleton style={{ height: 14 }} />
                    <Skeleton style={{ height: 14 }} />
                    <Skeleton style={{ height: 14 }} />
                    <Skeleton style={{ height: 14 }} />
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="admin-cases-error">{error}</div>
          ) : cases.length === 0 ? (
            <div className="admin-cases-empty">No cases found</div>
          ) : (
            <>
              <div className="admin-cases-table">
                <div className="admin-cases-table-header">
                  <div className="case-col-id">Case ID</div>
                  <div className="case-col-title">Title</div>
                  <div className="case-col-user">User</div>
                  <div className="case-col-status">Status</div>
                  <div className="case-col-eligibility">Eligibility</div>
                  <div className="case-col-date">Created</div>
                </div>
                <div className="admin-cases-table-body">
                  {cases.map((c) => (
                    <div key={c.id || c.case_id} className="admin-cases-table-row" onClick={() => goToCase(c)}>
                      <div className="case-col-id">{c.id || c.case_id || 'N/A'}</div>
                      <div className="case-col-title">{c.title || 'Untitled case'}</div>
                      <div className="case-col-user">
                        <div 
                          className="case-user-link"
                          onClick={(e) => goToUser(c.user_id, e)}
                        >
                          <div className="case-user-name">{c.user_name || c.user_email || c.user_id}</div>
                          {c.user_email && <div className="case-user-email">{c.user_email}</div>}
                        </div>
                      </div>
                      <div className="case-col-status">
                        <span className={`case-status-badge ${(c.status || '').toLowerCase().replace('_', '-')}`}>
                          {(c.status || 'Unknown').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="case-col-eligibility">
                        {c.eligibility_rating !== undefined && c.eligibility_rating !== null
                          ? (Number(c.eligibility_rating) >= 1 ? 'Eligible' : 'Not Eligible')
                          : 'Pending'}
                      </div>
                      <div className="case-col-date">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              <div className="admin-cases-pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </button>
                <div className="pagination-info">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default AdminCases
