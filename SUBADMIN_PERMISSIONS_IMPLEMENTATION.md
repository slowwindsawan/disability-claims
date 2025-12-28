# Subadmin Management with Permissions - Implementation Guide

## Overview
Fixed the 404 error on `/admin/subadmins` endpoint and added a comprehensive UI for creating subadmins with granular permission selection at creation time.

## What Changed

### Backend Updates

#### 1. Updated Function: `admin_create_subadmin()` in `supabase_client.py`
- Now accepts `permissions` parameter as a **dict** (not list)
- Stores permissions directly in the `admin_permissions` JSONB column in `user_profile`
- Sets `is_subadmin = true` automatically

**Usage:**
```python
admin_create_subadmin(
    email="subadmin@example.com",
    name="John Doe",
    phone="+1234567890",
    password="SecurePassword123!",
    permissions={
        "view_cases": True,
        "edit_cases": True,
        "delete_cases": False,
        "view_documents": True,
        "upload_documents": False,
        ...
    }
)
```

#### 2. New Function: `update_subadmin_permissions()` in `supabase_client.py`
- Updates permissions in the `admin_permissions` JSONB column
- Simple and efficient

**Usage:**
```python
update_subadmin_permissions(
    user_id="uuid-string",
    permissions={
        "view_cases": True,
        "edit_cases": False,
        ...
    }
)
```

#### 3. Endpoint: `POST /admin/subadmins`
**Request:**
```json
{
  "email": "subadmin@example.com",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "password": "SecurePassword123!",
  "admin_permissions": {
    "view_cases": true,
    "edit_cases": true,
    "delete_cases": false,
    "view_documents": true,
    "upload_documents": false,
    "delete_documents": false,
    "view_users": true,
    "edit_users": false,
    "view_reports": true,
    "export_data": false,
    "manage_partners": false,
    "view_financial": false,
    "send_messages": true,
    "manage_forms": false
  }
}
```

**Response:**
```json
{
  "status": "ok",
  "subadmin": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "subadmin@example.com",
    "full_name": "John Doe",
    "role": "subadmin",
    "is_subadmin": true,
    "admin_permissions": { ... },
    "verified": true,
    "created_at": "2024-12-26T..."
  }
}
```

#### 4. Endpoints for Permission Management

**GET `/admin/subadmins/{user_id}/permissions`**
- Retrieves current permissions for a subadmin

**PATCH `/admin/subadmins/{user_id}/permissions`**
- Updates permissions for an existing subadmin
- Request body: `{ "admin_permissions": {...} }`

### Frontend Updates

#### 1. Team Management Page (`frontend/app/admin/team/page.tsx`)

**New Features:**
- **Enhanced Create Modal**: Now includes a "Permissions" section with categorized permission checkboxes
- **Permission Categories**:
  - Cases Management (view, edit, delete)
  - Documents (view, upload, delete)
  - Users (view, edit)
  - Reports & Data (view reports, export data)
  - Partners (manage)
  - Financial (view)
  - Communication (send messages)
  - Forms (manage)

**State Changes:**
```tsx
const [createPermissions, setCreatePermissions] = useState<AdminPermissions>({})
const [editPermissions, setEditPermissions] = useState<AdminPermissions>({})
```

**Form Submission:**
Now includes permissions when creating subadmin:
```tsx
body: JSON.stringify({
  email,
  full_name,
  phone,
  password,
  admin_permissions: createPermissions
})
```

#### 2. UI/UX Improvements
- Create modal expanded to show permissions section
- Scrollable for small screens
- Clear categorization of permissions
- Checkbox toggle for each permission
- Separate form sections for basic info and permissions

## Database Schema

The existing `user_profile` table already has everything we need:

```sql
CREATE TABLE public.user_profile (
  -- ... existing columns ...
  is_subadmin boolean null,
  admin_permissions jsonb null,
  -- ... other columns ...
)
```

**No additional migration needed!**

## Permission Flags

