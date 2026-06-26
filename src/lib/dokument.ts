import { ShieldCheck, BookText } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  DokumentTyp,
  Dokument,
  DokumentKrav,
  KravKalla,
  Objekt,
  Speculant,
} from './types'
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

// The buyer the deal turns on. A serious cash buyer takes priority because the
// cash case is the compliance hotspot (no bank doing KYC in the background).
export function dealKopare(speculanter: Speculant[]): Speculant | undefined {
  const kontant = speculanter.find(
    (s) => s.finansiering === 'kontant' && (s.kopvilja ?? 0) >= 50,
  )
  return kontant ?? hetast(speculanter)
}

export interface DealKlass {
  objektTyp: string
  betalning: 'kontant' | 'lan' | 'oklart'
  koparTyp: string
  koparNamn: string | null
}

export const betalningLabel: Record<DealKlass['betalning'], string> = {
  kontant: 'Kontantköp',
  lan: 'Bolån',
  oklart: 'Finansiering oklar',
}

// Step 1 of the motor: classify the deal — this is what derives the moments.
export function klassificera(
  _objekt: Objekt,
  speculanter: Speculant[],
): DealKlass {
  const kopare = dealKopare(speculanter)
  const betalning =
    kopare?.finansiering === 'kontant'
      ? 'kontant'
      : kopare?.finansiering === 'lånelöfte'
        ? 'lan'
        : 'oklart'
  return {
    objektTyp: 'Bostadsrätt',
    betalning,
    koparTyp: 'Privatperson',
    koparNamn: kopare?.namn ?? null,
  }
}

