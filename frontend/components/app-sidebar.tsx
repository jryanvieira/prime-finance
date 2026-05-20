'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutList, CalendarDays, TrendingUp, Target, PieChart, CalendarClock, CreditCard, LogOut, ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const MOVIMENTACAO = [
  { name: 'Todas as transações', href: '/transacoes', icon: LayoutList },
  { name: 'Calendário', href: '/calendario', icon: CalendarDays },
  { name: 'Fluxo & projeção', href: '/fluxo', icon: TrendingUp, badge: 'novo' },
]

const PLANEJAMENTO = [
  { name: 'Metas', href: '/metas', icon: Target },
  { name: 'Orçamentos', href: '/orcamentos', icon: PieChart },
  { name: 'Gastos fixos', href: '/gastos-fixos', icon: CalendarClock },
]

interface AppSidebarProps {
  userName?: string
  onLogout: () => void
  onAddTransaction?: () => void
}

function CollapseGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: typeof MOVIMENTACAO
  pathname: string
}) {
  const isAnyActive = items.some((i) => pathname.startsWith(i.href))
  const [open, setOpen] = useState(isAnyActive)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5"
      >
        <span className="eyebrow" style={{ color: 'var(--ink-3)', fontSize: 10 }}>{label}</span>
        <ChevronDown
          className="size-3 transition-transform"
          style={{
            color: 'var(--ink-3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-250"
        style={{ maxHeight: open ? 200 : 0 }}
      >
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'font-medium'
                  : 'hover:bg-[var(--surface)]'
              )}
              style={
                isActive
                  ? {
                      background: 'var(--surface)',
                      borderLeft: '2px solid var(--accent)',
                      color: 'var(--ink)',
                    }
                  : { color: 'var(--ink-2)' }
              }
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.name}</span>
              {item.badge && (
                <span
                  className="ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{ background: 'var(--accent-tint)', color: 'var(--accent)' }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function AppSidebar({ userName, onLogout, onAddTransaction }: AppSidebarProps) {
  const pathname = usePathname()
  const initial = (userName || 'P')[0].toUpperCase()

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r"
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
        <div
          className="flex size-7 items-center justify-center rounded-md text-xs font-bold"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          P
        </div>
        <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Prime Finance</span>
      </div>

      {/* Add transaction */}
      <div className="px-4 pt-4">
        <button
          onClick={onAddTransaction}
          className="flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus className="size-4" />
          Adicionar transação
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {/* Início */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors"
          style={
            pathname === '/dashboard'
              ? { background: 'var(--surface)', borderLeft: '2px solid var(--accent)', color: 'var(--ink)', fontWeight: 500 }
              : { color: 'var(--ink-2)' }
          }
        >
          <Home className="size-4" />
          Início
        </Link>

        <div className="my-2" style={{ borderTop: '1px solid var(--line)' }} />

        <CollapseGroup label="MOVIMENTAÇÃO" items={MOVIMENTACAO} pathname={pathname} />

        <div className="my-2" style={{ borderTop: '1px solid var(--line)' }} />

        <CollapseGroup label="PLANEJAMENTO" items={PLANEJAMENTO} pathname={pathname} />
      </nav>

      {/* Footer avatar */}
      <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--bg)] transition-colors">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold serif"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                {initial}
              </div>
              <div className="flex flex-col items-start text-left leading-tight min-w-0">
                <span className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {userName || 'Usuário'}
                </span>
                <span className="text-xs" style={{ color: 'var(--ink-3)' }}>Conta pessoal</span>
              </div>
              <ChevronDown className="ml-auto size-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52">
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
  )
}
