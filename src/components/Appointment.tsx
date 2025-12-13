import './Appointment.css'

interface AppointmentProps {
  onLogout: () => void
  onNavigate: (page: string) => void
}

function Appointment({ onLogout, onNavigate }: AppointmentProps) {
  const upcomingAppointments = [
    {
      title: 'Appointment Title',
      date: 'October 25, 2024, at 3:00 PM',
      doctor: 'Doctor',
      guidelines: [
        'Aliquam et nisl dictum ante ultrices convallis et id arcu.',
        'Vivamus tempus orci euis felis dignissim, et semper sem gravida.',
        'Vestibulum amet vel tortor aliquam fermentum nec eu nisl.',
        'Sed ullamcorper nisl id metus vestibulum mollis.',
        'In interdum ante nec metus vulputate venenatis.'
      ],
      type: 'upcoming',
      showFeedback: false
    },
    {
      title: 'Complete',
      date: 'October 25, 2024, at 3:00 PM',
      doctor: 'Doctor',
      type: 'complete',
      showFeedback: true
    }
  ]

  const completedAppointments = [
    { title: 'Complete', date: 'October 25, 2024, at 3:00 PM' },
    { title: 'Complete', date: 'October 25, 2024, at 3:00 PM' },
    { title: 'Complete', date: 'October 26, 2024, at 3:00 PM' },
    { title: 'Complete', date: 'October 25, 2024, at 3:00 PM' }
  ]

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
            <span>My Case</span>
          </div>
          <div className="sidebar-item active">
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
          <div className="sidebar-item" onClick={() => onNavigate('settings')}>
            <svg className="sidebar-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m6-12h-6m6 6h-6M18 6l-3 3m0 6l3 3M6 18l3-3m0-6L6 6"/>
            </svg>
            <span>Setting</span>
          </div>
        </aside>

        <main className="dash-main">
          <h1 className="appt-title">Appointments</h1>

          <div className="appt-grid">
            {upcomingAppointments.map((appt, index) => (
              <div key={index} className={`appt-card shadow-md ${appt.type === 'complete' ? 'complete' : ''}`}>
                <div className="appt-header">
                  <svg className="appt-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  <h3>{appt.title}</h3>
                  {appt.showFeedback && (
                    <button className="feedback-btn">Give Feedback</button>
                  )}
                </div>
                <p className="appt-subtitle">
                  Your Appointment is scheduled for {appt.date} with {appt.doctor}. We look forward to connecting with you!
                </p>
                {appt.guidelines && (
                  <>
                    <h4 className="guidelines-title">Guidelines for Meeting:</h4>
                    <ul className="guidelines-list">
                      {appt.guidelines.map((guideline, gIndex) => (
                        <li key={gIndex}>{guideline}</li>
                      ))}
                    </ul>
                    <button className="prepare-btn shadow-md">
                      Prepare
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="completed-grid">
            {completedAppointments.map((appt, index) => (
              <div key={index} className="completed-card shadow-md">
                <h4>{appt.title}</h4>
                <p>Appointment Title · {appt.date}</p>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Appointment
