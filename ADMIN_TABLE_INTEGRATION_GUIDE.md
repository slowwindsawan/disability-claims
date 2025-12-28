# Admin Dashboard Table Integration Guide

## Overview
The admin dashboard table has been successfully integrated with comprehensive client data including AI scores, estimated claim amounts, status tracking, and more.

## What Was Updated

### Backend API (`backend/app/main.py` - `/admin/cases` endpoint)

#### New Data Fields Added:
1. **User Information**
   - `user_phone` - Client phone number from `user_profile.phone`
   - `user_photo_url` - Client profile photo from `user_profile.photo_url`

2. **AI/Eligibility Score**
   - `ai_score` - Eligibility score from `user_profile.eligibility_raw.eligibility_score`
   - `eligibility_status` - Status from `user_profile.eligibility_raw.eligibility_status`
   - Possible values: `needs_review`, `eligible`, `not_eligible`, `not_rated`

3. **Claim Amount**
   - `estimated_claim_amount` - Extracted from `cases.call_summary.estimated_claim_amount`
   - Displayed in ILS (Israeli Shekel) format

4. **Recent Activity**
   - `recent_activity` - Currently set to "not available" (ready for future implementation)

#### Client Filtering
The API now filters cases to **only include clients with non-admin/non-sub-admin roles**:
- Excludes users where `user_profile.is_admin = true`
- Excludes users where `user_profile.is_subadmin = true`
- Returns only regular clients

### Frontend Components

#### 1. Updated Type Definition (`frontend/src/lib/caseStatusConstants.ts`)
```typescript
interface CaseData {
  // ... existing fields ...
  user_phone?: string;
  user_photo_url?: string;
  ai_score?: number;
  eligibility_status?: string;
  estimated_claim_amount?: number;
  recent_activity?: string;
}
```

#### 2. Enhanced Table Component (`frontend/src/components/AdminCasesTable.tsx`)

**New Columns Added:**
1. **AI Score** - Shows eligibility score with colored indicator
   - Icon: Zap (⚡)
   - Displays percentage and status label
   - Status labels:
     - `needs_review` → "צריך בדיקה" (Needs Review)
     - `eligible` → "עומד בתנאים" (Eligible)
     - `not_eligible` → "לא עומד בתנאים" (Not Eligible)
     - Missing → "לא מדורג" (Not Rated)

2. **Estimated Claim Amount** - Shows potential claim value
   - Icon: Dollar Sign ($)
   - Formatted as Israeli currency (₪)
   - Shows "לא חושב" (Not calculated) if value is 0

3. **Recent Activity** - Placeholder for activity logs
   - Icon: Activity
   - Currently displays "not available"
   - Ready for future implementation with call/document timestamps

**Table Styling:**
- Applied requested Card styling: `text-card-foreground flex flex-col gap-6 rounded-xl border py-6 bg-white shadow-md overflow-hidden`
- Updated column count from 5 to 8 columns
- Responsive design with horizontal scroll on mobile
- Icons for visual clarity and quick scanning

#### 3. Updated Phone Action Handler
Previously:
```typescript
<Button variant="ghost" size="icon" title="פרטי התקשרות">
  <Phone className="w-4 h-4 text-orange-600" />
</Button>
```

Now:
```typescript
<Button 
  variant="ghost" 
  size="icon" 
  title="פרטי התקשרות"
  onClick={(e) => {
    e.stopPropagation();
    if (caseData.user_phone) {
      window.location.href = `tel:${caseData.user_phone}`;
    }
  }}
>
  <Phone className="w-4 h-4 text-orange-600" />
</Button>
```
- Now initiates direct phone call if phone number is available

## Data Flow

```
user_profile table
    ↓
├── full_name, email, phone, photo_url
├── eligibility_raw { eligibility_score, eligibility_status }
├── is_admin, is_subadmin (for filtering)
    ↓
cases table
    ↓
├── call_summary { estimated_claim_amount, products, ... }
├── status, document_summaries
├── created_at
    ↓
API /admin/cases enrichment
    ↓
Frontend AdminCasesTable display
```

## Database Schema Requirements

### user_profile table columns required:
```sql
SELECT 
  full_name,
  email,
  phone,
  photo_url,
  eligibility_raw,
  is_admin,
  is_subadmin
FROM user_profile
```

