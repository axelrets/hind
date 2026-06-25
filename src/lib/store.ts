import { create } from 'zustand'
import type {
  Objekt,
  Speculant,
  TimelineEvent,
  NextStep,
  StructuredDebrief,
} from './types'
import {
  seedObjekt,
  seedSpeculanter,
  seedTimeline,
  seedNextSteps,
} from './seed'
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
  /** Create a spekulant + timeline event + next step from a debrief. */
  commitDebrief: (objektId: string, d: StructuredDebrief) => CommitResult
  /** Mark a timeline event as synced to Vitec. */
  setSynced: (timelineId: string) => void
  toggleNextStep: (id: string) => void
}

export const useStore = create<HindState>((set) => ({
  objekt: seedObjekt,
  speculanter: seedSpeculanter,
  timeline: seedTimeline,
  nextSteps: seedNextSteps,

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
