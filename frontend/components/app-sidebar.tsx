'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Receipt,
  CalendarDays,
  CreditCard,
  LogOut,
  Menu,
  X,
  Target,
  PieChart,
  CalendarClock,
  ArrowLeftRight,
  Plus,
  ChevronDown,
  LayoutDashboard,
} from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AppSidebarProps {
  userName?: string
  onLogout: () => void
  onAddTransaction?: () => void
}

const movimentacaoItems = [
  { name: 'Todas as transações', href: '/transacoes' },
  { name: 'Calendário', href: '/calendario' },
  { name: 'Fluxo & projeção', href: '/fluxo-caixa' },
]

const planejamentoItems = [
  { name: 'Metas', href: '/metas' },
  { name: 'Orçamentos', href: '/orcamentos' },
  { name: 'Gastos fixos', href: '/gastos-fixos' },
]

function isGroupActive(pathname: string, items: { href: string }[]) {
  return items.some((item) => pathname.startsWith(item.href))
}

export function AppSidebar({ userName, onLogout, onAddTransaction }: AppSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [movOpen, setMovOpen] = useState(() => isGroupActive(pathname, movimentacaoItems))
  const [planOpen, setPlanOpen] = useState(() => isGroupActive(pathname, planejamentoItems))

  function closeMobile() {
    setIsMobileOpen(false)
  }

  const sidebarContent = (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform lg:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{ background: 'var(--sidebar)', borderColor: 'var(--sidebar-border)' }}
    >
      {/* Header: logo */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={closeMobile}>
          <span
            className="flex size-8 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ background: 'var(--accent)' }}
          >
            P
          </span>
          <span className="serif text-base font-semibold" style={{ color: 'var(--ink)' }}>
            Prime Finance
          </span>
        </Link>
        <button
          onClick={closeMobile}
          className="rounded-md p-1 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Botão Adicionar transação */}
      <div className="px-3 pb-4">
        <Button
          className="w-full rounded-full font-medium text-white"
          style={{ background: 'var(--accent)' }}
          onClick={onAddTransaction}
        >
          <Plus className="mr-2 size-4" />
          Adicionar transação
        </Button>
      </div>

      {/* Divider */}
      <div className="mx-3 mb-2 border-t" style={{ borderColor: 'var(--sidebar-border)' }} />

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2">
        {/* Início */}
        <Link
          href="/dashboard"
          onClick={closeMobile}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          )}
          style={
            pathname === '/dashboard'
              ? {
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  borderLeft: '2px solid var(--accent)',
                }
              : { color: 'var(--ink-2)' }
          }
          onMouseEnter={(e) => {
            if (pathname !== '/dashboard') {
              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
            }
          }}
          onMouseLeave={(e) => {
            if (pathname !== '/dashboard') {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            }
          }}
        >
          <LayoutDashboard className="size-4" />
          Início
        </Link>

        {/* MOVIMENTAÇÃO group */}
        <p
          className="eyebrow px-3 py-2 text-xs"
          style={{ color: 'var(--ink-3)' }}
        >
          Movimentação
        </p>
        <button
          onClick={() => setMovOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--ink-2)' }}
        >
          <span className="flex items-center gap-2">
            <Receipt className="size-4" />
            Transações
          </span>
          <ChevronDown
            className={cn('size-4 transition-transform duration-250', movOpen && 'rotate-180')}
          />
        </button>
        <div
          className={cn(
            'overflow-hidden transition-all duration-250',
            movOpen ? 'max-h-40' : 'max-h-0'
          )}
        >
          {movimentacaoItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="flex items-center rounded-md py-1.5 pl-9 pr-3 text-sm transition-colors"
                style={
                  active
                    ? {
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        borderLeft: '2px solid var(--accent)',
                      }
                    : { color: 'var(--ink-2)' }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* PLANEJAMENTO group */}
        <p
          className="eyebrow px-3 py-2 text-xs"
          style={{ color: 'var(--ink-3)' }}
        >
          Planejamento
        </p>
        <button
          onClick={() => setPlanOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--ink-2)' }}
        >
          <span className="flex items-center gap-2">
            <Target className="size-4" />
            Metas e limites
          </span>
          <ChevronDown
            className={cn('size-4 transition-transform duration-250', planOpen && 'rotate-180')}
          />
        </button>
        <div
          className={cn(
            'overflow-hidden transition-all duration-250',
            planOpen ? 'max-h-40' : 'max-h-0'
          )}
        >
          {planejamentoItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="flex items-center rounded-md py-1.5 pl-9 pr-3 text-sm transition-colors"
                style={
                  active
                    ? {
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        borderLeft: '2px solid var(--accent)',
                      }
                    : { color: 'var(--ink-2)' }
                }
                onMouseEnter={(e) => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Divider */}
      <div className="mx-3 mt-2 border-t" style={{ borderColor: 'var(--sidebar-border)' }} />

      {/* Footer: avatar dropdown */}
      <div className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={{ color: 'var(--ink-2)' }}
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: 'var(--accent)' }}
              >
                {(userName ?? 'U')[0].toUpperCase()}
              </span>
              <span className="flex-1 truncate text-left" style={{ color: 'var(--ink)' }}>
                {userName || 'Usuário'}
              </span>
              <ChevronDown className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link href="/meios-pagamento" className="flex items-center gap-2">
                <CreditCard className="size-4" />
                Meios de pagamento
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onLogout}
              className="flex items-center gap-2 text-destructive focus:text-destructive"
            >
              <LogOut className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md p-2 shadow-md lg:hidden"
        style={{ background: 'var(--surface)' }}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 backdrop-blur-sm lg:hidden"
          style={{ background: 'rgba(0,0,0,0.2)' }}
          onClick={closeMobile}
        />
      )}

      {sidebarContent}
    </>
  )
}
