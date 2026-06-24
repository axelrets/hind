// Browser-side WebRTC controller for a live voice conversation with Hind via
// the OpenAI Realtime API. The screen (Rum.tsx) drives this; all the WebRTC
// plumbing and event parsing lives here.
//
// VOLATILE: if your account's Realtime API path differs, this base URL is the
// one-line tweak (some GA accounts use `/v1/realtime/calls`).
const REALTIME_BASE = 'https://api.openai.com/v1/realtime'

export type RoomState =
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'thinking'
  | 'ended'
  | 'error'

export interface RealtimeHandlers {
  onState?: (s: RoomState) => void
  onUserTranscript?: (text: string) => void
  onHindCaption?: (text: string) => void
  onError?: (msg: string) => void
}

export interface FinishResult {
  saved: Record<string, unknown> | null
  transcript: string
}

export class HindRealtime {
  private pc: RTCPeerConnection | null = null
  private dc: RTCDataChannel | null = null
  private mic: MediaStream | null = null
  private audioEl: HTMLAudioElement | null = null

  private hindBuffer = ''
  private transcript = ''
  private savedArgs: Record<string, unknown> | null = null
  private finishResolve: ((r: FinishResult) => void) | null = null

  private h: RealtimeHandlers
  constructor(handlers: RealtimeHandlers) {
    this.h = handlers
  }

  /** Open the mic + WebRTC connection and have Hind greet first (guided mode). */
  async connect(token: string, model: string, mode: 'guided' | 'free') {
    this.h.onState?.('connecting')
    const pc = new RTCPeerConnection()
    this.pc = pc

    const audioEl = document.createElement('audio')
    audioEl.autoplay = true
    audioEl.style.display = 'none'
    document.body.appendChild(audioEl)
    this.audioEl = audioEl
    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0]
    }

    const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.mic = mic
    mic.getTracks().forEach((t) => pc.addTrack(t, mic))

    const dc = pc.createDataChannel('oai-events')
    this.dc = dc
    dc.addEventListener('message', (e) => this.onEvent(e.data as string))
    dc.addEventListener('open', () => {
      this.setMode(mode)
      if (mode === 'guided') this.send({ type: 'response.create' })
      this.h.onState?.('listening')
    })

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    const resp = await fetch(
      `${REALTIME_BASE}?model=${encodeURIComponent(model)}`,
      {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
      },
    )
    if (!resp.ok) {
      throw new Error(`SDP exchange failed: ${resp.status} ${await resp.text()}`)
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: await resp.text() })
  }

  private send(obj: unknown) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(obj))
  }

  /** Guided = Hind replies after each turn; free = Hind stays quiet and listens. */
  setMode(mode: 'guided' | 'free') {
    this.send({
      type: 'session.update',
      session: {
        audio: {
          input: {
            turn_detection: {
              type: 'server_vad',
              silence_duration_ms: 700,
              create_response: mode === 'guided',
            },
          },
        },
      },
    })
  }

  toggleMute(muted: boolean) {
    this.mic?.getAudioTracks().forEach((t) => (t.enabled = !muted))
  }

  /** Ask Hind to wrap up + emit spara_spekulant, then resolve with the result. */
  finish(): Promise<FinishResult> {
    this.h.onState?.('thinking')
    this.send({
      type: 'response.create',
      response: {
        instructions:
          'Sammanfatta nu kort vad du fångat och anropa verktyget ' +
          'spara_spekulant med all strukturerad info.',
      },
    })
    return new Promise((resolve) => {
      this.finishResolve = resolve
      window.setTimeout(() => this.settleFinish(), 12000)
    })
  }

  private settleFinish() {
    if (!this.finishResolve) return
    const resolve = this.finishResolve
    this.finishResolve = null
    resolve({ saved: this.savedArgs, transcript: this.transcript.trim() })
  }

  private onEvent(raw: string) {
    let ev: { type?: string; [k: string]: unknown }
    try {
      ev = JSON.parse(raw)
    } catch {
      return
    }
    switch (ev.type) {
      case 'response.audio_transcript.delta':
      case 'response.output_audio_transcript.delta':
        this.hindBuffer += (ev.delta as string) ?? ''
        this.h.onHindCaption?.(this.hindBuffer)
        this.h.onState?.('speaking')
        break
      case 'response.audio_transcript.done':
      case 'response.output_audio_transcript.done':
        if (this.hindBuffer) this.transcript += `Hind: ${this.hindBuffer}\n`
        this.hindBuffer = ''
        break
      case 'input_audio_buffer.speech_started':
        this.h.onState?.('listening')
        break
      case 'conversation.item.input_audio_transcription.completed': {
        const t = (ev.transcript as string) ?? ''
        if (t) {
          this.transcript += `Mäklare: ${t}\n`
          this.h.onUserTranscript?.(t)
        }
        break
      }
      case 'response.function_call_arguments.done':
        try {
          this.savedArgs = JSON.parse((ev.arguments as string) ?? '{}')
        } catch {
          /* ignore */
        }
        this.settleFinish()
        break
      case 'response.done':
        if (this.finishResolve) this.settleFinish()
        break
      case 'error':
        this.h.onError?.(
          ((ev.error as { message?: string })?.message) ?? 'Realtime-fel',
        )
        break
    }
  }

  stop() {
    this.h.onState?.('ended')
    try {
      this.dc?.close()
    } catch {
      /* ignore */
    }
    this.mic?.getTracks().forEach((t) => t.stop())
    try {
      this.pc?.close()
    } catch {
      /* ignore */
    }
    this.audioEl?.remove()
    this.pc = null
    this.dc = null
    this.mic = null
    this.audioEl = null
  }
}
