import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import * as api from '../lib/api'

type Props = {
  children: React.ReactNode
}

export default function RequireAdmin({ children }: Props) {
  const [state, setState] = useState<'loading' | 'allowed' | 'denied'>('loading')

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const res = await api.apiMe()
        const user = res?.user
        const role = user?.role
        const isAdmin = role === 'admin' || (user?.profile && (user.profile.is_admin === true || user.profile.is_superadmin === true))
        if (mounted) setState(isAdmin ? 'allowed' : 'denied')
      } catch (e) {
        if (mounted) setState('denied')
      }
    }
    check()
    return () => { mounted = false }
  }, [])

  if (state === 'loading') return <div>Loading...</div>
  if (state === 'denied') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
