import { supabase } from './supabase'
import type { CommitResult } from './store'
import type { StructuredDebrief } from './types'
import { uid } from './utils'

// Best-effort persistence to Supabase. Never throws — the demo runs fine on the
// local store alone; this just lands the captured comms in Postgres when a real
// project is connected (the capture half of the data/feedback loop).
export async function persistDebrief(
  objektId: string,
  structured: StructuredDebrief,
  transcript: string,
  committed: CommitResult,
): Promise<void> {
  if (!supabase) return
  const { speculant, event, nextStep } = committed
  try {
    await supabase.from('speculant').insert({
      id: speculant.id,
      objekt_id: objektId,
      namn: speculant.namn,
      telefon: speculant.telefon,
      epost: speculant.epost,
      budget_min: speculant.budgetMin,
      budget_max: speculant.budgetMax,
      onskemal: speculant.onskemal,
      invandningar: speculant.invandningar,
      intresseniva: speculant.intresseniva,
      finansiering: speculant.finansiering,
      sammanfattning: speculant.sammanfattning,
      created_at: speculant.createdAt,
    })
    await supabase.from('timeline_event').insert({
      id: event.id,
      objekt_id: objektId,
      speculant_id: speculant.id,
      typ: event.typ,
      titel: event.titel,
      beskrivning: event.beskrivning,
      occurred_at: event.occurredAt,
      synced: true,
    })
    await supabase.from('next_step').insert({
      id: nextStep.id,
      objekt_id: objektId,
      speculant_id: speculant.id,
      beskrivning: nextStep.beskrivning,
      deadline: nextStep.deadline,
      prioritet: nextStep.prioritet,
      klar: false,
    })
    await supabase.from('debrief').insert({
      id: uid('dbf'),
      objekt_id: objektId,
      speculant_id: speculant.id,
      transcript,
      structured,
      created_at: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('persistDebrief() kunde inte skriva till Supabase:', err)
  }
}
