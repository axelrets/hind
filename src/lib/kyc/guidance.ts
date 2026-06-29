import type { GuidanceEntry, GuidanceType } from './types'

// Document-guidance KB (spec §6): for each evidence type — what it is, why it's
// needed, where people usually find it, what it looks like. Surfaced
// conversationally and on demand. Content, not code: editable from telemetry.
// (Phase 4 swaps the keyword match for vector retrieval; same shape.)
export const GUIDANCE: GuidanceEntry[] = [
  {
    id: 'g_likvidavrakning',
    evidenceType: 'source_of_funds',
    what: 'Likvidavräkningen från din förra bostadsförsäljning',
    why: 'Visar att kontantinsatsen kommer från en tidigare försäljning.',
    whereToFind:
      'Din förra mäklare mejlade den oftast vid tillträdet. Din bank kan också ha den under genomförda transaktioner.',
    looksLike: 'Ett kvitto-liknande dokument med slutpris, lån och utbetalat belopp.',
  },
  {
    id: 'g_kontoutdrag',
    evidenceType: 'source_of_funds',
    what: 'Kontoutdrag som visar sparandet',
    why: 'Styrker att pengarna sparats ihop över tid.',
    whereToFind:
      'Logga in i din bankapp → välj kontot → ladda ner PDF för rätt period.',
    looksLike: 'En lista med transaktioner och saldo för en period.',
  },
  {
    id: 'g_bouppteckning',
    evidenceType: 'source_of_funds',
    what: 'Bouppteckning eller arvskifte',
    why: 'Styrker att pengarna kommer från ett arv.',
    whereToFind:
      'Registreras hos Skatteverket. Dödsboets förvaltare eller familjens jurist har den.',
    looksLike: 'Ett dokument som listar tillgångar och arvtagare i dödsboet.',
  },
  {
    id: 'g_lanelofte',
    evidenceType: 'loan_promise',
    what: 'Lånelöfte från banken',
    why: 'Visar hur stor del av köpet som finansieras med lån.',
    whereToFind: 'I din bankapp eller i mejlet från din bankrådgivare.',
    looksLike: 'Ett brev/PDF med beviljat belopp och giltighetstid.',
  },
  {
    id: 'g_bankid',
    evidenceType: 'identity',
    what: 'BankID-verifiering',
    why: 'Din identitet måste styrkas innan köpekontrakt skrivs.',
    whereToFind: 'Du legitimerar dig direkt här i rummet med din BankID-app.',
    looksLike: 'BankID-appen öppnas och du bekräftar med kod eller biometri.',
  },
]

/** Mock RAG retrieval — keyword match over the KB; vector store arrives in
 *  Phase 4 behind the same call. */
export function retrieveGuidance(
  query: string,
  type?: GuidanceType,
): GuidanceEntry | null {
  const pool = type
    ? GUIDANCE.filter((g) => g.evidenceType === type)
    : GUIDANCE
  const q = query.toLowerCase()
  return (
    pool.find((g) => g.what.toLowerCase().split(/\s+/).some((w) => q.includes(w))) ??
    pool[0] ??
    null
  )
}
