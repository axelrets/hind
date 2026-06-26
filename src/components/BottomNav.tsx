import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Building2, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const leftItems: NavItem[] = [
  { to: '/', label: 'Workbench', icon: Home, end: true },
]
const rightItems: NavItem[] = [
  { to: '/objekt', label: 'Objekt', icon: Building2 },
]

function Tab({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground',
        )
      }
    >
      <Icon className="size-[22px]" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function BottomNav() {
  const navigate = useNavigate()
  return (
    <nav className="relative z-20 shrink-0 border-t border-border bg-background/95 backdrop-blur pb-safe">
      <button
        type="button"
        onClick={() => navigate('/assistent')}
        aria-label="Fråga Hind"
        className="absolute -top-6 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
      >
        <Sparkles className="size-6" />
      </button>
      <div className="grid grid-cols-3 items-end px-2">
        {leftItems.map((it) => (
          <Tab key={it.to} item={it} />
        ))}
        <span aria-hidden className="py-2" />
        {rightItems.map((it) => (
          <Tab key={it.to} item={it} />
        ))}
      </div>
    </nav>
  )
}