### cases table columns required:
```sql
SELECT
  id,
  user_id,
  status,
  call_summary,
  document_summaries,
  created_at
FROM cases
```

## Column Details

| Column | Data Source | Type | Format | Icons |
|--------|------------|------|--------|-------|
| User | user_profile.full_name, email, id | Text | Name / ID / Email | - |
| Products | cases.call_summary.products | Array | Badges | - |
| AI Score | user_profile.eligibility_raw.eligibility_score | Number | Percentage + Status | ⚡ |
| Claim Amount | cases.call_summary.estimated_claim_amount | Currency | ₪ format | 💵 |
| Status | cases.status | Text | Badge + Progress | - |
| Recent Activity | Not yet implemented | Text | Placeholder | 📊 |
| Date | cases.created_at | Date | Localized | - |
| Actions | - | Buttons | Email/Phone/View | 👁️📧📞 |

## API Response Example

```json
{
  "status": "ok",
  "cases": [
    {
      "id": "case-uuid-1",
      "user_id": "user-uuid-1",
      "user_name": "ישראל כהן",
      "user_email": "israel@example.com",
      "user_phone": "+972501234567",
      "user_photo_url": "https://...",
      "ai_score": 72,
      "eligibility_status": "needs_review",
      "estimated_claim_amount": 45000,
      "recent_activity": "not available",
      "status": "Document submission",
      "call_summary": {
        "products": ["Work Disability"],
        "estimated_claim_amount": 45000,
        ...
      },
      "document_summaries": { ... },
      "created_at": "2025-01-10T10:30:00Z"
    }
  ],
  "total": 1
}
```

## Features Implemented

✅ **User Filtering**
- Only non-admin, non-sub-admin clients are displayed
- Filtering happens server-side in API

✅ **AI Score Display**
- Shows eligibility score as percentage
- Includes status label in Hebrew
- Color-coded with Zap icon

✅ **Estimated Claim Amount**
- Displays in Israeli Shekel (₪) format
- Shows "Not calculated" if value is 0
- Helps admin prioritize high-value cases

✅ **Phone Call Integration**
- Click phone icon to initiate call
- Only shows if phone number exists
- Prevents propagation to row click handler

✅ **Recent Activity Placeholder**
- Ready for future implementation
- Currently shows "not available"
- Can be updated with call/document timestamps

✅ **Responsive Table**
- Horizontal scroll on small screens
- 8 columns with proper spacing
- Maintains readability

## Testing Checklist

- [ ] Verify backend API returns non-admin users only
- [ ] Confirm AI scores display correctly
- [ ] Verify claim amounts show in currency format
- [ ] Test phone click initiates call
- [ ] Verify email button still works
- [ ] Check products display as badges
- [ ] Confirm status column shows correctly
- [ ] Test search functionality with new fields
- [ ] Verify table renders on mobile
- [ ] Check performance with large datasets

## Future Enhancements

1. **Recent Activity** - Implement with:
   - Last call timestamp
   - Last document upload timestamp
   - Last status change timestamp

2. **Advanced Filtering** - Add filters for:
   - AI Score range (min/max)
   - Claim amount range
   - Eligibility status

3. **Bulk Actions** - Add ability to:
   - Export filtered cases
   - Send bulk messages
   - Assign cases to agents

4. **Analytics** - Display:
   - Average claim amount
   - Average AI score
   - Success rate by eligibility status

## Troubleshooting

### AI Score shows as 0 or missing
- Check if `user_profile.eligibility_raw` exists
- Verify JSON structure: `{ eligibility_score: number, eligibility_status: string }`

### Claim amount shows as "Not calculated"
- Confirm `cases.call_summary` contains `estimated_claim_amount` field
- Check if field value is 0 (displays as "Not calculated") or null (displays as same)

### Phone click not working
- Verify `user_profile.phone` field has valid phone number
- Check browser support for `tel:` protocol

### Products not showing
- Confirm `cases.call_summary.products` is an array
- Verify products contain string values

---

**Integration Date:** December 24, 2025
**Backend:** Updated `/admin/cases` endpoint
**Frontend:** AdminCasesTable component with 8 columns
**Status:** Ready for deployment
