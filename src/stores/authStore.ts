import { create } from 'zustand'


interface AuthState {
  isLoggedIn: boolean
  isAdminView: boolean
  showSideNav: boolean
  isFirstLogin: boolean
  setLoggedIn: (value: boolean) => void
  setAdminView: (value: boolean) => void
  setSideNav: (value: boolean) => void
  setFirstLogin: (value: boolean) => void
  login: () => void
  logout: () => void
  completeOnboarding: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
  isAdminView: localStorage.getItem('isAdminView') === 'true',
  showSideNav: true,
  isFirstLogin: true,
  setLoggedIn: (value) => {
    localStorage.setItem('isLoggedIn', value.toString())
    set({ isLoggedIn: value })
  },
  setAdminView: (value) => {
    localStorage.setItem('isAdminView', value.toString())
    set({ isAdminView: value })
  },
  setSideNav: (value) => set({ showSideNav: value }),
  setFirstLogin: (value) => set({ isFirstLogin: value }),
  login: () => {
    set({ 
      isLoggedIn: true,
      showSideNav: true,
    })
    localStorage.setItem('isLoggedIn', 'true')
  },
  logout: () => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('isAdminView')
    set({ 
      isLoggedIn: false,
      isAdminView: false,
      showSideNav: true,
      isFirstLogin: true
    })
  },
  completeOnboarding: () => {
    set({ 
      showSideNav: true,
      isFirstLogin: false
    })
  }
}))