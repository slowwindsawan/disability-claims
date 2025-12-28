# Subadmin Permissions - Visual Implementation Guide

## UI Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Admin Dashboard - Team Management Page                     │
│  /admin/team                                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
           [List Subadmins]      [+ הוסף תת-מנהל]
                    │                   │
                    ▼                   ▼
          ┌─────────────────┐   ┌──────────────────────────┐
          │ SubAdmins List  │   │ Create SubAdmin Modal    │
          │ ─────────────── │   │ ────────────────────────│
          │ • Name          │   │ 📋 Basic Info Section:  │
          │ • Email         │   │ ├─ Full Name            │
          │ • Created Date  │   │ ├─ Email                │
          │ • [Edit] [Del]  │   │ ├─ Phone (optional)     │
          └─────────────────┘   │ └─ Password             │
                    ▲           │                         │
                    │           │ 🔐 Permissions Section: │
                    │           │ ├─ Cases Management     │
                    └───────────┤│  ├─ View Cases ☐      │
                    [Edit Perms] │  ├─ Edit Cases ☐      │
                                 │  └─ Delete Cases ☐    │
                                 │ ├─ Documents          │
                                 │ │  ├─ View ☐          │
                                 │ │  ├─ Upload ☐        │
                                 │ │  └─ Delete ☐        │
                                 │ ├─ Users              │
                                 │ ├─ Reports & Data     │
                                 │ ├─ Partners           │
                                 │ ├─ Financial          │
                                 │ └─ Communication      │
                                 │                         │
                                 │ [Cancel]  [צור תת-מנהל]│
                                 └──────────────────────────┘
