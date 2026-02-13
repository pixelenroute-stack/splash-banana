import type { User, AuthState } from '@/types'

const AUTH_TOKEN_KEY = 'auth_token'
const USER_KEY = 'user'

export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { user: null, isAuthenticated: false, isLoading: false }
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY)
  const userStr = localStorage.getItem(USER_KEY)

  if (!token || !userStr) {
    return { user: null, isAuthenticated: false, isLoading: false }
  }

  try {
    const user = JSON.parse(userStr) as User
    return { user, isAuthenticated: true, isLoading: false }
  } catch {
    return { user: null, isAuthenticated: false, isLoading: false }
  }
}

export function logout(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.location.href = '/login'
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(AUTH_TOKEN_KEY)
}