function kundkannedom(objekt: Objekt, speculanter: Speculant[]): string {
  const kopare = dealKopare(speculanter)
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

// Where a satisfied requirement came from — shown as a source badge.
export const kallaMeta: Record<KravKalla, string> = {
  kopare: 'Köpare',
  vitec: 'Vitec',
  mspecs: 'Mspecs',
  gmail: 'Gmail',
  maklare: 'Mäklare',
}

/** The checklist of requirements Hind must satisfy for a document. Some are
 *  pre-filled from connected sources (Vitec/Mspecs/Gmail) to show auto-capture. */
export function kravMall(
  typ: DokumentTyp,
  objekt: Objekt,
  speculanter: Speculant[],
): DokumentKrav[] {
  const klass = klassificera(objekt, speculanter)
  const kopare = dealKopare(speculanter)
  if (typ === 'kundkannedom') {
    const krav: DokumentKrav[] = [
      {
        id: 'k_person',
        fraga: 'Personuppgifter',
        beskrivning: 'Namn, personnummer och adress',
        typ: 'fritext',
        status: kopare ? 'klar' : 'saknas',
        varde: kopare?.namn ?? null,
        kalla: kopare ? 'vitec' : null,
      },
      {
        id: 'k_kontakt',
        fraga: 'Kontaktuppgifter',
        typ: 'fritext',
        status: kopare?.telefon ? 'klar' : 'saknas',
        varde: kopare?.telefon ?? null,
        kalla: kopare?.telefon ? 'vitec' : null,
      },
      {
        id: 'k_id',
        fraga: 'Legitimation (BankID)',
        beskrivning: 'Identitet verifieras med BankID i intaget',
        typ: 'fil',
        status: 'saknas',
        varde: null,
        kalla: null,
      },
      {
        id: 'k_fin',
        fraga: 'Finansiering',
        beskrivning: 'Hur finansieras köpet?',
        typ: 'val',
        alternativ: ['Lånelöfte', 'Kontant'],
        status: kopare ? 'klar' : 'saknas',
        varde: kopare ? finText[kopare.finansiering] : null,
        kalla: kopare ? 'gmail' : null,
      },
      {
        id: 'k_kontantinsats',
        fraga: 'Kontantinsatsens ursprung',
        beskrivning: 'Varifrån kommer kontantinsatsen?',
        typ: 'fritext',
        status: 'saknas',
        varde: null,
        kalla: null,
      },
      {
        id: 'k_huvudman',
        fraga: 'Verklig huvudman',
        beskrivning: 'Köper du för egen räkning?',
        typ: 'val',
        alternativ: ['För egen räkning', 'För annans räkning'],
        status: 'saknas',
        varde: null,
        kalla: null,
      },
      {
        id: 'k_pep',
        fraga: 'Politiskt utsatt ställning (PEP)',
        beskrivning: 'Har du en hög politisk position eller en nära relation till någon som har det?',
        typ: 'val',
        alternativ: ['Nej', 'Ja'],
        status: 'saknas',
        varde: null,
        kalla: null,
      },
      {
        id: 'k_syfte',
        fraga: 'Syfte med förvärvet',
        typ: 'fritext',
        status: 'klar',
        varde: 'Permanentbostad',
        kalla: 'gmail',
      },
    ]
    // Required moments derived from the deal classification:
    if (klass.betalning === 'lan') {
      krav.splice(5, 0, {
        id: 'k_lan',
        fraga: 'Lånelöfte',
        beskrivning: 'Underlag från banken',
        typ: 'fil',
        status: 'saknas',
        varde: null,
        kalla: null,
      })
    }
    if (klass.betalning === 'kontant') {
      // Cash buyer — full source-of-funds is the compliance hotspot.
      krav.splice(
        5,
        0,
        {
          id: 'k_kallkontroll',
          fraga: 'Källkontroll – hela köpeskillingen',
          beskrivning: 'Var kommer pengarna till hela köpet ifrån?',
          typ: 'fritext',
          status: 'saknas',
          varde: null,
          kalla: null,
        },
        {
          id: 'k_bevis',
          fraga: 'Underlag för pengarnas ursprung',
          beskrivning: 'Kontoutdrag, säljkontrakt eller arvshandling',
          typ: 'fil',
          status: 'saknas',
          varde: null,
          kalla: null,
        },
      )
    }
    return krav
  }
  const budCount = speculanter.filter((s) => s.budgetMax !== null).length
  return [
    {
      id: 'j_avtal',
      fraga: 'Uppdragsavtal',
      typ: 'fil',
      status: 'klar',
      varde: 'uppdragsavtal.pdf',
      kalla: 'maklare',
    },
    {
      id: 'j_objekt',
      fraga: 'Objektsbeskrivning',
      typ: 'fritext',
      status: 'klar',
      varde: `${objekt.rum} rok, ${objekt.boarea} m²`,
      kalla: 'mspecs',
    },
    {
      id: 'j_pris',
      fraga: 'Utgångspris',
      typ: 'fritext',
      status: 'klar',
      varde: formatSEK(objekt.pris),
      kalla: 'mspecs',
    },
    {
      id: 'j_bud',
      fraga: 'Budhistorik',
      typ: 'fritext',
      status: budCount ? 'klar' : 'saknas',
      varde: budCount ? `${budCount} bud registrerade` : null,
      kalla: budCount ? 'vitec' : null,
    },
    {
      id: 'j_kopare',
      fraga: 'Köparens uppgifter',
      beskrivning: 'Fullständiga uppgifter om köparen',
      typ: 'fritext',
      status: 'saknas',
      varde: null,
      kalla: null,
    },
    {
      id: 'j_tilltrade',
      fraga: 'Tillträdesdatum',
      beskrivning: 'Önskat datum för tillträde',
      typ: 'fritext',
      status: 'saknas',
      varde: null,
      kalla: null,
    },
  ]
}

/** Completion 0–100 from satisfied requirements. */
export function dokumentProgress(dok: Dokument): number {
  if (dok.krav.length === 0) return 0
  const klara = dok.krav.filter((k) => k.status === 'klar').length
  return Math.round((100 * klara) / dok.krav.length)
}

export function saknadeKrav(dok: Dokument): DokumentKrav[] {
  return dok.krav.filter((k) => k.status !== 'klar')
}

/** Pace signal for the realtor: is the buyer on track or stalling? */
export function dokumentPace(dok: Dokument): {
  status: 'klar' | 'normal' | 'sen'
  label: string
  ton: 'success' | 'warning' | 'muted'
} {
  if (dokumentProgress(dok) >= 100) {
    return { status: 'klar', label: 'Komplett', ton: 'success' }
  }
  const hrs = (Date.now() - new Date(dok.createdAt).getTime()) / 3.6e6
  if (hrs > 48) {
    return { status: 'sen', label: 'Tar ovanligt lång tid', ton: 'warning' }
  }
  return { status: 'normal', label: 'Går som vanligt', ton: 'muted' }
}
