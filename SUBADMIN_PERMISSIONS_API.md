# Subadmin Management API - Updated Endpoints

## Overview
Added new `/admin/subadmins` endpoint for creating subadmins with granular permission selection, plus endpoints for managing subadmin permissions.

## Endpoints

### 1. Create Subadmin with Permissions
**Endpoint:** `POST /admin/subadmins`  
**Authentication:** Requires admin role  
**Description:** Create a new subadmin account with selectable permissions

**Request Body:**
```json
{
  "email": "subadmin@example.com",
  "name": "John Doe",
  "phone": "+1234567890",
  "password": "StrongPassword123!",
  "permissions": [
    {
      "name": "manage_users",
      "description": "Can manage user accounts"
    },
    {
      "name": "view_reports",
      "description": "Can view system reports"
    },
    {
      "name": "manage_cases",
      "description": "Can manage user cases"
    }
  ]
}
```

**Response (Success):**
```json
{
  "status": "ok",
  "subadmin": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "subadmin@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "role": "subadmin",
    "permissions": [
      {"name": "manage_users", "description": "Can manage user accounts"},
      {"name": "view_reports", "description": "Can view system reports"},
      {"name": "manage_cases", "description": "Can manage user cases"}
    ],
    "verified": true,
    "created_at": "2024-12-26T10:00:00Z"
  }
}
```

### 2. Get Subadmin Permissions
**Endpoint:** `GET /admin/subadmins/{user_id}/permissions`  
**Authentication:** Requires admin role  
**Description:** Retrieve all permissions assigned to a specific subadmin

**Response:**
```json
{
  "status": "ok",
  "permissions": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "permission_name": "manage_users",
      "description": "Can manage user accounts",
      "created_at": "2024-12-26T10:00:00Z"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "permission_name": "view_reports",
      "description": "Can view system reports",
      "created_at": "2024-12-26T10:00:00Z"
    }
  ]
}
```

### 3. Update Subadmin Permissions
**Endpoint:** `PATCH /admin/subadmins/{user_id}/permissions`  
**Authentication:** Requires admin role  
**Description:** Update the permissions assigned to a subadmin

**Request Body:**
```json
{
  "permissions": [
    {
      "name": "manage_users",
      "description": "Can manage user accounts"
    },
    {
      "name": "view_reports",
      "description": "Can view system reports"
    },
    {
      "name": "manage_cases",
      "description": "Can manage user cases"
    },
    {
      "name": "delete_cases",
      "description": "Can delete cases"
    }
  ]
}
```

**Response:**
```json
{
  "status": "ok",
  "result": {
    "status": "ok"
  }
}
```

## Legacy Endpoints (Still Supported)
- `GET /admin/manage-subadmins` - List all subadmins
- `POST /admin/manage-subadmins` - Create subadmin (without permissions)
- `PATCH /admin/manage-subadmins/{user_id}` - Update subadmin profile
- `DELETE /admin/manage-subadmins/{user_id}` - Delete subadmin

## Database Schema

### New Table: `subadmin_permissions`
```sql
CREATE TABLE public.subadmin_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profile(user_id) ON DELETE CASCADE,
  permission_name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission_name)
);
```

### Updated: `user_profile` Table
Added new column:
```sql
ALTER TABLE public.user_profile
ADD COLUMN permissions jsonb DEFAULT '[]'::jsonb;
```

## Available Permissions (Examples)
You can use any permission names suitable for your application:
- `manage_users` - User account management
- `view_reports` - View system reports
- `manage_cases` - Case management
- `delete_cases` - Case deletion
- `view_documents` - View case documents
- `sign_documents` - Sign documents
- `manage_payments` - Payment management
- `view_analytics` - Analytics access
- `manage_subadmins` - Subadmin management

## Implementation Notes
1. Password is optional; if not provided, a random 16-character token is generated
2. Permissions are stored in both the `user_profile.permissions` JSONB field and the `subadmin_permissions` table
3. Only admins can create/manage subadmins
4. The endpoint validates that the request includes an email address
5. The `require_admin` dependency ensures only admin users can access these endpoints

## Migration Required
Run the migration to create the permissions table:
```bash
# The migration file is at:
# backend/db/migrations/011_create_subadmin_permissions_table.sql
```

Execute it in your Supabase SQL editor or via psql.
