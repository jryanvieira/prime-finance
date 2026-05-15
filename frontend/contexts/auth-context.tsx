'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import { authService, usersService } from '@/lib/api'
import type { User } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  logout: () => void
  refetchUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_KEY = 'prime-finance-auth'
const TOKEN_KEY = 'prime-finance-token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetchUser = useCallback(async () => {
    try {
      const me = await usersService.getMe()
      setUser(me)
      localStorage.setItem(AUTH_KEY, JSON.stringify(me))
    } catch {
      // token expirado — limpar estado
      setUser(null)
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem(TOKEN_KEY)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setIsLoading(false)
      return
    }

    const savedAuth = localStorage.getItem(AUTH_KEY)
    if (savedAuth) {
      try {
        setUser(JSON.parse(savedAuth) as User)
      } catch {
        localStorage.removeItem(AUTH_KEY)
      }
    }
    // Try to refresh from API silently
    void usersService.getMe().then((me) => {
      setUser(me)
      localStorage.setItem(AUTH_KEY, JSON.stringify(me))
    }).catch(() => {}).finally(() => setIsLoading(false))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    authService.logout()
  }, [])

  const contextValue = useMemo(
    () => ({ user, isLoading, logout, refetchUser }),
    [user, isLoading, logout, refetchUser]
  )

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}
