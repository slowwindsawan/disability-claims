import React from 'react'
import { Notification } from '../../stores/notificationStore'
import Skeleton from '../Skeleton'

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  const intervals: { [key: string]: number } = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  }
  
  for (const [key, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value)
    if (interval >= 1) {
      return `${interval} ${key}${interval !== 1 ? 's' : ''} ago`
    }
  }
  
  return 'just now'
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onClick?: () => void
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClick
}) => {
  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
    onClick?.()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'case_created':
        return '📄'
      case 'case_submitted':
        return '✅'
      case 'case_updated':
        return '🔄'
      case 'message':
        return '💬'
      default:
        return '🔔'
    }
  }

  return (
    <div
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
    >
      <div className="notification-icon">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="notification-content">
        <div className="notification-header">
          <h4 className="notification-title">{notification.title}</h4>
          {!notification.read && <span className="unread-dot"></span>}
        </div>
        <p className="notification-message">{notification.message}</p>
        <span className="notification-time">
          {formatTimeAgo(notification.created_at)}
        </span>
      </div>
    </div>
  )
}

export const NotificationItemSkeleton: React.FC = () => {
  return (
    <div className={`notification-item skeleton-item`}>
      <div className="notification-icon">
        <Skeleton width={28} height={28} className="avatar-skel" />
      </div>
      <div className="notification-content">
        <div className="notification-header">
          <Skeleton width={'45%'} height={14} />
        </div>
        <div style={{ marginTop: 8 }}>
          <Skeleton width={'90%'} height={12} />
          <div style={{ height: 8 }} />
          <Skeleton width={'30%'} height={10} />
        </div>
      </div>
    </div>
  )
}