The following permission flags are available in `admin_permissions`:

```typescript
interface AdminPermissions {
  view_cases?: boolean              // View all cases
  edit_cases?: boolean              // Edit case details
  delete_cases?: boolean            // Delete cases
  view_documents?: boolean          // View documents
  upload_documents?: boolean        // Upload documents
  delete_documents?: boolean        // Delete documents
  view_users?: boolean              // View user accounts
  edit_users?: boolean              // Edit user profiles
  view_reports?: boolean            // View reports
  export_data?: boolean             // Export data
  manage_partners?: boolean         // Manage partners
  view_financial?: boolean          // View financial data
  send_messages?: boolean           // Send messages
  manage_forms?: boolean            // Manage forms
}
```

## Workflow

### Creating a Subadmin with Permissions

1. Admin clicks "הוסף תת-מנהל" button
2. Modal opens with two sections:
   - **Basic Info**: Name, email, phone, password
   - **Permissions**: Categorized checkboxes
3. Admin fills in basic info and selects desired permissions
4. Admin clicks "צור תת-מנהל"
5. Frontend sends POST to `/admin/subadmins` with:
   - Basic info fields
   - `admin_permissions` object with boolean values
6. Backend creates Supabase auth user + user_profile record
7. Subadmin is immediately ready with specified permissions

### Editing Subadmin Permissions

1. Admin clicks "ערוך הרשאות" button next to subadmin
2. Modal opens with all permission categories
3. Admin checks/unchecks desired permissions
4. Admin clicks "שמור שינויים"
5. Frontend sends PATCH to `/admin/subadmins/{user_id}/permissions`
6. Permissions updated in `admin_permissions` column

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/manage-subadmins` | List all subadmins (legacy) |
| POST | `/admin/subadmins` | Create subadmin with permissions ✨ |
| POST | `/admin/manage-subadmins` | Create subadmin (legacy) |
| GET | `/admin/subadmins/{user_id}/permissions` | Get subadmin permissions |
| PATCH | `/admin/subadmins/{user_id}/permissions` | Update subadmin permissions |
| PATCH | `/admin/manage-subadmins/{user_id}` | Update subadmin profile |
| DELETE | `/admin/manage-subadmins/{user_id}` | Delete subadmin |

## Testing

### Test Create Subadmin with Permissions
```bash
curl -X POST http://localhost:8000/admin/subadmins \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "phone": "+1234567890",
    "password": "TestPassword123!",
    "admin_permissions": {
      "view_cases": true,
      "edit_cases": true,
      "delete_cases": false,
      "view_documents": true
    }
  }'
```

### Test Get Permissions
```bash
curl -X GET http://localhost:8000/admin/subadmins/{user_id}/permissions \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

### Test Update Permissions
```bash
curl -X PATCH http://localhost:8000/admin/subadmins/{user_id}/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "admin_permissions": {
      "view_cases": true,
      "edit_cases": false,
      "view_documents": true,
      "view_users": true
    }
  }'
```

## Implementation Files Modified

1. **Backend:**
   - `backend/app/supabase_client.py` - Updated `admin_create_subadmin()`, added `update_subadmin_permissions()`
   - `backend/app/main.py` - Added/updated permission endpoints

2. **Frontend:**
   - `frontend/app/admin/team/page.tsx` - Enhanced create modal with permissions UI

3. **Documentation:**
   - This file provides comprehensive implementation details

## Notes

- Passwords are optional; if not provided, a random 16-character token is generated
- Subadmins created this way are automatically email-verified
- All permission values default to `false` if not specified
- The `is_subadmin` flag is automatically set to `true` when creating a subadmin
- The `role` field is automatically set to `'subadmin'`
- Only users with `role='admin'` can create/manage subadmins (enforced by `require_admin()` dependency)

## Backward Compatibility

The legacy `/admin/manage-subadmins` endpoint still works:
- Can create subadmins without permissions
- Can list, update, and delete subadmins as before
- All existing functionality preserved
