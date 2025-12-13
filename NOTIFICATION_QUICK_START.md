# Notification System - Quick Start Guide

## Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `backend/db/migrations/002_create_notifications_table.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute the migration
6. Verify the `notifications` table was created in the Table Editor

## Step 2: Test the Backend

### Test Case Creation Notification
```bash
# Create a case as a user (replace with actual user token and data)
curl -X POST http://localhost:8000/cases \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Case",
    "description": "Testing notification",
    "status": "draft"
  }'
```

### Test Notification Retrieval
```bash
# Get notifications for current user
curl -X GET http://localhost:8000/notifications \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

### Test Mark as Read
```bash
# Mark a notification as read (replace NOTIFICATION_ID)
curl -X PATCH http://localhost:8000/notifications/NOTIFICATION_ID \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"read": true}'
```

## Step 3: Test the Frontend

1. **Start the backend**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Start the frontend**:
   ```bash
   cd D:\clients\Disability-claims
   npm run dev
   ```

3. **Test User Flow**:
   - Login as a regular user
   - Look for the bell icon in the left sidebar (near the logout button)
   - Create a new case
   - Click the bell icon
   - You should see a notification: "Your case '[case title]' has been created successfully"
   - Click the notification to mark it as read
   - Verify the unread badge count decreases

4. **Test Admin Flow**:
   - Login as an admin
   - Have a user update a case status to 'submitted'
   - Click the bell icon
   - You should see a notification: "A new case '[case title]' has been submitted"
   - Click "Mark all read" to mark all notifications as read
   - Verify all notifications are marked as read and badge disappears

## Step 4: Verify Auto-Polling

1. Keep the application open
2. Wait 30 seconds (the polling interval)
3. The notification count should auto-update if there are new notifications
4. No manual refresh needed

## Common Issues

### Issue: No notifications appearing
- **Check**: Database migration ran successfully
- **Check**: Backend server is running
- **Check**: Browser console for API errors
- **Check**: User is authenticated (has valid token)

### Issue: Notifications not marking as read
- **Check**: Network tab in browser dev tools for PATCH request
- **Check**: Backend logs for errors
- **Check**: Notification ID is correct

### Issue: Badge count not updating
- **Check**: Zustand store is being used correctly
- **Check**: fetchNotifications is being called
- **Check**: Browser console for React errors

## Notification Types Reference

| Type | Trigger | Recipients | Message |
|------|---------|-----------|---------|
| `case_created` | User creates a case | Case creator | "Your case '[title]' has been created successfully" |
| `case_submitted` | Case status → submitted | All admins | "A new case '[title]' has been submitted by user [user_id]" |

## Adding More Notification Types

1. **Backend**: Add trigger in relevant endpoint
   ```python
   create_notification(
       user_id=user_id,
       notification_type='new_type',
       title='Title',
       message='Message',
       data={'key': 'value'}  # Optional
   )
   ```

2. **Frontend**: Add icon in `NotificationItem.tsx`
   ```typescript
   case 'new_type':
     return '🎨'  // Your icon
   ```

## Support

For detailed documentation, see:
- `NOTIFICATION_SYSTEM_IMPLEMENTATION.md` - Full implementation details
- `src/components/Notifications/README.md` - Component documentation
