import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  right?: ReactNode
}

export function PageHeader({ title, subtitle, back, right }: PageHeaderProps) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      {back && (
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Tillbaka"
          className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  )
}
