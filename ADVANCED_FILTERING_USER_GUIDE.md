# Advanced Case Filtering - Quick Reference & User Guide

## 🎯 Quick Start

### Opening Advanced Filters
1. Go to Admin Panel → Cases Table
2. Click the **"סינון מתקדם"** (Advanced Filter) button
3. Filter panel expands below the search bar

### Basic Filter Usage

#### 1️⃣ Filter by Status
- Check one or multiple statuses:
  - ✓ Initial questionnaire
  - ✓ Document submission
  - ✓ Submission pending
  - ✓ Submitted
- Cases matching ANY checked status will be returned

#### 2️⃣ Filter by AI Score
- Set minimum score: e.g., 40 (show cases with score ≥ 40)
- Set maximum score: e.g., 80 (show cases with score ≤ 80)
- Both are optional; use alone or together

#### 3️⃣ Filter by Income Potential
- Set minimum amount: e.g., 20000 (show cases with estimated claim ≥ 20000)
- Set maximum amount: e.g., 100000 (show cases with estimated claim ≤ 100000)
- Both are optional; use alone or together

#### 4️⃣ Filter by Dates
- **Start Date**: Cases created on or after this date
- **End Date (Last Updated)**: Cases last updated on or before this date
- Both are optional

#### 5️⃣ Search Within Results
- Type in the search box (top of page)
- Searches by:
  - Client name
  - Client email
  - Case ID
- Case-insensitive search

### Applying Filters

1. **Configure** your desired filters
2. Click **"הפעל סינון"** (Apply Filter) button
3. Wait for results to load
4. Table updates with filtered cases

### Resetting Filters

Click **"אפס סינון"** (Reset Filter) button to:
- Clear all status selections
- Reset AI score ranges
- Clear income potential ranges
- Remove date filters
- Clear search query

---

## 📊 Common Filter Scenarios

### Scenario 1: Find Cases Ready for Review
**Goal:** Find submitted cases with good AI scores

**Filters to use:**
- Status: ☑ Submitted
- Min AI Score: 65
- Apply

### Scenario 2: Find High-Value Cases
**Goal:** Find cases with high estimated claim amounts

**Filters to use:**
- Min Income Potential: 50000
- Max Income Potential: (leave empty for unlimited)
- Apply

### Scenario 3: Find Recent Cases
**Goal:** Find cases created in the last month

**Filters to use:**
- Start Date: (today minus 30 days)
- Apply

### Scenario 4: Find Cases Needing Attention
**Goal:** Find cases stuck in document submission

**Filters to use:**
- Status: ☑ Document submission
- Max AI Score: 50
- Apply

### Scenario 5: Search for Specific Client
**Goal:** Find all cases for a specific client

**Filters to use:**
- Search: "John Doe" (or email/case ID)
- Apply

### Scenario 6: Multi-Criteria Search
**Goal:** Find medium-value submitted cases from last week

**Filters to use:**
- Status: ☑ Submitted
- Min AI Score: 50
- Max AI Score: 80
- Min Income Potential: 20000
- Max Income Potential: 75000
- Start Date: (7 days ago)
- Apply

---

## 💾 Saving Filters

### Save Current Filter for Future Use
1. After applying filters, click **"Save Filter"** button
   - (This feature appears after applying a filter)
2. Enter filter name: e.g., "High Priority Cases"
3. Enter optional description: "Cases with AI score > 70 and amount > 25k"
4. Click Save

### Load Saved Filter
1. In filter panel, look for **"Saved Filters"** dropdown
2. Select from previously saved filters
3. Filter parameters auto-populate
4. Click "Apply" to execute

### Manage Saved Filters
1. Click **"Manage Saved Filters"** button
2. View all your saved filters
3. Edit, delete, or set as default
4. Default filter loads automatically when entering admin panel

---

## 📊 Understanding the Results

### Result Table Columns
| Column | Description |
|--------|-------------|
| **משתמש** (User) | Client name, case ID, email |
| **מוצרים** (Products) | Product types in case |
| **AI Score** | Eligibility score from AI analysis |
| **סכום עתודה משוער** (Estimated Claim) | Potential claim amount (₪) |
| **סטטוס** (Status) | Current case status with progress bar |
| **פעילות אחרונה** (Recent Activity) | Last activity timestamp |
| **תאריך יצירה** (Created Date) | Case creation date |
| **פעולות** (Actions) | View, message, call buttons |

### Status Indicators
- Progress bar shows completion percentage
- Documents count: X/Y (X uploaded, Y required)
- Risk assessment badge (if available)

---

## 🔍 Filter Parameter Reference

### Status Values
```
- Initial questionnaire (שאלון ראשוני)
- Document submission (הגשת מסמכים)
- Submission pending (במתנה להגשה סופית)
- Submitted (הוגש)
```

### AI Score Range
- **Min/Max:** 0-100
- **Typical ranges:**
  - 0-30: Low confidence
  - 30-60: Medium confidence
  - 60-80: High confidence
  - 80-100: Very high confidence

### Income Potential
- **Format:** Numeric (₪)
- **Typical ranges:**
  - Up to 25,000 - Minimal
  - 25,000-75,000 - Moderate
  - 75,000-150,000 - High
  - 150,000+ - Very high

### Dates
- **Format:** YYYY-MM-DD
- **Timezone:** Server timezone
- **Examples:**
  - Start: 2025-01-01
  - End: 2025-01-31

---

## ⚡ Pro Tips

### Tip 1: Combining Filters
Don't be afraid to combine multiple filters for precise results. For example:
- Status + AI Score for quality cases
- Income + Date for recent high-value cases
- Search + Status for specific client status updates

### Tip 2: Range Filters
When using ranges (AI Score, Income), remember:
- **Min only:** "Show all cases from this value up"
- **Max only:** "Show all cases from bottom up to this value"
- **Both:** "Show only cases in this range"

### Tip 3: Search is Global
The search box at the top works on client name, email, and case ID. Use it for quick lookups even without other filters.

### Tip 4: Save Your Common Filters
Save frequently used filter combinations as saved filters. Examples:
- "Daily Review Queue" (Submitted cases)
- "Follow-ups Needed" (Document submission + low AI score)
- "Success Cases" (Submitted + high AI score + high amount)

### Tip 5: Use Date Range Smartly
- Start Date = Oldest case to review
- End Date = Newest case to review
- Together they create a date window

---

## ❌ Troubleshooting

### No Results When Expected
1. Check filter settings are as intended
2. Verify min values are less than max values
3. Check date range (start before end)
4. Try reducing number of statuses selected

### Slow Loading
1. Reduce the result limit (default: 100)
2. Narrow date range
3. Add more specific filters
4. Refresh page

### Filter Not Saving
1. Ensure you're logged in as admin
2. Check browser console for errors
3. Try clearing browser cache
4. Reload page and retry

### Search Not Working
1. Verify client name/email exists in system
2. Check for typos
3. Try partial name matching
4. Use case ID instead if available

---

## 🔐 Important Notes

- **Only admins** can access advanced filtering
- Filters are **user-specific** (admins can't see other admins' saved filters)
- Filters are **read-only** for non-admin users
- Date ranges use **server timezone**
- All searches are **case-insensitive**

---

## 📞 Need Help?

- Hover over any filter label for tooltip
- Check this guide for scenario examples
- Review admin training documentation
- Contact system administrator if issues persist

---

## 🔄 Filter State Flow

```
Select Filters
    ↓
Click "הפעל סינון" (Apply)
    ↓
Backend processes filters
    ↓
Results load in table
    ↓
Review & click on cases to view details
    ↓
Option: Save filter for future use
```

---

**Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Production
