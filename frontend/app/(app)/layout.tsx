'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { AppSidebar } from '@/components/app-sidebar'

interface User {
  id: string
  email: string
  name: string
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedAuth = localStorage.getItem('prime-finance-auth')
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth)
        setUser(parsed)
      } catch {
        router.replace('/login')
      }
    } else {
      router.replace('/login')
    }
    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('prime-finance-auth')
    router.push('/login')
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar userName={user.name} onLogout={handleLogout} />
      <main className="lg:pl-64">
        <div className="min-h-screen p-6 pt-20 lg:p-8 lg:pt-8">{children}</div>
      </main>
    </div>
  )
}
