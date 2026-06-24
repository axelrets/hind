// Mints a short-lived ephemeral token the browser uses to open a WebRTC
// connection to the OpenAI Realtime API. The real OPENAI_API_KEY stays here on
// the server and never reaches the client. Returns { source: 'demo' } when no
// key is set, so the audio room can fall back to the one-shot debrief.
import { corsHeaders, json } from '../_shared/cors.ts'

// ── Volatile bits: if your OpenAI account's Realtime API differs, tweak here ──
const MODEL = 'gpt-realtime' // fallback model: 'gpt-4o-realtime-preview'
const VOICE = 'marin' // alt: 'cedar', 'alloy', 'sage', 'verse'
const CLIENT_SECRETS_URL = 'https://api.openai.com/v1/realtime/client_secrets'
const SESSIONS_URL = 'https://api.openai.com/v1/realtime/sessions' // beta fallback

// Hind's debrief persona. Two modes: guided (asks questions) and free (listens).
function instructions(mode: string, objektList: string): string {
  const base =
    'Du är Hind, en varm och kompetent AI-medhjälpare åt en svensk ' +
    'fastighetsmäklare. Du hjälper mäklaren att debriefa direkt efter en ' +
    'visning. Prata naturlig, ledig svenska. Använd kundernas namn om de ' +
    'nämns. När du har tillräckligt, anropa verktyget spara_spekulant med ' +
    'strukturerad info (hitta inte på – använd null/tomma listor) och välj ' +
    'objektId från listan. Bekräfta sedan kort vad du fångat och föreslå ' +
    'nästa steg.' +
    objektList
  if (mode === 'free') {
    return (
      base +
      ' Just nu vill mäklaren prata fritt. Var tyst och lyssna, avbryt inte. ' +
      'Bekräfta bara kort vid behov. När mäklaren tystnat klart: sammanfatta ' +
      'kort och anropa spara_spekulant.'
    )
  }
  return (
    base +
    ' Inled med en kort hälsning och ställ EN fråga i taget: 1) Hur reagerade ' +
    'kunderna på bostaden? 2) Hade de konkreta invändningar eller oro? ' +
    '3) Vad är nästa steg – återkomma, lägga bud, eller släppa? Avsluta med ' +
    '"Något mer viktigt?". Håll det under tre minuter och var varm, inte robotisk.'
  )
}

const TOOL = {
  type: 'function',
  name: 'spara_spekulant',
  description:
    'Strukturera och spara en spekulant + nästa steg från debriefen. Anropa ' +
    'när du har tillräckligt om spekulanten.',
  parameters: {
    type: 'object',
    properties: {
      objektId: {
        type: 'string',
        description: 'Objektets id från listan över tillgängliga objekt.',
      },
      namn: { type: 'string' },
      telefon: { type: ['string', 'null'] },
      epost: { type: ['string', 'null'] },
      budgetMin: { type: ['number', 'null'] },
      budgetMax: { type: ['number', 'null'] },
      onskemal: { type: 'array', items: { type: 'string' } },
      invandningar: { type: 'array', items: { type: 'string' } },
      intresseniva: { type: 'string', enum: ['hög', 'medel', 'låg'] },
      finansiering: { type: 'string', enum: ['kontant', 'lånelöfte', 'oklart'] },
      sammanfattning: { type: 'string' },
      nastaSteg: {
        type: 'object',
        properties: {
          beskrivning: { type: 'string' },
          deadline: { type: ['string', 'null'] },
          prioritet: { type: 'string', enum: ['hög', 'medel', 'låg'] },
        },
        required: ['beskrivning', 'deadline', 'prioritet'],
      },
    },
    required: [
      'objektId',
      'namn',
      'telefon',
      'epost',
      'budgetMin',
      'budgetMax',
      'onskemal',
      'invandningar',
      'intresseniva',
      'finansiering',
      'sammanfattning',
      'nastaSteg',
    ],
  },
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const key = Deno.env.get('OPENAI_API_KEY')
    if (!key) return json({ source: 'demo' })

    const body = await req.json().catch(() => ({}))
    const objekt: { id: string; adress: string }[] = Array.isArray(body.objekt)
      ? body.objekt
      : []
    const mode = body.mode === 'free' ? 'free' : 'guided'
    const objektList = objekt.length
      ? '\n\nTillgängliga objekt:\n' +
        objekt.map((o) => `- ${o.id}: ${o.adress}`).join('\n')
      : ''
    const instr = instructions(mode, objektList)

    const headers = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    }

    // Preferred: GA client_secrets endpoint ({ value, expires_at }).
    let res = await fetch(CLIENT_SECRETS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: MODEL,
          instructions: instr,
          audio: {
            input: {
              transcription: { model: 'whisper-1' },
              turn_detection: { type: 'server_vad', silence_duration_ms: 700 },
            },
            output: { voice: VOICE },
          },
          tools: [TOOL],
          tool_choice: 'auto',
        },
      }),
    })

    // Fallback: beta sessions endpoint ({ client_secret: { value, expires_at } }).
    if (!res.ok) {
      const firstErr = await res.text()
      console.warn('client_secrets failed, trying sessions:', firstErr)
      res = await fetch(SESSIONS_URL, {
        method: 'POST',
        headers: { ...headers, 'OpenAI-Beta': 'realtime=v1' },
        body: JSON.stringify({
          model: MODEL,
          voice: VOICE,
          instructions: instr,
          modalities: ['audio', 'text'],
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad', silence_duration_ms: 700 },
          tools: [TOOL],
          tool_choice: 'auto',
        }),
      })
    }

    if (!res.ok) {
      const error = await res.text()
      console.error('Realtime session error:', error)
      return json({ source: 'demo', error })
    }

    const data = await res.json()
    const token = data.value ?? data.client_secret?.value ?? null
    const expiresAt = data.expires_at ?? data.client_secret?.expires_at ?? null
    if (!token) return json({ source: 'demo', error: 'no token in response' })

    return json({ token, expiresAt, model: MODEL, voice: VOICE, source: 'live' })
  } catch (err) {
    console.error('realtime-session failed:', err)
    return json({ source: 'demo', error: String(err) })
  }
})
