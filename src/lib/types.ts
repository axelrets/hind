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
// Buyer maturity — how close this spekulant is to acting.
export type Kopmognad = 'budredo' | 'seriös' | 'tidig' | 'oklart'

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
  kopvilja: number | null // AI-bedömd köpvilja 0–100 (HET ≥ 70)
  kopmognad: Kopmognad // buyer maturity
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

// Today's calendar feed on the home screen. Static demo data — the "plate" the
// agent sees each morning (showings, calls, meetings). Not persisted to Supabase.
export type AgendaTyp =
  | 'visning'
  | 'samtal'
  | 'mote'
  | 'budgivning'
  | 'uppfoljning'
  | 'kontrakt'

export interface AgendaItem {
  id: string
  start: string // ISO, today
  titel: string
  plats: string | null // location / one-line context
  typ: AgendaTyp
  objektId: string | null
  speculantId: string | null
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
  kopvilja: number // 0–100
  kopmognad: Kopmognad
  sammanfattning: string
  nastaSteg: {
    beskrivning: string
    deadline: string | null
    prioritet: Prioritet
  }
}
