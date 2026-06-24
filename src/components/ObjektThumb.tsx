import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ObjektThumb({
  hue,
  className,
}: {
  hue: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 68% 62%), hsl(${
          (hue + 35) % 360
        } 72% 46%))`,
      }}
    >
      <Building2 className="size-6 text-white/90" />
    </div>
  )
}
