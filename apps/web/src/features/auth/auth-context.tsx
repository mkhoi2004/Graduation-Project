import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { clearSession, getSession, saveSession, type AuthSession } from '@/lib/auth-session'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

export interface AuthContextValue {
  session: AuthSession | null
  user: AuthSession['user'] | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (session: AuthSession) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize state synchronously from localStorage to prevent layout flicker or auth drops
  const [session, setSession] = useState<AuthSession | null>(() => getSession())
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    if (import.meta.env.MODE === 'test') return false
    return Boolean(getSession())
  })

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const login = useCallback((newSession: AuthSession) => {
    saveSession(newSession)
    setSession(newSession)
  }, [])

  const refreshUser = useCallback(async () => {
    const currentSession = getSession()
    if (!currentSession) {
      setSession(null)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: {
          Authorization: `${currentSession.tokenType} ${currentSession.accessToken}`,
        },
      })

      if (response.ok) {
        const data = (await response.json()) as { user: AuthSession['user'] }
        const updated: AuthSession = {
          ...currentSession,
          user: data.user,
        }
        saveSession(updated)
        setSession(updated)
      } else {
        // Token expired, server rebooted, or invalid on server
        clearSession()
        setSession(null)
      }
    } catch {
      // If server cannot be reached or project was turned off,
      // reset session so UI does NOT hang in a broken/offline state
      clearSession()
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleAuthLogout = () => {
      setSession(null)
    }
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [])

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    if (session) {
      void refreshUser()
    } else {
      setIsLoading(false)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        token: session?.accessToken ?? null,
        isAuthenticated: Boolean(session),
        isLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    return {
      session: null,
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      login: () => {},
      logout: () => {
        clearSession()
      },
      refreshUser: async () => {},
    }
  }
  return context
}
