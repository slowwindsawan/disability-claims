import { useState } from 'react'
import './AdminCalendar.css'

interface AdminCalendarProps {
  onLogout: () => void
  onNavigate: (page: string) => void
  onSwitchToUser: () => void
}

interface CalendarEvent {
  date: number
  time: string
  title: string
  color: string
}

function AdminCalendar({ onLogout, onNavigate, onSwitchToUser }: AdminCalendarProps) {
  const [activeMenu, setActiveMenu] = useState('calendar')
  const [selectedMonth, setSelectedMonth] = useState('November')
  const [selectedYear, setSelectedYear] = useState('2024')

  const events: CalendarEvent[] = [
    { date: 5, time: '13:00 GMT time', title: '', color: '#000' },
    { date: 8, time: '08:00 PM time', title: '', color: '#16a34a' },
    { date: 8, time: '13:00 GMT time', title: '', color: '#16a34a' },
    { date: 11, time: '14:00 GMT time', title: '', color: '#ef4444' },
    { date: 11, time: '10:00 GMT time', title: '', color: '#ef4444' },
    { date: 18, time: '14:00 User here', title: '', color: '#16a34a' },
    { date: 18, time: '07:00 GMT time', title: '', color: '#f97316' },
    { date: 21, time: '14:00 GMT here', title: '', color: '#f97316' },
    { date: 21, time: '13:00 GMT time', title: '', color: '#f97316' },
    { date: 24, time: '14:00 GMT time', title: '', color: '#f97316' },
    { date: 24, time: '13:00 GMT time', title: '', color: '#f97316' },
    { date: 24, time: '13:00 GMT time', title: '', color: '#16a34a' }
  ]

  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

  const calendarDays = [
    { date: 29, isCurrentMonth: false },
    { date: 30, isCurrentMonth: false },
    { date: 1, isCurrentMonth: true },
    { date: 2, isCurrentMonth: true },
    { date: 3, isCurrentMonth: true },
    { date: 4, isCurrentMonth: true },
    { date: 5, isCurrentMonth: true },
    { date: 6, isCurrentMonth: true },
    { date: 7, isCurrentMonth: true },
    { date: 8, isCurrentMonth: true },
    { date: 9, isCurrentMonth: true },
    { date: 10, isCurrentMonth: true },
    { date: 11, isCurrentMonth: true },
    { date: 12, isCurrentMonth: true },
    { date: 13, isCurrentMonth: true },
    { date: 14, isCurrentMonth: true },
    { date: 15, isCurrentMonth: true },
    { date: 16, isCurrentMonth: true },
    { date: 17, isCurrentMonth: true },
    { date: 18, isCurrentMonth: true },
    { date: 19, isCurrentMonth: true },
    { date: 20, isCurrentMonth: true },
    { date: 21, isCurrentMonth: true },
    { date: 22, isCurrentMonth: true },
    { date: 23, isCurrentMonth: true },
    { date: 24, isCurrentMonth: true },
    { date: 25, isCurrentMonth: true },
    { date: 26, isCurrentMonth: true },
    { date: 27, isCurrentMonth: true },
    { date: 28, isCurrentMonth: true },
    { date: 29, isCurrentMonth: true },
    { date: 30, isCurrentMonth: true },
    { date: 31, isCurrentMonth: true },
    { date: 1, isCurrentMonth: false },
    { date: 2, isCurrentMonth: false }
  ]

  const getEventsForDate = (date: number) => {
    return events.filter(event => event.date === date)
  }

  return (
    <div className="admin-calendar-page">

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
            onClick={() => setActiveMenu('calendar')}
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

        <main className="admin-cal-main">
          

          <div className="admin-cal-header">
            <h2>September 2024</h2>
            <div className="admin-cal-controls">
              <select
                className="admin-cal-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option>January</option>
                <option>February</option>
                <option>March</option>
                <option>April</option>
                <option>May</option>
                <option>June</option>
                <option>July</option>
                <option>August</option>
                <option>September</option>
                <option>October</option>
                <option>November</option>
                <option>December</option>
              </select>
              <select
                className="admin-cal-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option>2023</option>
                <option>2024</option>
                <option>2025</option>
              </select>
            </div>
          </div>

          <div className="admin-cal-grid">
            <div className="admin-cal-weekdays">
              {daysOfWeek.map(day => (
                <div key={day} className="admin-cal-weekday">{day}</div>
              ))}
            </div>

            <div className="admin-cal-days">
              {calendarDays.map((day, idx) => {
                const dayEvents = day.isCurrentMonth ? getEventsForDate(day.date) : []
                const isToday = day.date === 10 && day.isCurrentMonth

                return (
                  <div
                    key={idx}
                    className={`admin-cal-day ${!day.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <div className="admin-cal-day-number">{day.date}</div>
                    <div className="admin-cal-events">
                      {dayEvents.map((event, eventIdx) => (
                        <div
                          key={eventIdx}
                          className="admin-cal-event"
                          style={{ backgroundColor: event.color }}
                        >
                          {event.time}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminCalendar
