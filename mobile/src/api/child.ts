/**
 * What the child's own app may ask the backend about itself.
 *
 * The child's device token carries no role and can never reach an adult route, and
 * nothing here returns a risk level, a score or anything the classifier said (HANDOFF
 * rule 5). The child is told what grown-ups have done, never how they were assessed.
 */
import { api } from '../lib/api';

export type ApiCalmState = {
  /** True while there is something a grown-up was told about. */
  active: boolean;
  /** True once a grown-up who looks after the child has seen it. */
  seen_by_grown_up: boolean;
  /** True once one of them said they asked emergency services to help. */
  emergency_requested: boolean;
  started_at: string | null;
};

export function getCalmState(): Promise<ApiCalmState> {
  return api.get<ApiCalmState>('/companion/calm-state');
}

// ---- The child's own records --------------------------------------------

/** What the child's app is told back after saving. `calm` is whether to switch to
 * calm steps; it is never told why (rule 5). */
export type ApiSaved = { id: string; created_at: string; calm: boolean };

export function saveCheckin(input: {
  mood: string;
  words: string[];
  topics: string[];
  note?: string | null;
}): Promise<ApiSaved> {
  return api.post<ApiSaved>('/companion/checkins', input);
}

export type ApiJournalEntry = {
  id: string;
  created_at: string;
  prompt: string | null;
  text: string;
  device_id: string | null;
};

/** Free text, so it goes through the safety layer before it is saved. */
export function saveJournalEntry(text: string, prompt?: string | null): Promise<ApiSaved> {
  return api.post<ApiSaved>('/companion/journal', { text, prompt: prompt ?? null });
}

export function myJournal(): Promise<ApiJournalEntry[]> {
  return api.get<ApiJournalEntry[]>('/companion/my-journal');
}

// ---- The child's own sessions -------------------------------------------

/** Smaller than the adults' view on purpose: when it is, how, and who with. */
export type ApiChildSession = {
  id: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled' | 'completed';
  meeting_kind: 'video' | 'in_person';
  therapist_name: string | null;
  clinic_name: string | null;
};

export function mySessions(): Promise<ApiChildSession[]> {
  return api.get<ApiChildSession[]>('/companion/my-sessions');
}
