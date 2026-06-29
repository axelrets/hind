import type { Objekt, Speculant, Dokument } from './types'
import { dokumentMeta, saknadeKrav } from './dokument'

// A suggested next move Hind derives from captured data — executable.
export interface Forslag {
  id: string
  objektId: string
  text: string
  hint?: string
  exec: 'intag' | 'sms' | 'boka'
  dokId?: string
  speculantId?: string
  draft?: string
}

// Moments the buyer can't satisfy (realtor/auto paperwork) — not a BankID intake.
const ICKE_KOPARE = new Set(['j_avtal', 'j_besiktning', 'j_bud'])

/** Derive the executable next moves for one object from its captured data. */
export function harledForslag(
  objekt: Objekt,
  speculanter: Speculant[],
  dokument: Dokument[],
): Forslag[] {
  const out: Forslag[] = []

  dokument.forEach((d) => {
    const saknas = saknadeKrav(d)
    // Object-type moment: a villa's besiktning → offer to book it.
    if (saknas.some((k) => k.id === 'j_besiktning')) {
      out.push({
        id: `boka-${d.id}`,
        objektId: objekt.id,
        text: 'Boka besiktning',
        hint: 'krävs för mäklarjournalen (villa)',
        exec: 'boka',
        dokId: d.id,
        draft: `Hej! Jag förmedlar ${objekt.adress} och behöver boka en besiktning inför försäljningen. Har ni någon ledig tid den kommande veckan? Återkom gärna med förslag. / Mäklaren`,
      })
    }
    // Buyer-answerable moments → one BankID intake.
    const koparSaknas = saknas.filter((k) => !ICKE_KOPARE.has(k.id))
    if (koparSaknas.length > 0) {
      out.push({
        id: `intag-${d.id}`,
        objektId: objekt.id,
        text: `Skicka BankID-intag – ${dokumentMeta[d.typ].titel}`,
        hint: `${koparSaknas.length} moment saknas`,
        exec: 'intag',
        dokId: d.id,
      })
    }
  })

  const hottest = [...speculanter].sort(
    (a, b) => (b.kopvilja ?? 0) - (a.kopvilja ?? 0),
  )[0]
  if (hottest && (hottest.kopvilja ?? 0) >= 70) {
    out.push({
      id: `sms-${hottest.id}`,
      objektId: objekt.id,
      text: `SMS ${hottest.namn} – stäm av budnivå`,
      hint: `köpvilja ${hottest.kopvilja}`,
      exec: 'sms',
      speculantId: hottest.id,
      draft: `Hej ${hottest.namn.split(' ')[0]}! Tack för intresset för ${objekt.adress}. Vill du att vi stämmer av budnivån inför budgivningen? Hör gärna av dig. / Mäklaren`,
    })
  }
  return out
}
