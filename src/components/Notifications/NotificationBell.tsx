import React, { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { NotificationDropdown } from './NotificationDropdown'
import './NotificationBell.css'

export const NotificationBell: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { unreadCount, fetchNotifications } = useNotificationStore()

  useEffect(() => {
    // Fetch notifications on mount
    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  return (
    <div className="notification-bell-container">
      <button className="notification-bell-button" onClick={toggleDropdown}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
      
      <NotificationDropdown isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)} />
    </div>
  )
}
