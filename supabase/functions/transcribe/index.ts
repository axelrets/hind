// Audio → Swedish transcript via OpenAI Whisper.
// Falls back to a demo transcript when no key is set or the call fails, so the
// front-end flow always completes.
import { corsHeaders, json } from '../_shared/cors.ts'

const DEMO_TRANSCRIPT =
  'Okej, precis klar med visningen på Götgatan 12. En ny spekulant, ' +
  'Camilla Ahlgren, var där med sin sambo. Jätteintresserad – hon sa att ' +
  'läget på Söder är precis vad de letat efter, och hon gillade balkongen ' +
  'och att det är nära Medborgarplatsen. Lite tveksam till badrummet. De har ' +
  'lånelöfte på runt fem komma två miljoner. Hennes nummer är noll sju noll, ' +
  'tre fyra två, elva nitton. Jag lovade att höra av mig imorgon med ' +
  'föreningens årsredovisning och boka en andra visning.'

// Whisper `prompt` is a ~224-token vocabulary bias, NOT an instruction prompt.
const VOCAB_BIAS =
  'Mäklare, visning, spekulant, budgivning, bud, lånelöfte, kontantköpare, ' +
  'bostadsrätt, förening, månadsavgift, Södermalm, Vasastan, Hornstull, ' +
  'Kungsholmen, kvadratmeter, balkong, Mäklarbild, Vitec.'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const key = Deno.env.get('OPENAI_API_KEY')
    const audio = await req.arrayBuffer()

    // No key or essentially-empty audio → demo transcript.
    if (!key || audio.byteLength < 2000) {
      return json({ transcript: DEMO_TRANSCRIPT, source: 'demo' })
    }

    const contentType = req.headers.get('content-type') ?? 'audio/webm'
    const ext = contentType.includes('mp4')
      ? 'mp4'
      : contentType.includes('mpeg')
        ? 'mp3'
        : contentType.includes('wav')
          ? 'wav'
          : 'webm'

    const form = new FormData()
    form.append('file', new Blob([audio], { type: contentType }), `debrief.${ext}`)
    form.append('model', 'whisper-1')
    form.append('language', 'sv')
    form.append('prompt', VOCAB_BIAS)

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    })

    if (!res.ok) {
      const error = await res.text()
      console.error('Whisper error:', error)
      return json({ transcript: DEMO_TRANSCRIPT, source: 'demo', error })
    }

    const data = await res.json()
    return json({ transcript: data.text ?? '', source: 'live' })
  } catch (err) {
    console.error('transcribe failed:', err)
    return json({ transcript: DEMO_TRANSCRIPT, source: 'demo', error: String(err) })
  }
})
