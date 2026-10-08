/**
 * What a parent reads about their child's sessions.
 *
 * Session notes come from a different endpoint than the therapist's own, and that
 * is the point: this shape has no working-notes field at all, so the therapist's
 * private notes cannot reach a family even by mistake (HANDOFF rule 21).
 */
import { api } from '../lib/api';
import type { ApiNoteHighlight, ApiNoteSuggestion, ApiSession } from './therapist';

export type ApiSharedNotes = {
  session_id: string;
  therapist_name: string | null;
  highlights: ApiNoteHighlight[];
  shared: string;
  try_at_home: ApiNoteSuggestion[];
  shared_at: string;
};

/** The parent's own children's sessions. */
export function listFamilySessions(): Promise<ApiSession[]> {
  return api.get<ApiSession[]>('/sessions');
}

/** 404 until the therapist shares them, which is what "notes coming" means. */
export function getSharedNotes(sessionId: string): Promise<ApiSharedNotes> {
  return api.get<ApiSharedNotes>(`/sessions/${sessionId}/shared-notes`);
}
