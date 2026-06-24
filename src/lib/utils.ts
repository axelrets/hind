import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 4 950 000 → "4 950 000 kr" (Swedish spacing) */
export function formatSEK(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–'
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Compact price for chips: 4 950 000 → "4,95 mkr" */
export function formatMkr(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–'
  const mkr = value / 1_000_000
  return `${mkr.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} mkr`
}

/** ISO date → "i dag 14:30" / "i går" / "12 jun" */
export function formatRelative(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday = d.toDateString() === yesterday.toDateString()

  const time = d.toLocaleTimeString('sv-SE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  if (sameDay) return `i dag ${time}`
  if (isYesterday) return `i går ${time}`
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

/** ISO date → "tor 26 jun" */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "Anna Lindqvist" → "AL" */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

let idCounter = 0
export function uid(prefix = 'id'): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`
}

/** Deterministic hue (0–360) from a string, for avatar tints. */
export function hueFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) % 360
  }
  return h
}
