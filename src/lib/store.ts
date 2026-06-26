import { create } from 'zustand'
import type {
  Objekt,
  Speculant,
  TimelineEvent,
  NextStep,
  StructuredDebrief,
  Dokument,
  DokumentTyp,
  KravKalla,
} from './types'
import {
  seedObjekt,
  seedSpeculanter,
  seedTimeline,
  seedNextSteps,
  seedDokument,
} from './seed'
import { draftDokumentContent, kravMall } from './dokument'
import { uid } from './utils'

export interface CommitResult {
  speculant: Speculant
  event: TimelineEvent
  nextStep: NextStep
}

interface HindState {
  objekt: Objekt[]
  speculanter: Speculant[]
  timeline: TimelineEvent[]
  nextSteps: NextStep[]
  dokument: Dokument[]
  /** Create a spekulant + timeline event + next step from a debrief. */
  commitDebrief: (objektId: string, d: StructuredDebrief) => CommitResult
  /** Draft (with Hind) a broker document for an object and store it. */
  draftDokument: (objektId: string, typ: DokumentTyp) => Dokument
  /** Satisfy one requirement on a document (buyer answer / upload). */
  answerKrav: (
    dokId: string,
    kravId: string,
    varde: string,
    kalla?: KravKalla,
  ) => void
  /** Mark a timeline event as synced to Vitec. */
  setSynced: (timelineId: string) => void
  toggleNextStep: (id: string) => void
}

export const useStore = create<HindState>((set, get) => ({
  objekt: seedObjekt,
  speculanter: seedSpeculanter,
  timeline: seedTimeline,
  nextSteps: seedNextSteps,
  dokument: seedDokument,

  commitDebrief: (objektId, d) => {
    const now = new Date().toISOString()
    const speculant: Speculant = {
      id: uid('spk'),
      objektId,
      namn: d.namn,
      telefon: d.telefon,
      epost: d.epost,
      budgetMin: d.budgetMin,
      budgetMax: d.budgetMax,
      onskemal: d.onskemal,
      invandningar: d.invandningar,
      intresseniva: d.intresseniva,
      finansiering: d.finansiering,
      kopvilja: d.kopvilja,
      kopmognad: d.kopmognad,
      sammanfattning: d.sammanfattning,
      createdAt: now,
    }
    const event: TimelineEvent = {
      id: uid('tl'),
      objektId,
      speculantId: speculant.id,
      typ: 'rostdebrief',
      titel: `Röstdebrief – ${d.namn}`,
      beskrivning: d.sammanfattning,
      occurredAt: now,
      synced: false,
    }
    const nextStep: NextStep = {
      id: uid('ns'),
      objektId,
      speculantId: speculant.id,
      beskrivning: d.nastaSteg.beskrivning,
      deadline: d.nastaSteg.deadline,
      prioritet: d.nastaSteg.prioritet,
      klar: false,
    }
    set((s) => ({
      speculanter: [speculant, ...s.speculanter],
      timeline: [event, ...s.timeline],
      nextSteps: [nextStep, ...s.nextSteps],
    }))
    return { speculant, event, nextStep }
  },

  draftDokument: (objektId, typ) => {
    const { objekt, speculanter } = get()
    const o = objekt.find((x) => x.id === objektId)
    const dok: Dokument = {
      id: uid('dok'),
      objektId,
      typ,
      status: 'utkast',
      innehall: o
        ? draftDokumentContent(
            typ,
            o,
            speculanter.filter((s) => s.objektId === objektId),
          )
        : '',
      krav: o
        ? kravMall(typ, o, speculanter.filter((s) => s.objektId === objektId))
        : [],
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ dokument: [dok, ...s.dokument] }))
    return dok
  },

  answerKrav: (dokId, kravId, varde, kalla = 'kopare') =>
    set((s) => ({
      dokument: s.dokument.map((d) =>
        d.id !== dokId
          ? d
          : {
              ...d,
              krav: d.krav.map((k) =>
                k.id !== kravId
                  ? k
                  : { ...k, status: 'klar', varde, kalla },
              ),
            },
      ),
    })),

  setSynced: (timelineId) =>
    set((s) => ({
      timeline: s.timeline.map((e) =>
        e.id === timelineId ? { ...e, synced: true } : e,
      ),
    })),

  toggleNextStep: (id) =>
    set((s) => ({
      nextSteps: s.nextSteps.map((n) =>
        n.id === id ? { ...n, klar: !n.klar } : n,
      ),
    })),
}))
