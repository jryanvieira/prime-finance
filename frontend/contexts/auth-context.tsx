'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetchUser = async () => {
    try {
      const me = await usersService.getMe()
      setUser(me)
      localStorage.setItem(AUTH_KEY, JSON.stringify(me))
    } catch {
      // unauthenticated — keep whatever is in state
    }
  }

  useEffect(() => {
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

  const logout = () => {
    setUser(null)
    authService.logout()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, refetchUser }}>
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
