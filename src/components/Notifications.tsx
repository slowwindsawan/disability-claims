import './Notifications.css'
import React, { useEffect, useState } from 'react'
import { useNotificationStore } from '../stores/notificationStore'
import { NotificationItem } from './Notifications/NotificationItem'
import Skeleton, { SkeletonCard } from './Skeleton'
import { NotificationItemSkeleton } from './Notifications/NotificationItem'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { Bell, BellDotIcon, BellRingIcon } from 'lucide-react'

interface NotificationsProps {
  onNavigate: (page: string) => void
}

function Notifications(_: NotificationsProps) {
  const navigate = useNavigate()
  const isAdminView = useAuthStore(state => state.isAdminView)
  const { notifications, loading, unreadCount, fetchNotifications, markAsRead, markAllAsRead, error } = useNotificationStore()
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false)

  useEffect(() => {
    // fetch with current filters
    fetchNotifications({ unreadOnly, type: typeFilter })
  }, [fetchNotifications, unreadOnly, typeFilter])

  return (
    <div className="dashboard">
      <div className="dash-container">
        <main className="notifications-main">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="notifications-title flex items-center"><BellRingIcon className='mr-2 text-orange-600' size={26}/>Notifications</h2>
            {unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead} style={{ marginLeft: '12px' }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />
              <span>Unread only</span>
            </label>

            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>Type:</span>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="">All</option>
                <option value="case_created">Case Created</option>
                <option value="case_submitted">Case Submitted</option>
                <option value="message">Message</option>
              </select>
            </label>
          </div>

          <div className="notifications-list">
            {loading ? (
              // show 6 compact notification item skeletons while loading
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <NotificationItemSkeleton />
                </div>
              ))
            ) : error ? (
              <div className="notification-error">
                <p>Error: {error}</p>
                <button onClick={() => fetchNotifications({ unreadOnly, type: typeFilter })}>Retry</button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map((n: any) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkAsRead={markAsRead}
                  onClick={() => {
                    // navigate based on notification payload
                    try {
                      if (n?.data?.case_id && n?.data?.user_id && isAdminView) {
                        navigate(`/admin/user/${n.data.user_id}/case/${n.data.case_id}`)
                        return
                      }
                      // default for regular users: go to My Cases
                      navigate('/mycase')
                    } catch (e) {
                      console.warn('Navigation failed for notification', e)
                    }
                  }}
                />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Notifications
