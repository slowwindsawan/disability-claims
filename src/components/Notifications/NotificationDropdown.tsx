import React, { useEffect, useRef } from 'react'
import { useNotificationStore } from '../../stores/notificationStore'
import { NotificationItem } from './NotificationItem'
import './NotificationDropdown.css'
import Skeleton from '../Skeleton'

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ isOpen, onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { notifications, loading, markAsRead, markAllAsRead, fetchNotifications } = useNotificationStore()

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <div className="notification-header">
        <h3>Notifications</h3>
        {notifications.length > 0 && (
          <button className="mark-all-read" onClick={markAllAsRead}>
            Mark all read
          </button>
        )}
      </div>
      
      <div className="notification-list">
        {loading ? (
          // show compact skeletons instead of plain text
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: '8px 0' }}>
              <Skeleton style={{ height: 12, width: '70%' }} />
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
              onClick={onClose}
            />
          ))
        )}
      </div>
    </div>
  )
}
