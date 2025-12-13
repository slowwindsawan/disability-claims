# Notification System

## Overview
The notification system provides real-time updates to users and admins about important events in the application.

## Architecture

### Database
- **Table**: `notifications`
- **Schema**:
  - `id`: UUID (primary key)
  - `user_id`: UUID (foreign key to user_profile)
  - `type`: Text (notification type identifier)
  - `title`: Text (notification title)
  - `message`: Text (notification message)
  - `data`: JSONB (flexible data storage for notification-specific info)
  - `read`: Boolean (read status)
  - `created_at`: Timestamp with timezone

### Backend (FastAPI)

#### Notification Helpers (`backend/app/supabase_client.py`)
- `create_notification(user_id, notification_type, title, message, data)`: Creates a new notification
- `list_notifications(user_id, limit, unread_only)`: Retrieves notifications for a user
- `mark_notification_read(notification_id, read)`: Updates notification read status
- `get_admin_user_ids()`: Retrieves all admin and superadmin user IDs

#### API Endpoints (`backend/app/main.py`)
- `GET /notifications`: Get notifications for current user
  - Query params: `unread_only` (boolean), `limit` (number)
- `PATCH /notifications/{notification_id}`: Mark notification as read/unread
  - Body: `{ "read": boolean }`

#### Notification Triggers
1. **Case Created**: When a user creates a case
   - Notification type: `case_created`
   - Recipients: The user who created the case
   - Message: "Your case '[case title]' has been created successfully."

2. **Case Submitted**: When a case status changes to 'submitted'
   - Notification type: `case_submitted`
   - Recipients: All admins and superadmins
   - Message: "A new case '[case title]' has been submitted by user [user_id]."

### Frontend (React + TypeScript)

#### API Layer (`src/lib/api.ts`)
- `apiGetNotifications(unreadOnly, limit)`: Fetch notifications
- `apiMarkNotificationRead(notificationId, read)`: Update read status
- `apiMarkAllNotificationsRead()`: Mark all notifications as read

#### State Management (`src/stores/notificationStore.ts`)
- Zustand store managing notification state
- Actions: `fetchNotifications`, `markAsRead`, `markAllAsRead`, `addNotification`, `clearNotifications`
- State: `notifications`, `unreadCount`, `loading`, `error`

#### Components (`src/components/Notifications/`)
1. **NotificationBell**: Bell icon with unread count badge
   - Auto-polls for new notifications every 30 seconds
   - Toggles dropdown on click

2. **NotificationDropdown**: Popup showing notification list
   - Displays notification items
   - "Mark all read" button
   - Click outside to close

3. **NotificationItem**: Individual notification display
   - Shows icon, title, message, and time ago
   - Unread indicator (blue dot)
   - Auto-marks as read on click

## Integration

The notification bell is integrated into the `SideNav` component and appears in both user and admin views.

## Notification Types

Current notification types:
- `case_created`: User notification when their case is created
- `case_submitted`: Admin notification when a case is submitted

### Adding New Notification Types

1. **Backend**: Add notification creation in the relevant endpoint
   ```python
   create_notification(
       user_id=user_id,
       notification_type='your_type',
       title='Your Title',
       message='Your message',
       data={'key': 'value'}  # Optional
   )
   ```

2. **Frontend**: Update `NotificationItem.tsx` to add icon for new type
   ```typescript
   case 'your_type':
     return '🔔'  // Your icon
   ```

## Future Enhancements
- Real-time notifications via WebSocket/SSE
- Email notifications for critical events
- Notification preferences/settings
- Notification grouping/batching
- Notification expiry/cleanup
