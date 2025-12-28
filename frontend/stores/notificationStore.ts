// Notification Store - Simple implementation without external dependencies
import { useState, useEffect, useCallback } from 'react'

interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  timestamp: number
  read: boolean
}

// Simple in-memory store (can be enhanced with localStorage persistence)
let notifications: Notification[] = []
let listeners: Array<() => void> = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

const notificationStore = {
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      read: false,
    }
    notifications = [newNotification, ...notifications]
    emitChange()
  },

  markAsRead(id: string) {
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
    emitChange()
  },

  markAllAsRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }))
    emitChange()
  },

  removeNotification(id: string) {
    notifications = notifications.filter((n) => n.id !== id)
    emitChange()
  },

  clearAll() {
    notifications = []
    emitChange()
  },

  getNotifications() {
    return notifications
  },

  getUnreadCount() {
    return notifications.filter((n) => !n.read).length
  },

  subscribe(listener: () => void) {
    listeners = [...listeners, listener]
    return () => {
      listeners = listeners.filter((l) => l !== listener)
    }
  },
}

// React hook to use the notification store
export function useNotificationStore() {
  const [, forceUpdate] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe(() => {
      forceUpdate({})
    })
    return unsubscribe
  }, [])

  const fetchNotifications = useCallback(async (params?: { limit?: number }) => {
    setLoading(true)
    try {
      // This is a placeholder for fetching notifications from your backend
      // If you want to fetch from backend, import and use authFetch
      // For now, just set loading to false
      setLoading(false)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setLoading(false)
    }
  }, [])

  return {
    notifications: notificationStore.getNotifications(),
    unreadCount: notificationStore.getUnreadCount(),
    loading,
    fetchNotifications,
    addNotification: notificationStore.addNotification,
    markAsRead: notificationStore.markAsRead,
    markAllAsRead: notificationStore.markAllAsRead,
    removeNotification: notificationStore.removeNotification,
    clearAll: notificationStore.clearAll,
  }
}

