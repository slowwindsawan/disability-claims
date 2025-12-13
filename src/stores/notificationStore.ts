import { create } from 'zustand'
import { apiGetNotifications, apiMarkNotificationRead } from '../lib/api'

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  created_at: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  
  // Actions
  fetchNotifications: (opts?: { unreadOnly?: boolean; type?: string; limit?: number; since?: string; until?: string }) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  addNotification: (notification: Notification) => void
  clearNotifications: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async (opts = {}) => {
    set({ loading: true, error: null })
    try {
      const response = await apiGetNotifications({
        unreadOnly: (opts as any).unreadOnly,
        type: (opts as any).type,
        limit: (opts as any).limit || 50,
        since: (opts as any).since,
        until: (opts as any).until
      })
      const notifications = response.notifications || []
      const unreadCount = notifications.filter((n: Notification) => !n.read).length
      
      set({
        notifications,
        unreadCount,
        loading: false
      })
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error)
      set({
        error: error?.body?.detail || 'Failed to fetch notifications',
        loading: false
      })
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await apiMarkNotificationRead(notificationId, true)
      
      // Update local state
      set(state => {
        const updatedNotifications = state.notifications.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
        const unreadCount = updatedNotifications.filter(n => !n.read).length
        
        return {
          notifications: updatedNotifications,
          unreadCount
        }
      })
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error)
      set({ error: error?.body?.detail || 'Failed to update notification' })
    }
  },

  markAllAsRead: async () => {
    const { notifications } = get()
    const unreadNotifications = notifications.filter(n => !n.read)
    
    try {
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map(n => apiMarkNotificationRead(n.id, true))
      )
      
      // Update local state
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }))
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error)
      set({ error: error?.body?.detail || 'Failed to update notifications' })
    }
  },

  addNotification: (notification: Notification) => {
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1
    }))
  },

  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      error: null
    })
  }
}))
