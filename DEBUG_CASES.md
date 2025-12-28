# Debugging: apiGetCases returning empty

## Quick Debug Steps

1. **Check current user ID:**
   - Open browser DevTools (F12)
   - Go to Application > Local Storage
   - Find `access_token` value
   - Go to Console and run:
   ```javascript
   const token = localStorage.getItem('access_token')
   fetch('http://localhost:5000/me', {
     headers: { 'Authorization': `Bearer ${token}` }
   }).then(r => r.json()).then(d => console.log(d))
   ```
   - Note the `user.id` value

2. **Check what /cases returns:**
   - In the Console, run:
   ```javascript
   const token = localStorage.getItem('access_token')
   fetch('http://localhost:5000/cases', {
     headers: { 'Authorization': `Bearer ${token}` }
   }).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
   ```
   - Look at the `cases` array length

3. **Check database directly:**
   - Go to Supabase console (https://app.supabase.com)
   - Find the `cases` table
   - Check which `user_id` values are in the `user_id` column
   - Compare with the `user.id` from step 1

## Common Issues

- **Cases table is empty**: Check if cases were created properly
- **user_id mismatch**: Case exists but with a different user_id
- **Auth token expired**: Try logging out and back in

## Backend Logs

The backend now logs:
- `list_cases: user_id={...}, auth_header_present={...}`
- `list_cases: found X cases for user_id={...}`

Check the backend logs to see if the query is working correctly.

## Frontend Logging

The dashboard now logs:
- `apiGetCases response:` - full response object
- `extracted cases:` - the parsed cases array
- Any HTTP errors

Check the browser console F12 for these logs when dashboard loads.
