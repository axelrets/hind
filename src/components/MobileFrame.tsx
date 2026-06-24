import type { ReactNode } from 'react'

/** Phone-shaped frame on desktop, full-bleed on a real phone. */
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full justify-center sm:py-6">
      <div className="relative flex h-[100dvh] w-full max-w-[440px] flex-col overflow-hidden bg-background shadow-2xl sm:h-[884px] sm:max-h-[calc(100dvh-3rem)] sm:rounded-[2.4rem] sm:border-[7px] sm:border-neutral-900">
        {children}
      </div>
    </div>
  )
}
