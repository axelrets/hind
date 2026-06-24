// Domain types for Hind. No TS enums (erasableSyntaxOnly) — string-literal unions.

export type ObjektStatus = 'kommande' | 'till_salu' | 'budgivning' | 'sald'

export interface Objekt {
  id: string
  adress: string
  omrade: string // e.g. "Södermalm, Stockholm"
  rum: number
  boarea: number // m²
  pris: number // utgångspris, SEK
  status: ObjektStatus
  hue: number // 0–360, deterministic placeholder image tint
  // Outcome labels — null until closed. Designed now so today's captured
  // comms can later be joined to outcomes to train prospect-fit prediction.
  sald: boolean
  slutpris: number | null
  dagarPaMarknaden: number | null
}

export type Intresseniva = 'hög' | 'medel' | 'låg'
export type Finansiering = 'kontant' | 'lånelöfte' | 'oklart'

export interface Speculant {
  id: string
  objektId: string | null
  namn: string
  telefon: string | null
  epost: string | null
  budgetMin: number | null
  budgetMax: number | null
  onskemal: string[] // preferences
  invandningar: string[] // objections
  intresseniva: Intresseniva
  finansiering: Finansiering
  sammanfattning: string | null
  createdAt: string // ISO
}

export type TimelineTyp =
  | 'visning'
  | 'samtal'
  | 'mejl'
  | 'sms'
  | 'anteckning'
  | 'bud'
  | 'rostdebrief'

export interface TimelineEvent {
  id: string
  objektId: string
  speculantId: string | null
  typ: TimelineTyp
  titel: string
  beskrivning: string | null
  occurredAt: string // ISO
  synced: boolean // synced to Vitec?
}

export type Prioritet = 'hög' | 'medel' | 'låg'

export interface NextStep {
  id: string
  objektId: string | null
  speculantId: string | null
  beskrivning: string
  deadline: string | null // ISO
  prioritet: Prioritet
  klar: boolean
}

/** Shape Claude returns from a voice debrief (and the local fallback). */
export interface StructuredDebrief {
  namn: string
  telefon: string | null
  epost: string | null
  budgetMin: number | null
  budgetMax: number | null
  onskemal: string[]
  invandningar: string[]
  intresseniva: Intresseniva
  finansiering: Finansiering
  sammanfattning: string
  nastaSteg: {
    beskrivning: string
    deadline: string | null
    prioritet: Prioritet
  }
}
