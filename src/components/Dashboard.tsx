import { useEffect, useState } from "react";
import { apiGetProfile, apiGetCases } from "../lib/api";
import "./Dashboard.css";
import OnboardingFlow from './Onboarding/OnboardingFlow'
import Skeleton, { SkeletonCard } from './Skeleton'

interface DashboardProps {
  onNavigate: (page: string) => void;
  onSwitchToAdmin?: () => void;
}

function Dashboard({ onNavigate, onSwitchToAdmin }: DashboardProps) {
  const [profile, setProfile] = useState<any | null>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [showInlineOnboarding, setShowInlineOnboarding] = useState(false)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const p: any = await apiGetProfile();
        if (mounted && p?.user) setProfile(p.user);
      } catch (e) {
        console.warn('Failed to load profile', e);
      }
      try {
        const c: any = await apiGetCases();
        const rows = c?.cases || [];
        if (mounted) setCases(rows.slice(0, 6));
      } catch (e: any) {
        console.warn('Failed to load cases', e);
        if (mounted) setError(e?.body?.detail || e?.body || 'Failed to load cases');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    // If a resume payload exists, show onboarding inline
    try {
      const resume = localStorage.getItem('resume_onboarding_step')
      if (resume) setShowInlineOnboarding(true)
    } catch (e) {}

    return () => { mounted = false };
  }, []);

  const handleCreateCase = async () => {
    // Open onboarding at the questionnaire step and do not call backend yet.
    try {
      const resume = { step: 'questionnaire', markEligibilityDone: false } as any;
      try { localStorage.setItem('resume_onboarding_step', JSON.stringify(resume)) } catch (e) {}
      setShowInlineOnboarding(true)
    } catch (err: any) {
      console.error('Failed to start onboarding', err);
      setCreateError(err?.body?.detail || err?.message || 'Failed to start onboarding')
    }
  }

  return (
    <div className="dashboard">

      <div className="dash-container">
        <aside className="sidebar">
          <div className="sidebar-item active">
            <svg
              className="sidebar-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Dashboard</span>
          </div>
          <div className="sidebar-item" onClick={() => onNavigate("mycase")}>
            <svg
              className="sidebar-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span>My Case</span>
          </div>
          <div
            className="sidebar-item"
            onClick={() => onNavigate("appointment")}
          >
            <svg
              className="sidebar-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Appointment</span>
          </div>
          <div className="sidebar-item" onClick={() => onNavigate("payments")}>
            <svg
              className="sidebar-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            <span>Payments</span>
          </div>
          <div className="sidebar-item">
            <svg
              className="sidebar-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <span>Messages</span>
          </div>
          <div className="sidebar-item" onClick={() => onNavigate("settings")}>
            <svg
              className="sidebar-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 6v6m6-12h-6m6 6h-6M18 6l-3 3m0 6l3 3M6 18l3-3m0-6L6 6" />
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="dash-main">
          <div className="welcome-section">
            {loading ? (
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <Skeleton style={{ height: 28, width: '40%' }} />
                <Skeleton style={{ height: 14, width: '60%' }} />
              </div>
            ) : (
              <>
                <h1 className="welcome-title">
                  Welcome, {profile?.full_name || profile?.email || 'there'}!
                  <span className="welcome-subtitle">
                    Here's the latest update on your case.
                  </span>
                </h1>
                <div className="action-buttons">
                  <button className="btn-guide">Video Guide</button>
                  <button className="btn-tutorial">App Tutorial</button>
                </div>
              </>
            )}
          </div>

          <div className="status-card shadow-lg">
            <div className="status-header">
              <h2>Current Case Status:</h2>
              <span className="case-id">Case Number: # 111 222 333</span>
            </div>
            <div className="status-content">
              {loading ? (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <Skeleton style={{ width: 160, height: 160 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ height: 20, width: '60%' }} />
                    <Skeleton style={{ height: 12, width: '80%', marginTop: 8 }} />
                    <Skeleton style={{ height: 12, width: '90%', marginTop: 8 }} />
                  </div>
                </div>
              ) : (
              <div className="progress-circle">
                <svg width="160" height="160" style={{
                  width:"-webkit-fill-available",
                  height:"-webkit-fill-available"
                }} viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="12"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke="#0d7377"
                    strokeWidth="12"
                    strokeDasharray="439.8"
                    strokeDashoffset="88"
                    strokeLinecap="round"
                    transform="rotate(-90 80 80)"
                  />
                </svg>
                <div className="progress-text">
                  <div className="progress-percent">100%</div>
                  <div className="progress-label">
                    Your Case
                    <br />
                    Completed
                  </div>
                </div>
              </div>
              )}
              <div className="profile-setup">
                <h3>Profile Setup</h3>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                  Vestibulum turpis sem, pretium sit amet placerat vel,
                  hendrerit sit nisl. In fringilla orci laoreet, dictum mattus
                  finibus, fringilla diam. In nisl purus, euismod in placerat
                  non, finibus porttitor magna.
                </p>
                <button className="btn-complete-profile">
                  Complete your Profile
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 1 0-16 0" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="tasks-section shadow-md">
            <h3 className="tasks-title">Your next task</h3>
            <div className="task-progress-bar"></div>

            {loading ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <SkeletonCard />
              </div>
            ) : (
            <div className="task-card shadow-md">
              <div className="task-header">
                <span className="task-label">Next Step</span>
              </div>

              <div className="task-item">
                <div className="task-info">
                  {cases.length > 0 ? (
                    <>
                      <h4>{cases[0].title || 'Continue your case'}</h4>
                      <p>{cases[0].description || 'Open your most recent case to continue onboarding or upload documents.'}</p>
                    </>
                  ) : (
                    <>
                      <h4>No active cases</h4>
                      <p>Create a new case to get started with your claim.</p>
                    </>
                  )}
                </div>
                <div className="task-actions">
                  <button className="btn-primary" onClick={() => onNavigate('mycase')}>My Cases</button>
                  <button className="btn-secondary" onClick={() => handleCreateCase()}>Add Case</button>
                  {createError && (
                    <div className="text-sm text-red-700 ml-3">{createError}</div>
                  )}
                </div>
              </div>
            </div>
            )}
          </div>
          
          {/* Full-screen onboarding overlay when resuming from a case */}
          {showInlineOnboarding && (
            <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 backdrop-blur-sm">
              <div className="relative w-full h-full max-w-full">
                <div className="absolute top-4 left-4">
                  <button
                    className="text-sm px-3 py-2 rounded border bg-white/90"
                    onClick={() => {
                      // Ask for confirmation before quitting
                      const ok = window.confirm('Quit onboarding? You can return later and continue where you left off. Press OK to quit and go back to My Cases.')
                      if (ok) {
                        // keep resume key so user can resume later
                        setShowInlineOnboarding(false)
                        onNavigate('mycase')
                      }
                    }}
                  >
                    Quit &amp; Return to My Cases
                  </button>
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <div className="text-sm text-white/90">You can quit anytime and resume later.</div>
                </div>

                <div className="h-full overflow-auto">
                  <OnboardingFlow onComplete={() => { setShowInlineOnboarding(false); onNavigate('dashboard') }} />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
