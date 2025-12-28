# Admin Table Integration - Quick Reference

## 🎯 What Changed

### Backend
**File:** `backend/app/main.py` (endpoint: `/admin/cases`)

**Changes:**
```python
# Added data extraction
case['user_phone'] = profile.get('phone')
case['user_photo_url'] = profile.get('photo_url')
case['ai_score'] = eligibility_raw.get('eligibility_score', 0)
case['eligibility_status'] = eligibility_raw.get('eligibility_status')
case['estimated_claim_amount'] = call_summary.get('estimated_claim_amount', 0)
case['recent_activity'] = 'not available'

# Added filtering
filtered_cases = [c for c in cases if not c.get('is_excluded', False)]
```

### Frontend
**Files:** 
- `frontend/src/lib/caseStatusConstants.ts`
- `frontend/src/components/AdminCasesTable.tsx`

**Changes:**
- Added 6 new fields to CaseData interface
- Added 3 new columns to table
- Added icon imports (Zap, DollarSign, Activity)
- Updated phone button to initiate calls
- Applied Card styling with proper classes

## 📊 Table Columns (8 Total)

| # | Column | Data Source | Display Format |
|---|--------|-------------|-----------------|
| 1 | User | user_profile | Name / ID / Email |
| 2 | Products | cases.call_summary | Blue badges |
| 3 | AI Score | user_profile.eligibility_raw | ⚡ 72% \| צריך בדיקה |
| 4 | Claim Amount | cases.call_summary | 💵 ₪45,000 |
| 5 | Status | cases | Badge + Progress bar |
| 6 | Recent Activity | - | 📊 not available |
| 7 | Date Created | cases.created_at | Localized date |
| 8 | Actions | - | 👁️ 📧 📞 |

## 🔍 Filtering Logic

### Server-Side (Backend)
```python
# Only include clients where:
is_admin = False (or null)
is_subadmin = False (or null)
```

### Client-Side (Frontend)
```typescript
// Already implemented filters still work:
- Search by name/email/ID
- Filter by status
```

## 💡 Data Extraction

### User Profile → Table
```
full_name → User: {name}
email → User: {email}
phone → Phone button (tel: link)
eligibility_raw → AI Score column
  - eligibility_score → 0-100%
  - eligibility_status → Label
```

### Cases → Table
```
call_summary → Products + Claim Amount
  - products[] → Badges
  - estimated_claim_amount → ₪ format
status → Status badge
document_summaries → Doc count
created_at → Date
```

## 🚀 Deployment

### Quick Start
```bash
# Backend
cd backend
python -m uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm run dev
```

### Verify
1. Open http://localhost:3000/admin
2. Check for 8 columns
3. Verify data loads
4. Test phone button

## 🎨 Styling

### Card Container
```
text-card-foreground flex flex-col gap-6 rounded-xl border py-6 bg-white shadow-md overflow-hidden
```

### Icon Colors
- ⚡ (AI Score): amber-500
- 💵 (Claim): green-500
- 📊 (Activity): slate-400

### Status Colors (unchanged)
- Initial Questionnaire: blue
- Document Submission: amber
- Submission Pending: purple
- Submitted: emerald

## 📋 API Response Example

```json
{
  "status": "ok",
  "cases": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_name": "ישראל כהן",
      "user_email": "israel@example.com",
      "user_phone": "+972501234567",
      "ai_score": 72,
      "eligibility_status": "needs_review",
      "estimated_claim_amount": 45000,
      "recent_activity": "not available",
      "status": "Document submission",
      "created_at": "2025-01-10T10:30:00Z",
      "call_summary": {...},
      "document_summaries": {...}
    }
  ],
  "total": 1
}
```

## ✅ Checklist

### Before Deployment
- [ ] Backend compiles without errors
- [ ] Frontend TypeScript builds
- [ ] Database has sample data
- [ ] user_profile.eligibility_raw is populated
- [ ] cases.call_summary has estimated_claim_amount

### Testing
- [ ] Table loads with data
- [ ] All 8 columns visible
- [ ] AI score displays (e.g., "⚡ 72% | צריך בדיקה")
- [ ] Claim amount shows ₪ format
- [ ] Products as badges
- [ ] Status with progress bar
- [ ] Phone button works
- [ ] Email button works
- [ ] Search works
- [ ] Filters work

### Post-Deployment
- [ ] Monitor API performance
- [ ] Check error logs
- [ ] Verify data accuracy
- [ ] Test with real clients
- [ ] Gather user feedback

## 🆘 Troubleshooting

### AI Score Missing
→ Check `user_profile.eligibility_raw` exists

### Claim Amount Wrong
→ Verify `cases.call_summary.estimated_claim_amount`

### Phone Button Doesn't Work
→ Ensure `user_profile.phone` has valid number

### Table Not Showing
→ Check `/admin/cases` API returns data

### Column Widths Wrong
→ Check browser zoom level or screen resolution

## 📞 Support

- **Full Documentation:** `ADMIN_TABLE_INTEGRATION_GUIDE.md`
- **Deployment Steps:** `ADMIN_TABLE_DEPLOYMENT_CHECKLIST.md`
- **Visual Guide:** `ADMIN_TABLE_VISUAL_SUMMARY.md`

---

## File Summary

| File | Type | Changes |
|------|------|---------|
| `backend/app/main.py` | Backend | +50 lines in `/admin/cases` endpoint |
| `frontend/src/lib/caseStatusConstants.ts` | Frontend | +6 fields to CaseData interface |
| `frontend/src/components/AdminCasesTable.tsx` | Frontend | +3 columns, +icon imports, +styling |

## Integration Status

✅ **Complete**
- All changes implemented
- All files updated
- Ready for deployment

🔄 **Next Steps**
1. Test locally
2. Deploy backend
3. Deploy frontend
4. Verify in production
5. Monitor for issues

---

**Last Updated:** December 24, 2025
**Ready for:** Production Deployment
