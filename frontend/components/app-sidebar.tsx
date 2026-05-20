'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Receipt,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Wallet,
  LogOut,
  Menu,
  X,
  TrendingUp,
  Target,
  PieChart,
  ArrowLeftRight,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projeções', href: '/projecoes', icon: TrendingUp },
  { name: 'Fluxo de Caixa', href: '/fluxo-caixa', icon: ArrowLeftRight },
  { name: 'Metas', href: '/metas', icon: Target },
  { name: 'Gastos', href: '/gastos', icon: Receipt },
  { name: 'Receitas', href: '/receitas', icon: Wallet },
  { name: 'Calendario', href: '/calendario', icon: CalendarDays },
  { name: 'Orçamentos', href: '/orcamentos', icon: PieChart },
  { name: 'Gastos Fixos', href: '/gastos-fixos', icon: CalendarClock },
]

interface AppSidebarProps {
  userName?: string
  onLogout: () => void
}

export function AppSidebar({ userName, onLogout }: AppSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md bg-card p-2 shadow-md lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-md transition-transform lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border/50 px-6">
          <Link href="/dashboard" className="text-lg font-semibold text-sidebar-foreground">
            Prime Finance
          </Link>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-md p-1 hover:bg-sidebar-accent lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-border/50 translate-x-1'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground hover:translate-x-1'
                )}
              >
                <item.icon className={cn("size-5 transition-transform", isActive ? "scale-110 text-primary" : "")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground px-3"
              >
                <div className="flex flex-col items-start">
                  <p className="text-sm font-medium text-sidebar-foreground">{userName || 'Usuário'}</p>
                  <p className="text-xs text-sidebar-foreground/60">Conta pessoal</p>
                </div>
                <ChevronUp className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem asChild>
                <Link href="/meios-pagamento" className="flex items-center gap-2">
                  <CreditCard className="size-4" />
                  Meios de pagamento
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-destructive focus:text-destructive"
                onClick={onLogout}
              >
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
