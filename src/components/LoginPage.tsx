import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import * as api from '../lib/api'
import './LoginPage.css'

interface LoginPageProps {
  onLogin: () => void
}

function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMessage, setResetMessage] = useState('')

  const setLoggedIn = useAuthStore(state => state.setLoggedIn)
  const setAdminView = useAuthStore(state => state.setAdminView)
  const setFirstLogin = useAuthStore(state => state.setFirstLogin)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.apiLogin(email, password)
      // res: { status: 'ok', data: { access_token, ... } }
      const token = res?.data?.access_token || res?.data?.accessToken || res?.data?.access_token
      if (!token) throw new Error('no_token')
      localStorage.setItem('access_token', token)

      // fetch profile to determine admin role; default landing is dashboard
      try {
        const profileRes = await api.apiGetProfile()
        const profile = profileRes?.profile
        // Always treat first-login as false (default to dashboard). If you want to force onboarding, set a specific flag in profile.
        setFirstLogin(false)
        // set admin view if profile indicates role/is_admin
        const role = profile?.role
        const isAdmin = role === 'admin' || profile?.is_admin === true || profile?.is_superadmin === true
        setAdminView(!!isAdmin)
      } catch (e) {
        // if profile fetch fails, default to non-admin and dashboard
        setFirstLogin(false)
        setAdminView(false)
      }

      // mark logged in
      setLoggedIn(true)
      onLogin()

      // default landing is dashboard for regular users
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      console.error('login error', err)
      setError(err?.body?.detail || err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <header className="header">
        <div className="logo">ADHDEAL</div>
        <nav className="nav">
          <a href="#" className="nav-link">Price list</a>
          <a href="#" className="nav-link">FAQ's</a>
          <a href="#" className="nav-link">Who are we?</a>
          <a href="#" className="nav-link">How does it work?</a>
          <button className="btn-eligibility" onClick={()=>window.location.href="/onboarding"}>Eligibility check</button>
          <button className="btn-personal">Personal area →</button>
        </nav>
      </header>

      <main className="main-content">
        <div className="login-card">
          <h1 className="title">Welcome to ADHDEAL</h1>
          <p className="subtitle">Login into your account</p>

          {error && <div className="error-message">{error}</div>}

          {!showReset && (
            <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                placeholder="alex@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 4C5.5 4 2 7.5 2 10s3.5 6 8 6 8-3.5 8-6-3.5-6-8-6z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                  </svg>
                </button>
              </div>
            </div>

              <div className="forgot-password">
                <button type="button" className="forgot-link" onClick={() => { setShowReset(true); setResetEmail(email) }}>Forgot Password?</button>
              </div>

              <button type="submit" className="btn-login" disabled={loading}>{loading ? 'Logging in…' : 'Login Now'}</button>
            </form>
          )}

          {showReset && (
            <div className="reset-card">
              <h3>Reset your password</h3>
              {resetMessage && <div className="success-message">{resetMessage}</div>}
              <div className="form-group">
                <label htmlFor="resetEmail">Email Address</label>
                <input id="resetEmail" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="input-field" />
              </div>
              <div className="reset-actions">
                <button className="btn-secondary" onClick={async () => {
                  setResetMessage('')
                  try {
                    await api.apiResetPassword(resetEmail)
                    setResetMessage('If that email exists, a reset message was sent.')
                  } catch (e:any) {
                    setResetMessage('Unable to send reset email.')
                  }
                }}>Send reset email</button>
                <button className="btn-link" onClick={() => { setShowReset(false); setResetMessage('') }}>Back to login</button>
              </div>
            </div>
          )}

          <p className="signup-text">
            Don't have an account yet? <button className="signup-link" onClick={() => { setFirstLogin(true); setLoggedIn(true); onLogin(); }}>Create your account</button>
          </p>
        </div>
      </main>
    </div>
  )
}

export default LoginPage