```

## Component Architecture

```
TeamManagement Component
├── State Management
│   ├── subAdmins[] - list of all subadmins
│   ├── formData - basic info for creation
│   ├── createPermissions - selected permissions for new subadmin
│   ├── editPermissions - selected permissions for editing
│   ├── showAddModal - show/hide create modal
│   └── showEditModal - show/hide edit modal
│
├── Sidebar Navigation
│   ├── Dashboard
│   ├── Team Management (active)
│   ├── QA Console
│   ├── Advanced Filters
│   ├── Analytics
│   └── Settings
│
├── Main Content Area
│   ├── Header
│   │   ├── Title: "ניהול צוות והרשאות"
│   │   └── [+ הוסף תת-מנהל] button
│   │
│   ├── SubAdmins List Card
│   │   └── For each subadmin:
│   │       ├── Avatar + Name
│   │       ├── Email + Phone
│   │       ├── Created Date
│   │       └── [ערוך הרשאות] [Delete] buttons
│   │
│   └── Permissions Reference Card
│       └── Display all available permissions
│
├── Add SubAdmin Modal
│   ├── Basic Info Section
│   │   ├── Full Name Input
│   │   ├── Email Input
│   │   ├── Phone Input
│   │   └── Password Input
│   │
│   ├── Permissions Section (scrollable)
│   │   ├── Cases Management Category
│   │   │   ├── View Cases [☐]
│   │   │   ├── Edit Cases [☐]
│   │   │   └── Delete Cases [☐]
│   │   │
│   │   ├── Documents Category
│   │   │   ├── View Documents [☐]
│   │   │   ├── Upload Documents [☐]
│   │   │   └── Delete Documents [☐]
│   │   │
│   │   ├── Users Category
│   │   │   ├── View Users [☐]
│   │   │   └── Edit Users [☐]
│   │   │
│   │   ├── Reports & Data Category
│   │   │   ├── View Reports [☐]
│   │   │   └── Export Data [☐]
│   │   │
│   │   ├── Partners Category
│   │   │   └── Manage Partners [☐]
│   │   │
│   │   ├── Financial Category
│   │   │   └── View Financial Data [☐]
│   │   │
│   │   ├── Communication Category
│   │   │   └── Send Messages [☐]
│   │   │
│   │   └── Forms Category
│   │       └── Manage Forms [☐]
│   │
│   └── Action Buttons
│       ├── [ביטול] (Cancel)
│       └── [צור תת-מנהל] (Create SubAdmin)
│
└── Edit Permissions Modal
    ├── Selected SubAdmin Info
    ├── Same Permission Categories
    └── Action Buttons
        ├── [ביטול]
        └── [שמור שינויים]
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ USER: Admin Opens Create Modal and Selects Permissions      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ Frontend Form     │
                    │ ─────────────────│
                    │ formData: {...}   │
                    │ createPermissions │
                    │ {                 │
                    │  view_cases: true │
                    │  edit_cases: true │
                    │  ...              │
                    │ }                 │
                    └─────────┬─────────┘
                              │
            ┌─────────────────▼─────────────────┐
            │ POST /admin/subadmins              │
            │ ─────────────────────────────────│
            │ {                                 │
            │   "email": "...",                 │
            │   "full_name": "...",             │
            │   "phone": "...",                 │
            │   "password": "...",              │
            │   "admin_permissions": {          │
            │     "view_cases": true,           │
            │     "edit_cases": true,           │
            │     ...                           │
            │   }                               │
            │ }                                 │
            └─────────────────┬─────────────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │ Backend: main.py           │
                    │ ────────────────────────── │
                    │ create_subadmin_with_      │
                    │ permissions() handler      │
                    │                            │
                    │ Validates admin role ✓     │
                    │ Extracts payload ✓         │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │ Backend: supabase_client   │
                    │ ───────────────────────── │
                    │ admin_create_subadmin(     │
                    │   email, name,             │
                    │   phone, password,         │
                    │   permissions={...}        │
                    │ )                          │
                    └─────────────┬──────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
    ┌──────────┐          ┌──────────────┐        ┌──────────────┐
    │ Supabase │          │ Supabase     │        │ Supabase     │
    │ Auth API │          │ PostgREST    │        │ Database     │
    │ ─────── │          │ ─────────    │        │ ──────────  │
    │ Create  │          │ POST user_   │        │ Inserts:    │
    │ Auth    │          │ profile      │        │ - user_id   │
    │ User    │          │              │        │ - email     │
    │ ✓       │          │ {            │        │ - role:     │
    └──────────┘          │  user_id,    │        │   'subadmin'│
        │                 │  full_name,  │        │ - is_subadmin│
        └─────────────────│  email,      │        │ - admin_    │
                          │  phone,      │        │   permissions
                          │  role:       │        │ ✓           │
                          │  'subadmin', │        └──────────────┘
                          │  is_subadmin:│
                          │  true,       │
                          │  admin_      │
                          │  permissions │
                          │ }            │
                          │ ✓            │
                          └──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │ Return Response            │
                    │ ──────────────────────────│
                    │ {                          │
                    │   "status": "ok",          │
                    │   "subadmin": {            │
                    │     "id": "uuid",          │
                    │     "user_id": "uuid",     │
                    │     "email": "...",        │
                    │     "admin_permissions": { │
                    │       ...                  │
                    │     }                      │
                    │   }                        │
                    │ }                          │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │ Frontend: Response Handle  │
                    │ ──────────────────────────│
                    │ • Reset form               │
                    │ • Close modal              │
                    │ • Fetch updated list       │
                    │ • Show success message     │
                    └─────────────┬──────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │ Frontend: List Updated     │
                    │ ──────────────────────────│
                    │ Display new subadmin with  │
                    │ permissions shown in UI    │
                    └────────────────────────────┘
