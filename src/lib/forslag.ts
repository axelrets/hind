import type { Objekt, Speculant, Dokument } from './types'
import { dokumentMeta, saknadeKrav } from './dokument'

// A suggested next move Hind derives from captured data — executable.
export interface Forslag {
  id: string
  objektId: string
  text: string
  hint?: string
  exec: 'intag' | 'sms'
  dokId?: string
  speculantId?: string
  draft?: string
}

/** Derive the executable next moves for one object from its captured data. */
export function harledForslag(
  objekt: Objekt,
  speculanter: Speculant[],
  dokument: Dokument[],
): Forslag[] {
  const out: Forslag[] = []

  dokument
    .map((d) => ({ d, saknas: saknadeKrav(d).length }))
    .filter((x) => x.saknas > 0)
    .forEach((f) =>
      out.push({
        id: `intag-${f.d.id}`,
        objektId: objekt.id,
        text: `Skicka BankID-intag – ${dokumentMeta[f.d.typ].titel}`,
        hint: `${f.saknas} moment saknas`,
        exec: 'intag',
        dokId: f.d.id,
      }),
    )

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
