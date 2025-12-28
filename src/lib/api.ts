import { API_BASE_URL } from '../config/api'

const API_BASE = API_BASE_URL

async function request(path: string, opts: any = {}) {
  const headers: any = opts.headers || {}
  // attach token if available
  const token = localStorage.getItem('access_token')
  if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch (e) {
    json = { text }
  }
  if (!res.ok) throw { status: res.status, body: json }
  return json
}

export async function apiLogin(email: string, password: string) {
  return request('/user/login', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } })
}

export async function apiLogout(access_token: string) {
  return request('/user/logout', { method: 'POST', body: JSON.stringify({ access_token }), headers: { 'Content-Type': 'application/json' } })
}

export async function apiLoadOnboarding() {
  return request('/user/onboarding/load')
}

export async function apiMe() {
  return request('/me')
}

export async function apiAdminStats() {
  return request('/admin/stats')
}

export async function apiAdminUsers() {
  return request('/admin/users')
}

export async function apiAdminPatchUser(userId: string, payload: any) {
  return request(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
}

export async function apiAdminDeleteUser(userId: string) {
  return request(`/admin/users/${userId}`, { method: 'DELETE' })
}

export async function apiAdminGetUser(userId: string) {
  return request(`/admin/users/${userId}`)
}

export async function apiAdminGetUserCases(userId: string) {
  return request(`/admin/users/${userId}/cases`)
}

export async function apiAdminGetAllCases(params?: any) {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  if (params?.status) queryParams.append('status', params.status)
  if (params?.eligibility) queryParams.append('eligibility', params.eligibility)
  if (params?.search) queryParams.append('search', params.search)
  
  const queryString = queryParams.toString()
  return request(`/admin/cases${queryString ? '?' + queryString : ''}`)
}

export async function apiAdminGetCase(caseId: string) {
  return request(`/admin/cases/${caseId}`)
}

export async function apiAdminPatchCase(caseId: string, payload: any) {
  return request(`/admin/cases/${caseId}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
}

export async function apiListSubadmins() {
  return request('/admin/manage-subadmins')
}

export async function apiCreateSubadmin(payload: any) {
  return request('/admin/manage-subadmins', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
}

export async function apiPatchSubadmin(userId: string, payload: any) {
  return request(`/admin/manage-subadmins/${userId}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
}

export async function apiDeleteSubadmin(userId: string) {
  return request(`/admin/manage-subadmins/${userId}`, { method: 'DELETE' })
}

export async function apiSaveOnboarding(onboarding_state: any) {
  // send access_token in body for compatibility
  const token = localStorage.getItem('access_token')
  return request('/user/onboarding/save', { method: 'POST', body: JSON.stringify({ access_token: token, onboarding_state }), headers: { 'Content-Type': 'application/json' } })
}

export async function apiGetProfile() {
  return request('/user/profile')
}

export async function apiUpdateProfile(payload: any) {
  return request('/user/profile', { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
}

export async function apiChangePassword(new_password: string) {
  return request('/user/change-password', { method: 'POST', body: JSON.stringify({ new_password }), headers: { 'Content-Type': 'application/json' } })
}

export async function apiUploadProfilePhoto(formData: FormData) {
  // Do not set Content-Type header; fetch will set multipart boundary.
  const headers: any = {}
  const token = localStorage.getItem('access_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(API_BASE_URL + '/user/profile/photo', { method: 'POST', body: formData, headers })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch (e) { json = { text } }
  if (!res.ok) throw { status: res.status, body: json }
  return json
}

export async function apiGetCases() {
  return request('/cases')
}

export async function apiGetCase(caseId: string) {
  return request(`/cases/${caseId}`)
}

export async function apiCreateCase(payload: any) {
  return request('/cases', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
}

export async function apiUpdateCase(caseId: string, payload: any) {
  return request(`/cases/${caseId}`, { method: 'PATCH', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
}

export async function apiDeleteCase(caseId: string) {
  return request(`/cases/${caseId}`, { method: 'DELETE' })
}

export async function apiResetPassword(email: string) {
  return request('/user/reset-password', { method: 'POST', body: JSON.stringify({ email }), headers: { 'Content-Type': 'application/json' } })
}

// ===========================
// NOTIFICATION API
// ===========================

export interface NotificationQuery {
  unreadOnly?: boolean
  limit?: number
  type?: string
  since?: string // ISO date
  until?: string // ISO date
}

export async function apiGetNotifications(query: NotificationQuery = {}) {
  const params = new URLSearchParams()
  if (query.unreadOnly !== undefined) params.append('unread_only', String(query.unreadOnly))
  if (query.limit) params.append('limit', String(query.limit))
  if (query.type) params.append('type', query.type)
  if (query.since) params.append('since', query.since)
  if (query.until) params.append('until', query.until)
  const qs = params.toString()
  return request(`/notifications${qs ? '?' + qs : ''}`)
}

export async function apiMarkNotificationRead(notificationId: string, read: boolean = true) {
  return request(`/notifications/${notificationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ read }),
    headers: { 'Content-Type': 'application/json' }
  })
}

export async function apiMarkAllNotificationsRead() {
  // This will be implemented later if needed - for now we mark individually
  const notifications = await apiGetNotifications(true)
  const promises = notifications.notifications.map((n: any) => apiMarkNotificationRead(n.id, true))
  return Promise.all(promises)
}

// ===========================
// CASE DOCUMENTS API
// ===========================

export async function apiGetCaseDocuments(caseId: string) {
  return request(`/cases/${caseId}/documents`)
}

export async function apiUploadCaseDocument(caseId: string, file: File, documentType: string = 'general', documentId?: string, documentName?: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', documentType)
  if (documentId) {
    formData.append('document_id', documentId)
  }
  if (documentName) {
    formData.append('document_name', documentName)
  }
  
  const headers: any = {}
  const token = localStorage.getItem('access_token')
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const res = await fetch(`${API_BASE}/cases/${caseId}/documents`, {
    method: 'POST',
    body: formData,
    headers
  })
  
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch (e) { json = { text } }
  if (!res.ok) throw { status: res.status, body: json }
  return json
}

export async function apiDeleteCaseDocument(caseId: string, documentId: string) {
  return request(`/cases/${caseId}/documents/${documentId}`, { method: 'DELETE' })
}

export default { request }
