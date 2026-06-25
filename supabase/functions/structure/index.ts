// Swedish transcript → structured spekulant + nästa steg via Claude.
// Uses a forced tool call so the model returns strict JSON. Falls back to a
// demo object when no key is set or the call fails.
import { corsHeaders, json } from '../_shared/cors.ts'

const MODEL = 'claude-sonnet-4-6'

function tomorrowAt(hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const DEMO_STRUCTURED = {
  namn: 'Camilla Ahlgren',
  telefon: '070-342 11 19',
  epost: null,
  budgetMin: null,
  budgetMax: 5200000,
  onskemal: ['Läge på Södermalm', 'Balkong', 'Nära Medborgarplatsen'],
  invandningar: ['Badrummet känns slitet'],
  intresseniva: 'hög',
  finansiering: 'lånelöfte',
  kopvilja: 85,
  kopmognad: 'budredo',
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

const SYSTEM =
  'Du är en assistent åt en svensk fastighetsmäklare. Du får en röstdebrief ' +
  '(transkriberad) som mäklaren spelat in efter en visning. Strukturera ' +
  'innehållet om EN spekulant via verktyget. All text ska vara på svenska. ' +
  'Saknas information, använd null eller tom lista – hitta inte på. Bedöm ' +
  'köpvilja 0–100 (hur nära ett köp spekulanten är – väg in finansiering, ' +
  'budget mot pris, uttryckt intresse, invändningar, tidsperspektiv och om ' +
  'bud lagts) och köpmognad (budredo/seriös/tidig/oklart). nastaSteg ska vara ' +
  'mäklarens konkreta nästa åtgärd för att föra affären framåt.'

const TOOL = {
  name: 'spara_spekulant',
  description: 'Spara den strukturerade spekulantprofilen och nästa steg.',
  input_schema: {
    type: 'object',
    properties: {
      namn: { type: 'string' },
      telefon: { type: ['string', 'null'] },
      epost: { type: ['string', 'null'] },
      budgetMin: { type: ['number', 'null'] },
      budgetMax: { type: ['number', 'null'] },
      onskemal: { type: 'array', items: { type: 'string' } },
      invandningar: { type: 'array', items: { type: 'string' } },
      intresseniva: { type: 'string', enum: ['hög', 'medel', 'låg'] },
      finansiering: {
        type: 'string',
        enum: ['kontant', 'lånelöfte', 'oklart'],
      },
      kopvilja: {
        type: 'number',
        description: 'AI-bedömd köpvilja 0–100 (HET ≥ 70).',
      },
      kopmognad: {
        type: 'string',
        enum: ['budredo', 'seriös', 'tidig', 'oklart'],
      },
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { transcript } = await req.json()
    const key = Deno.env.get('ANTHROPIC_API_KEY')

    if (!key || !transcript) {
      return json({ data: DEMO_STRUCTURED, source: 'demo' })
    }

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
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'spara_spekulant' },
        messages: [{ role: 'user', content: String(transcript) }],
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Claude error:', error)
      return json({ data: DEMO_STRUCTURED, source: 'demo', error })
    }

    const data = await res.json()
    const block = (data.content ?? []).find(
      (b: { type: string }) => b.type === 'tool_use',
    )
    if (!block) {
      return json({ data: DEMO_STRUCTURED, source: 'demo' })
    }
    return json({ data: block.input, source: 'live' })
  } catch (err) {
    console.error('structure failed:', err)
    return json({ data: DEMO_STRUCTURED, source: 'demo', error: String(err) })
  }
})
