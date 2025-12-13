import { useEffect } from 'react'
import * as api from './lib/api'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import Dashboard from './components/Dashboard'
import OnboardingFlow from './components/Onboarding/OnboardingFlow' 
import { useAuthStore } from './stores/authStore'
import AdminDashboard from './components/AdminDashboard'
import AdminUserManagement from './components/AdminUserManagement'
import AdminCases from './components/AdminCases'
import AdminCalendar from './components/AdminCalendar'
import AdminSettings from './components/AdminSettings'
import RequireAdmin from './components/RequireAdmin'
import UserDetail from './components/UserDetail'
import UserCases from './components/UserCases'
import UserCaseDetail from './components/UserCaseDetail'
import MyCase from './components/MyCase'
import Appointment from './components/Appointment'
import Settings from './components/Settings'
import Payments from './components/Payments'
import Notifications from './components/Notifications'
import UserSubscriptions from './components/UserSubscriptions'
import ManageSubadmins from './components/ManageSubadmins'
import Mailbox from './components/Mailbox'
import AdminPromptEditor from './components/AdminPromptEditor'
import SideNav from './components/SideNav'
import './App.css'
import './index.css'

function App() {
  // Get authentication state and actions from our store
  const { 
    isLoggedIn, 
    isAdminView, 
    
    login, 
    logout, 
    setAdminView 
  } = useAuthStore()

  // Handlers that use our store actions
  const handleLogin = () => login()
  const handleLogout = () => logout()
  const switchToUser = () => setAdminView(false)
  // switchToAdmin verifies the user's role with the server before enabling admin UI
  const switchToAdmin = async () => {
    try {
      const res = await api.apiMe()
      const user = res?.user
      const role = user?.role
      const isAdmin = role === 'admin' || (user?.profile && (user.profile.is_admin === true || user.profile.is_superadmin === true))
      if (isAdmin) {
        setAdminView(true)
      } else {
        // not allowed: keep user view; optionally show a message
        console.warn('User is not an admin; cannot switch to admin view')
        setAdminView(false)
      }
    } catch (e) {
      console.error('Failed to verify admin role', e)
      setAdminView(false)
    }
  }

  if (!isLoggedIn) {
    // Unauthenticated routes: allow anonymous access to the onboarding flow
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<OnboardingFlow onComplete={() => { /* no-op for anonymous */ }} />} />
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="*" element={<LoginPage onLogin={handleLogin} />} />
        </Routes>
      </BrowserRouter>
    )
  }

  // Helper to convert existing page keys (used by onNavigate in components)
  const pageToPath = (page: string) => {
    if (!page) return '/dashboard'
    // support `user-detail:123` or `user-detail/123` formats
    if (page.startsWith('user-detail')) {
      const parts = page.split(/[:/]/)
      const id = parts[1] || ''
      return id ? `/user/${id}` : '/dashboard'
    }
  switch (page) {
      case 'dashboard':
        return '/dashboard'
      case 'mycase':
        return '/mycase'
      case 'appointment':
        return '/appointment'
      case 'settings':
        return '/settings'
      case 'payments':
        return '/payments'
      case 'notifications':
        return '/notifications'
      case 'mailbox':
        return '/mailbox'
      case 'user-subscriptions':
        // only valid for admin view
        return isAdminView ? '/admin/user-subscriptions' : '/dashboard'
      case 'manage-subadmins':
        return isAdminView ? '/admin/manage-subadmins' : '/dashboard'
      case 'admin-dashboard':
        return '/admin/dashboard'
      case 'admin-users':
        return '/admin/users'
      case 'admin-cases':
        return '/admin/cases'
      case 'admin-calendar':
        return '/admin/calendar'
      case 'admin-settings':
        return '/admin/settings'
      default:
        return '/dashboard'
    }
  }

  // Create wrappers that inject onNavigate into components that expect it.
  const createWithNav = (Component: any) => {
    return function Wrapped(props: any) {
      const navigate = useNavigate()
      const onNavigate = (page: string) => {
        const path = pageToPath(page)
        if (path) navigate(path)
      }
      return <Component {...props} onNavigate={onNavigate} />
    }
  }

  // Helper component used for initial redirect after login.
  function InitialRedirect() {
    const navigate = useNavigate()
    const isFirstLogin = useAuthStore(state => state.isFirstLogin)
    const isAdminViewLocal = useAuthStore(state => state.isAdminView)
    
    useEffect(() => {
      // If the user is admin, always land in the admin dashboard
      if (isAdminViewLocal) {
        navigate('/admin/dashboard', { replace: true })
        return
      }
      navigate(isFirstLogin ? '/onboarding' : '/dashboard', { replace: true })
    }, [navigate, isFirstLogin])
    return null
  }

  const DashboardWithNav = createWithNav(Dashboard)
  const MyCaseWithNav = createWithNav(MyCase)
  const AppointmentWithNav = createWithNav(Appointment)
  const SettingsWithNav = createWithNav(Settings)
  const PaymentsWithNav = createWithNav(Payments)
  const NotificationsWithNav = createWithNav(Notifications)
  const MailboxWithNav = createWithNav(Mailbox)
  const UserSubscriptionsWithNav = createWithNav(UserSubscriptions)
  const ManageSubadminsWithNav = createWithNav(ManageSubadmins)
  const OnboardingWithNav = createWithNav(OnboardingFlow)

  const AdminDashboardWithNav = createWithNav(AdminDashboard)
  const AdminUserManagementWithNav = createWithNav(AdminUserManagement)
  const AdminCasesWithNav = createWithNav(AdminCases)
  const AdminCalendarWithNav = createWithNav(AdminCalendar)
  const AdminSettingsWithNav = createWithNav(AdminSettings)
  const AdminPromptEditorWithNav = createWithNav(AdminPromptEditor)
  const UserDetailWithNav = createWithNav(UserDetail)
  const UserCasesWithNav = createWithNav(UserCases)
  const UserCaseDetailWithNav = createWithNav(UserCaseDetail)
  // Authenticated layout with a single shared SideNav and route-based views.
  function AuthenticatedLayout() {
    const showSideNav = useAuthStore(state => state.showSideNav)
    const location = window.location.pathname
    const isOnboarding = location === '/onboarding'
    
    return (
      <div className={`app-with-global-sidenav ${isOnboarding ? 'onboarding-full-width' : ''}`}>
        {showSideNav && !isOnboarding && (
          <SideNav onLogout={handleLogout} isAdminView={isAdminView} onSwitchToAdmin={switchToAdmin} onSwitchToUser={switchToUser} />
        )}
        <main className={`app-main ${isOnboarding ? 'w-full' : ''}`}>
          {/* Small wrappers provide an `onNavigate` callback to existing components that expect it. */}
          <Routes>
            <Route path="/" element={<InitialRedirect />} />
            <Route path="/dashboard" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <DashboardWithNav onSwitchToAdmin={switchToAdmin} />} />
            <Route path="/onboarding" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <OnboardingWithNav onLogout={handleLogout} />} />
            <Route path="/mycase" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <MyCaseWithNav onLogout={handleLogout} />} />
            <Route path="/appointment" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <AppointmentWithNav onLogout={handleLogout} />} />
            <Route path="/settings" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <SettingsWithNav onLogout={handleLogout} />} />
            <Route path="/payments" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <PaymentsWithNav onLogout={handleLogout} />} />
            <Route path="/notifications" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <NotificationsWithNav />} />
            <Route path="/mailbox" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <MailboxWithNav onLogout={handleLogout} />} />
            {/* admin-only pages moved under /admin/... */}

            {/* Admin routes (server-verified via RequireAdmin) */}
            <Route
              path="/admin/*"
              element={
                <RequireAdmin>
                  <AdminDashboardWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} />
                </RequireAdmin>
              }
            />

            <Route path="/admin/dashboard" element={<RequireAdmin><AdminDashboardWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />
            <Route path="/admin/users" element={<RequireAdmin><AdminUserManagementWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />
            <Route path="/admin/cases" element={<RequireAdmin><AdminCasesWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />
            <Route path="/admin/user/:userId/cases" element={<RequireAdmin><UserCasesWithNav onLogout={handleLogout} /></RequireAdmin>} />
            <Route path="/admin/user/:userId/case/:caseId" element={<RequireAdmin><UserCaseDetailWithNav onLogout={handleLogout} /></RequireAdmin>} />
            <Route path="/admin/calendar" element={<RequireAdmin><AdminCalendarWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />
            <Route path="/admin/settings" element={<RequireAdmin><AdminSettingsWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />
            <Route path="/admin/prompts" element={<RequireAdmin><AdminPromptEditorWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />
            <Route path="/admin/user-subscriptions" element={<RequireAdmin><UserSubscriptionsWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />
            <Route path="/admin/manage-subadmins" element={<RequireAdmin><ManageSubadminsWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} /></RequireAdmin>} />

            <Route path="/user/:id" element={isAdminView ? <Navigate to="/admin/dashboard" replace /> : <UserDetailWithNav onLogout={handleLogout} onSwitchToUser={switchToUser} />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <AuthenticatedLayout />
    </BrowserRouter>
  )
}

export default App
