import type { Prioritet } from './types'

export function prioRank(p: Prioritet): number {
  if (p === 'hög') return 3
  if (p === 'medel') return 2
  return 1
}
