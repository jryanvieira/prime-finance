'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { mockUser, type User } from '@/lib/mock-data'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_KEY = 'prime-finance-auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar se há usuário salvo no localStorage
    const savedAuth = localStorage.getItem(AUTH_KEY)
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth)
        setUser(parsed)
      } catch {
        localStorage.removeItem(AUTH_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock: aceitar qualquer email/senha válidos
    if (email && password.length >= 6) {
      const loggedUser = { ...mockUser, email }
      setUser(loggedUser)
      localStorage.setItem(AUTH_KEY, JSON.stringify(loggedUser))
      return true
    }
    return false
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    // Simular delay de API
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Mock: aceitar qualquer registro válido
    if (name && email && password.length >= 6) {
      const newUser: User = {
        id: Date.now().toString(),
        email,
        name,
      }
      setUser(newUser)
      localStorage.setItem(AUTH_KEY, JSON.stringify(newUser))
      return true
    }
    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
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
