import { supabaseEnabled, supabaseAnonKey, functionUrl } from './supabase'
import type { StructuredDebrief } from './types'

export type AiSource = 'live' | 'demo'

export interface TranscribeResult {
  transcript: string
  source: AiSource
}

export interface StructureResult {
  data: StructuredDebrief
  source: AiSource
}

function tomorrowAt(hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Used when no Supabase/keys are configured, or if a live call fails — so the
// demo is always clickable end-to-end. Transcript and structured output match.
export const DEMO_TRANSCRIPT =
  'Okej, precis klar med visningen på Götgatan 12. En ny spekulant, ' +
  'Camilla Ahlgren, var där med sin sambo. Jätteintresserad – hon sa att ' +
  'läget på Söder är precis vad de letat efter, och hon gillade balkongen ' +
  'och att det är nära Medborgarplatsen. Lite tveksam till badrummet, tyckte ' +
  'det kändes slitet. De har lånelöfte på runt fem komma två miljoner. Hennes ' +
  'nummer är noll sju noll, tre fyra två, elva nitton. Jag lovade att höra av ' +
  'mig imorgon med föreningens årsredovisning och boka en andra visning. Hon ' +
  'verkar redo att lägga bud om allt känns rätt.'

export const DEMO_STRUCTURED: StructuredDebrief = {
  namn: 'Camilla Ahlgren',
  telefon: '070-342 11 19',
  epost: null,
  budgetMin: null,
  budgetMax: 5_200_000,
  onskemal: ['Läge på Södermalm', 'Balkong', 'Nära Medborgarplatsen'],
  invandningar: ['Badrummet känns slitet'],
  intresseniva: 'hög',
  finansiering: 'lånelöfte',
  sammanfattning:
    'Ny spekulant från visningen på Götgatan 12, där med sin sambo. Mycket ' +
    'intresserad av läget och balkongen, men tveksam till badrummet. Lånelöfte ' +
    'på ca 5,2 mkr och verkar redo att lägga bud.',
  nastaSteg: {
    beskrivning:
      'Skicka föreningens årsredovisning till Camilla och boka en andra visning',
    deadline: tomorrowAt(11),
    prioritet: 'hög',
  },
}

/** Audio → transcript. Calls the Whisper Edge Function, else demo fallback. */
export async function transcribe(blob: Blob): Promise<TranscribeResult> {
  if (!supabaseEnabled) {
    await wait(900)
    return { transcript: DEMO_TRANSCRIPT, source: 'demo' }
  }
  try {
    const res = await fetch(functionUrl('transcribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'content-type': blob.type || 'audio/webm',
      },
      body: blob,
    })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    const json = await res.json()
    return {
      transcript: String(json.transcript ?? ''),
      source: json.source === 'demo' ? 'demo' : 'live',
    }
  } catch (err) {
    console.warn('transcribe() föll tillbaka till demo:', err)
    return { transcript: DEMO_TRANSCRIPT, source: 'demo' }
  }
}

/** Transcript → structured spekulant + nästa steg via Claude, else fallback. */
export async function structure(transcript: string): Promise<StructureResult> {
  if (!supabaseEnabled) {
    await wait(1100)
    return { data: DEMO_STRUCTURED, source: 'demo' }
  }
  try {
    const res = await fetch(functionUrl('structure'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ transcript }),
    })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    const json = await res.json()
    const data = (json.data ?? json) as StructuredDebrief
    return { data, source: json.source === 'demo' ? 'demo' : 'live' }
  } catch (err) {
    console.warn('structure() föll tillbaka till demo:', err)
    return { data: DEMO_STRUCTURED, source: 'demo' }
  }
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Structured spekulant Claude saved straight from the chat (incl. its objekt). */
export type ChatSaved = StructuredDebrief & { objektId: string }

export interface ChatResult {
  reply: string
  saved: ChatSaved | null
  source: AiSource
}

const DEMO_CHAT_REPLY =
  'I demoläge svarar jag med ett exempel. Koppla på Supabase + API-nycklar ' +
  'så kan jag svara på riktigt – ge dig överblick, skriva utkast och föra in ' +
  'spekulanter direkt här i chatten.'

/** Chat with Hind. Claude may save a spekulant via tool use (ChatSaved). */
export async function chat(
  messages: ChatTurn[],
  objekt: { id: string; adress: string }[],
): Promise<ChatResult> {
  if (!supabaseEnabled) {
    await wait(700)
    return { reply: DEMO_CHAT_REPLY, saved: null, source: 'demo' }
  }
  try {
    const res = await fetch(functionUrl('chat'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ messages, objekt }),
    })
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
    const json = await res.json()
    return {
      reply: String(json.reply ?? ''),
      saved: (json.saved as ChatSaved | null) ?? null,
      source: json.source === 'demo' ? 'demo' : 'live',
    }
  } catch (err) {
    console.warn('chat() föll tillbaka till demo:', err)
    return { reply: DEMO_CHAT_REPLY, saved: null, source: 'demo' }
  }
}
