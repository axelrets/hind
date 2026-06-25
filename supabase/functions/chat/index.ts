// Conversational assistant (Hind) via Claude. The agent chats like they would
// with any assistant — to get an overview, draft messages, OR to enter data.
// When the agent describes a showing/prospect, Claude calls `spara_spekulant`
// and the client saves a structured spekulant + nästa steg (the same self-
// filling loop as the voice debrief). Falls back to a canned Swedish reply when
// no key is set or the call fails, so the chat always responds.
import { corsHeaders, json } from '../_shared/cors.ts'

const MODEL = 'claude-sonnet-4-6'

const DEMO_REPLY =
  'Hej! I demoläge svarar jag med ett exempel. Lägg in API-nycklarna i ' +
  'Supabase så kan jag svara på riktigt, ge dig överblick och föra in ' +
  'spekulanter direkt från chatten.'

const SYSTEM =
  'Du är Hind, en lugn och kompetent AI-medhjälpare i en app för svenska ' +
  'fastighetsmäklare. Mäklaren chattar med dig precis som med en assistent: ' +
  'för att få överblick över dagen, prioritera, skriva utkast till sms/mejl, ' +
  'och för att föra in data. När mäklaren berättar om en visning, ett möte ' +
  'eller en spekulant ska du anropa verktyget spara_spekulant för att ' +
  'strukturera och spara informationen – hitta inte på uppgifter som saknas, ' +
  'använd null eller tomma listor. Välj objektId från listan över objekt. ' +
  'Svara alltid kort, vänligt och konkret på svenska. När du sparat något, ' +
  'bekräfta kort vad du gjort och föreslå nästa steg. När mäklaren debriefar ' +
  'efter en visning: agera som en intervjuare. Ställ korta, relevanta ' +
  'följdfrågor för att täcka in varje spekulant – önskemål, invändningar, ' +
  'intresse, lånelöfte/finansiering, budget, tidsplan och om de tänker lägga ' +
  'bud. Fråga om det fanns fler intresserade så att ALLA spekulanter kommer ' +
  'med. Anropa spara_spekulant en gång per spekulant och bedöm köpvilja 0–100 ' +
  '(HET ≥ 70) och köpmognad (budredo/seriös/tidig/oklart).'

const TOOL = {
  name: 'spara_spekulant',
  description:
    'Strukturera och spara en spekulant + nästa steg från det mäklaren ' +
    'berättat. Anropa när ett möte/en visning/en spekulant beskrivs.',
  input_schema: {
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
      kopvilja: {
        type: 'number',
        description: 'AI-bedömd köpvilja 0–100 (HET ≥ 70).',
      },
      kopmognad: { type: 'string', enum: ['budredo', 'seriös', 'tidig', 'oklart'] },
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
      'kopvilja',
      'kopmognad',
      'sammanfattning',
      'nastaSteg',
    ],
  },
}

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const body = await req.json()
    const messages: Turn[] = Array.isArray(body.messages) ? body.messages : []
    const objekt: { id: string; adress: string }[] = Array.isArray(body.objekt)
      ? body.objekt
      : []
    const key = Deno.env.get('ANTHROPIC_API_KEY')

    if (!key || messages.length === 0) {
      return json({ reply: DEMO_REPLY, saved: null, source: 'demo' })
    }

    const objektList = objekt.length
      ? '\n\nTillgängliga objekt:\n' +
        objekt.map((o) => `- ${o.id}: ${o.adress}`).join('\n')
      : ''

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM + objektList,
        tools: [TOOL],
        messages: messages.map((m) => ({
          role: m.role,
          content: String(m.content),
        })),
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Claude error:', error)
      return json({ reply: DEMO_REPLY, saved: null, source: 'demo', error })
    }

    const data = await res.json()
    const blocks: { type: string; text?: string; input?: unknown }[] =
      data.content ?? []
    const reply = blocks
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n')
      .trim()
    const toolBlock = blocks.find((b) => b.type === 'tool_use')
    const saved = toolBlock ? toolBlock.input : null

    return json({
      reply: reply || (saved ? 'Klart – jag har lagt in det.' : ''),
      saved,
      source: 'live',
    })
  } catch (err) {
    console.error('chat failed:', err)
    return json({ reply: DEMO_REPLY, saved: null, source: 'demo', error: String(err) })
  }
})
