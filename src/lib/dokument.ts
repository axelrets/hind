import { ShieldCheck, BookText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DokumentTyp, Objekt, Speculant } from './types'
import { formatSEK } from './utils'

export const dokumentMeta: Record<
  DokumentTyp,
  { titel: string; beskrivning: string; icon: LucideIcon }
> = {
  kundkannedom: {
    titel: 'Kundkännedom',
    beskrivning: 'KYC enligt penningtvättslagen',
    icon: ShieldCheck,
  },
  maklarjournal: {
    titel: 'Mäklarjournal',
    beskrivning: 'Journal enligt fastighetsmäklarlagen',
    icon: BookText,
  },
}

const finText: Record<Speculant['finansiering'], string> = {
  kontant: 'kontant',
  lånelöfte: 'lånelöfte beviljat',
  oklart: 'ej fastställd',
}

const mognadText: Record<Speculant['kopmognad'], string> = {
  budredo: 'budredo',
  seriös: 'seriös köpare',
  tidig: 'tidig i processen',
  oklart: 'oklar köpmognad',
}

function datum(): string {
  return new Date().toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function hetast(speculanter: Speculant[]): Speculant | undefined {
  return [...speculanter].sort((a, b) => (b.kopvilja ?? 0) - (a.kopvilja ?? 0))[0]
}

function kundkannedom(objekt: Objekt, speculanter: Speculant[]): string {
  const kopare = hetast(speculanter)
  return [
    '## Uppdrag',
    `Avser förmedling av ${objekt.adress}, ${objekt.omrade}. Utgångspris ${formatSEK(objekt.pris)}.`,
    '',
    '## Identitetskontroll',
    kopare
      ? `${kopare.namn} – identitet styrkt via BankID/giltig ID-handling.` +
        (kopare.telefon ? ` Tel: ${kopare.telefon}.` : '') +
        (kopare.epost ? ` E-post: ${kopare.epost}.` : '')
      : 'Ingen köpare fastställd ännu – komplettera vid kontraktsskrivning.',
    '',
    '## Verklig huvudman',
    'Förvärvet sker för köparens egen räkning. Ingen ytterligare verklig huvudman har identifierats.',
    '',
    '## Person i politiskt utsatt ställning (PEP)',
    'Kontroll genomförd – ingen träff.',
    '',
    '## Riskbedömning enligt penningtvättslagen',
    `Sammantagen risk bedöms som LÅG. Finansiering: ${
      kopare ? finText[kopare.finansiering] : 'ej fastställd'
    }. Inga avvikande eller ovanliga betalningsupplägg har noterats.`,
    '',
    '## Affärens syfte och art',
    'Förvärv av permanentbostad. Sedvanlig bostadsaffär utan ovanliga inslag.',
    '',
    '## Noteringar',
    `Utkast genererat av Hind ${datum()}. Granska, komplettera och signera innan affären fullföljs.`,
  ].join('\n')
}

function maklarjournal(objekt: Objekt, speculanter: Speculant[]): string {
  const bud = speculanter
    .filter((s) => s.budgetMax !== null)
    .sort((a, b) => (b.budgetMax ?? 0) - (a.budgetMax ?? 0))
  return [
    '## Uppdragsavtal',
    `Förmedlingsuppdrag tecknat för ${objekt.adress}. Utgångspris ${formatSEK(objekt.pris)}.`,
    '',
    '## Objektsbeskrivning',
    `${objekt.rum} rok, ${objekt.boarea} m², ${objekt.omrade}. Mäklarbild och föreningsinformation upprättad och kontrollerad.`,
    '',
    '## Marknadsföring',
    `Objektet annonserat på Hemnet och i sociala kanaler. ${speculanter.length} registrerade spekulanter.`,
    '',
    '## Visningar och spekulanter',
    speculanter.length
      ? speculanter
          .map(
            (s) =>
              `- ${s.namn} – intresse ${s.intresseniva}, ${mognadText[s.kopmognad]}.`,
          )
          .join('\n')
      : '- Inga spekulanter registrerade ännu.',
    '',
    '## Budgivning',
    bud.length
      ? bud
          .map(
            (s) =>
              `- ${s.namn}: ${formatSEK(s.budgetMax ?? 0)} (köpvilja ${
                s.kopvilja ?? '–'
              }).`,
          )
          .join('\n')
      : '- Inga bud registrerade ännu.',
    '',
    '## Noteringar',
    `Utkast genererat av Hind ${datum()}. Förs löpande enligt fastighetsmäklarlagen (2021:516).`,
  ].join('\n')
}

/** Build an AI-style draft of a broker document for an object. */
export function draftDokumentContent(
  typ: DokumentTyp,
  objekt: Objekt,
  speculanter: Speculant[],
): string {
  return typ === 'kundkannedom'
    ? kundkannedom(objekt, speculanter)
    : maklarjournal(objekt, speculanter)
}