```

## Permission Transmission

### Request Format
```json
{
  "email": "subadmin@example.com",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "password": "SecurePass123!",
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

### Database Storage (JSONB)
```
user_profile.admin_permissions:
{
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
```

## State Management Flow

```
┌────────────────────────────────────────────────┐
│ Initial State                                  │
├────────────────────────────────────────────────┤
│ formData = {                                   │
│   full_name: "",                               │
│   email: "",                                   │
│   phone: "",                                   │
│   password: ""                                 │
│ }                                              │
│ createPermissions = {}                         │
│ subAdmins = []                                 │
│ showAddModal = false                           │
└────────────────────────────────────────────────┘
                    │
                    │ User clicks "+ הוסף תת-מנהל"
                    ▼
┌────────────────────────────────────────────────┐
│ showAddModal = true                            │
│ Form and permissions displayed                 │
└────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
   [Fill Name]  [Fill Email] [Fill Phone]
        │           │           │
        └───────────┴───────────┘
                    │
        ┌───────────▼───────────┐
        │ Select Permissions:   │
        │ • Check view_cases    │
        │ • Check edit_cases    │
        │ • Check send_messages │
        └───────────┬───────────┘
                    │
        ┌───────────▼──────────────────┐
        │ createPermissions = {         │
        │   view_cases: true,           │
        │   edit_cases: true,           │
        │   send_messages: true,        │
        │   ... (others false)          │
        │ }                             │
        └───────────┬──────────────────┘
                    │
            [צור תת-מנהל] button
                    │
                    ▼
        handleCreateSubAdmin() called
                    │
            ┌───────▼──────┐
            │ POST Request │
            │ to Backend   │
            └───────┬──────┘
                    │
            ┌───────▼──────────────┐
            │ Response: success ✓  │
            └───────┬──────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    [Close Modal] [Reset Form] [Fetch List]
        │           │           │
        │     formData = {}     │
        │     createPermissions │
        │      = {}             │
        └───────────┼───────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │ showAddModal = false      │
        │ subAdmins = [new item]    │
        │ UI Updated               │
        └──────────────────────────┘
```

## Permission Edit Flow

```
User clicks [ערוך הרשאות]
        │
        ▼
┌──────────────────────────────┐
│ openEditModal(subAdmin)      │
├──────────────────────────────┤
│ • selectedSubAdmin = subAdmin │
│ • editPermissions = current   │
│   admin_permissions           │
│ • showEditModal = true        │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Edit Permissions Modal       │
│ shows current selections     │
└──────────────────────────────┘
        │
  [Modify selections]
        │
        ▼
┌──────────────────────────────┐
│ editPermissions updated       │
└──────────────────────────────┘
        │
 [שמור שינויים] button
        │
        ▼
┌──────────────────────────────┐
│ handleUpdatePermissions()    │
├──────────────────────────────┤
│ PATCH /admin/subadmins/      │
│       {user_id}/permissions  │
│ { admin_permissions: {...} } │
└──────────────────────────────┘
        │
        ▼
┌──────────────────────────────┐
│ Response: 200 OK ✓           │
└──────────────────────────────┘
        │
   [Close Modal]
   [Fetch List]
        │
        ▼
┌──────────────────────────────┐
│ Permissions Updated in DB    │
│ UI Reflects Changes          │
└──────────────────────────────┘
```

## Key Components Summary

| Component | Location | Purpose |
|-----------|----------|---------|
| Team Management Page | `frontend/app/admin/team/page.tsx` | Main admin interface |
| SubAdmin Interface | Frontend types | Defines subadmin data structure |
| AdminPermissions Interface | Frontend types | Defines permission flags |
| Permission List | `allPermissions[]` | Master list of all available permissions |
| Create Modal | Frontend component | UI for creating new subadmin |
| Edit Modal | Frontend component | UI for editing permissions |
| Sidebar | Frontend component | Navigation |
| SubAdmin List Card | Frontend component | Display existing subadmins |
| Create Endpoint | `backend/app/main.py` | POST /admin/subadmins |
| List Endpoint | `backend/app/main.py` | GET /admin/subadmins |
| Permission Endpoints | `backend/app/main.py` | GET/PATCH permissions |
| Create Function | `backend/app/supabase_client.py` | Admin create logic |
| Update Function | `backend/app/supabase_client.py` | Permission update logic |

This comprehensive implementation ensures admins can easily create subadmins with granular permission controls from a single, intuitive UI.
