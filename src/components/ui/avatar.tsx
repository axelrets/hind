import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–360 hue for a deterministic pastel background. */
  hue?: number
}

/** Simple initials avatar with a deterministic pastel background. */
const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, hue = 243, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-10 w-10 shrink-0 select-none items-center justify-center rounded-full text-sm font-semibold',
        className,
      )}
      style={{
        backgroundColor: `hsl(${hue} 70% 92%)`,
        color: `hsl(${hue} 55% 38%)`,
        ...style,
      }}
      {...props}
    />
  ),
)
Avatar.displayName = 'Avatar'

export { Avatar }
