import { useEffect, useRef, useState } from 'react'
import './Settings.css'
import api from '../lib/api'

interface SettingsProps {
  onLogout: () => void
  onNavigate: (page: string) => void
}

function Settings({ onLogout, onNavigate }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'personal' | 'password'>('personal')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showReEnterPassword, setShowReEnterPassword] = useState(false)
  const [withdrawalExpanded, setWithdrawalExpanded] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [rating, setRating] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await api.apiGetProfile()
        if (!mounted) return
        if (res && res.profile) {
          setProfile(res.profile)
          if (res.profile.photo_url) setPhotoPreview(res.profile.photo_url)
        }
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])
  const [instagramLink, setInstagramLink] = useState('')
  const [facebookLink, setFacebookLink] = useState('')
  const [feedbackPermission, setFeedbackPermission] = useState(false)
  const [referralPermission, setReferralPermission] = useState(false)
  return (
    <div className="dashboard">

      <div className="dash-container">
        <aside className="sidebar">
          <div className="sidebar-item" onClick={() => onNavigate('dashboard')}>
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Dashboard</span>
          </div>
          <div className="sidebar-item" onClick={() => onNavigate('mycase')}>
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span>Documents</span>
          </div>
          <div className="sidebar-item" onClick={() => onNavigate('appointment')}>
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>Appointment</span>
          </div>
          <div className="sidebar-item" onClick={() => onNavigate('payments')}>
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            <span>Payments</span>
          </div>
          <div className="sidebar-item">
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <span>Messages</span>
          </div>
          <div className="sidebar-item active">
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m6-12h-6m6 6h-6M18 6l-3 3m0 6l3 3M6 18l3-3m0-6L6 6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="settings-main">
          <div className="settings-header">
            <div
              className="settings-avatar"
              style={photoPreview ? { backgroundImage: `url(${photoPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
              onClick={() => fileInputRef.current?.click()}
              title="Click to change photo"
            />
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
              const f = e.target.files && e.target.files[0]
              if (!f) return
              // preview locally
              const url = URL.createObjectURL(f)
              setPhotoPreview(url)
              try {
                const fd = new FormData()
                fd.append('file', f)
                const up = await api.apiUploadProfilePhoto(fd)
                if (up && up.profile) {
                  const p = Array.isArray(up.profile) ? up.profile[0] : up.profile
                  setProfile(p)
                  // Only use returned URL if it's an HTTP URL (Supabase public URL). Otherwise keep local preview.
                  if (p && p.photo_url && typeof p.photo_url === 'string' && /^https?:/i.test(p.photo_url)) {
                    setPhotoPreview(p.photo_url)
                  }
                }
              } catch (err) {
                console.error('Upload failed', err)
              }
            }} />
            <h1 className="settings-title">Settings</h1>
          </div>

          <div className="settings-header-actions">
            <button className="cancel-btn">Cancel</button>
            <button className="save-btn">Save</button>
          </div>

          <div className="settings-tabs">
            <button
              className={`settings-tab ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              Personal Information
            </button>
            <button
              className={`settings-tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              Password
            </button>
          </div>

          <div className="settings-content">
            {activeTab === 'personal' && (
            <>
            <div className="settings-section">
              <div className="section-header">
                <span>Withdrawal Method</span>
                <svg className="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="dropdown-field" onClick={() => setWithdrawalExpanded(!withdrawalExpanded)}>
                <svg className="lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Add withdrawal method</span>
                <svg className={`chevron-icon ${withdrawalExpanded ? 'rotate' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {withdrawalExpanded && (
                <div className="withdrawal-form">
                  <div className="withdrawal-info">
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud</p>
                  </div>

                  <div className="bank-details-section">
                    <h3>Bank Account Details</h3>
                    <p className="bank-details-info">
                      To process your case and ensure you receive payments directly, we need your bank account details. This includes your account number, branch number, and bank number. Additionally, please upload a document as proof of personal bank management (e.g., a recent bank statement) or an official confirmation from your bank to verify that the account is registered in your name.
                    </p>

                    <div className="withdrawal-input-group">
                      <label>Bank Account Number</label>
                      <input type="text" placeholder="Bank Account Number" />
                    </div>

                    <div className="withdrawal-input-group">
                      <label>Branch Number</label>
                      <input type="text" placeholder="Branch Number" />
                    </div>

                    <div className="withdrawal-input-group">
                      <label>Bank Number</label>
                      <input type="text" placeholder="Bank Number" />
                    </div>
                  </div>

                  <div className="upload-proof-section">
                    <h3>Upload Proof of Bank Management</h3>
                    <p className="upload-info">
                      Upload a document showing your name and account details (e.g., a bank statement or official confirmation from your bank).
                    </p>

                    <div className="upload-area">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <p>Drag and drop or click to upload your file.</p>
                    </div>
                  </div>

                  <div className="withdrawal-actions">
                    <button className="cancel-action-btn" onClick={(e) => { e.stopPropagation(); setWithdrawalExpanded(false); }}>Cancel</button>
                    <button className="send-btn">Send</button>
                  </div>
                </div>
              )}
            </div>

            <div className="settings-section">
              <div className="section-header">
                <span>Social Security Account</span>
                <svg className="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="dropdown-field">
                <svg className="lock-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Add Social Security Account</span>
                <a href="#" className="open-account-link">Open an account</a>
              </div>

              <div className="id-section">
                <p className="id-instruction">Please add your personal exactly like they are written in your ID</p>
                <div className="input-row">
                  <div className="input-group">
                    <label>Username</label>
                    <input type="text" placeholder="Hussainn242" />
                  </div>
                  <div className="input-group">
                    <label>Password</label>
                    <input type="text" placeholder="12345678" />
                  </div>
                </div>
              </div>

              <div className="photo-section">
                <p className="photo-instruction">Please take a photo of your id...</p>
                <div className="photo-upload">
                  <svg className="photo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>ID Photo Frontside.png</span>
                  <div className="photo-actions">
                    <button className="icon-action-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button className="icon-action-btn delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="photo-upload">
                  <svg className="photo-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>ID Photo Backside.png</span>
                  <div className="photo-actions">
                    <button className="icon-action-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button className="icon-action-btn delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <span>Referral Program</span>
                <svg className="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="referral-content">
                <p className="referral-description">
                  Share your unique referral link with friends and family. When they sign up using your link, you'll both receive benefits!
                </p>
                <button className="open-modal-btn" onClick={() => setShowReferralModal(true)}>
                  Open Referral Program
                </button>
              </div>
            </div>

            <div className="settings-section">
              <div className="section-header">
                <span>Feedback</span>
                <svg className="info-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div className="feedback-content">
                <p className="feedback-description">
                  We value your opinion! Share your thoughts, suggestions, or report any issues you've encountered.
                </p>
                <button className="open-modal-btn" onClick={() => setShowFeedbackModal(true)}>
                  Give Feedback
                </button>
              </div>
            </div>
            </>
            )}

            {activeTab === 'password' && (
              <div className="password-content">
                <div className="password-form">
                  <div className="input-row">
                    <div className="input-group-full">
                      <label>First Name</label>
                      <input type="text" placeholder="Hussnain" />
                    </div>
                    <div className="input-group-full">
                      <label>Last Name</label>
                      <input type="text" placeholder="Arif" />
                    </div>
                  </div>

                  <div className="input-row">
                    <div className="input-group-full">
                      <label>Email</label>
                      <input type="email" placeholder="hussnain.creative@gmail.com" />
                    </div>
                    <div className="input-group-full">
                      <label>Phone Number</label>
                      <input type="tel" placeholder="+92 311 1223345" />
                    </div>
                  </div>

                  <div className="password-section-group">
                    <div className="input-group-full">
                      <label>Old Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {showOldPassword ? (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </>
                            ) : (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="password-section-group">
                    <div className="input-group-full">
                      <label>New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {showNewPassword ? (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </>
                            ) : (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="password-section-group">
                    <div className="input-group-full">
                      <label>Re-Enter New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showReEnterPassword ? "text" : "password"}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setShowReEnterPassword(!showReEnterPassword)}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {showReEnterPassword ? (
                              <>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </>
                            ) : (
                              <>
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                              </>
                            )}
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Feedback</h2>
              <button className="close-modal-btn" onClick={() => setShowFeedbackModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Thank you for using ADHDEAL! We'd love to hear your feedback so we can improve and share your success with others.
              </p>

              <div className="rating-section">
                <p className="rating-question">How would you rate your overall experience with ADHDEAL?</p>
                <div className="star-rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      className={`star-btn ${rating >= star ? 'active' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      <svg width="32" height="32" viewBox="0 0 24 24" fill={rating >= star ? '#FFD700' : 'none'} stroke="#FFD700" strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="rating-labels">
                  <span>Poor</span>
                  <span>Average</span>
                  <span>Good</span>
                  <span>Very Good</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div className="feedback-textarea-section">
                <p className="textarea-label">Tell us about your experience. What did you love? What can we do better?</p>
                <textarea
                  className="modal-textarea"
                  placeholder="Write your feedback here..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="permission-checkbox">
                <input
                  type="checkbox"
                  id="feedback-permission"
                  checked={feedbackPermission}
                  onChange={(e) => setFeedbackPermission(e.target.checked)}
                />
                <label htmlFor="feedback-permission">I give permission for ADHDEAL to share my feedback.</label>
              </div>

              <div className="modal-actions">
                <button className="cancel-modal-btn" onClick={() => setShowFeedbackModal(false)}>
                  Cancel
                </button>
                <button className="submit-modal-btn">
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReferralModal && (
        <div className="modal-overlay" onClick={() => setShowReferralModal(false)}>
          <div className="modal-content referral-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Referral Program</h2>
              <button className="close-modal-btn" onClick={() => setShowReferralModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="referral-section">
                <h3>Earn Rewards</h3>
                <p className="referral-modal-description">
                  Invite your friends to join ADHDEAL and earn rewards! For every friend who signs up, you'll earn 150 NIS, and they'll get a 150 NIS discount!
                </p>
                <button className="refer-friend-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                  Refer a Friend
                </button>
              </div>

              <div className="social-sharing-section">
                <h3>Social Media Sharing</h3>
                <p className="social-description">
                  If you'd like, share your Instagram or Facebook profile so we can feature your success story and tag you in our posts!
                </p>
                <p className="social-question">Would you like to share your experience on social media?</p>

                <div className="social-input-group">
                  <label>Instagram</label>
                  <input
                    type="text"
                    placeholder="Paste your Instagram link"
                    value={instagramLink}
                    onChange={(e) => setInstagramLink(e.target.value)}
                  />
                </div>

                <div className="social-input-group">
                  <label>Facebook</label>
                  <input
                    type="text"
                    placeholder="Paste your Facebook link"
                    value={facebookLink}
                    onChange={(e) => setFacebookLink(e.target.value)}
                  />
                </div>

                <div className="permission-checkbox">
                  <input
                    type="checkbox"
                    id="referral-permission"
                    checked={referralPermission}
                    onChange={(e) => setReferralPermission(e.target.checked)}
                  />
                  <label htmlFor="referral-permission">I give permission for ADHDEAL to share my feedback.</label>
                </div>

                <div className="modal-actions">
                  <button className="cancel-modal-btn" onClick={() => setShowReferralModal(false)}>
                    Cancel
                  </button>
                  <button className="submit-modal-btn">
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
