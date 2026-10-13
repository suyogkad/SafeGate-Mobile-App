/**
 * What a parent reads about their child's sessions.
 *
 * Session notes come from a different endpoint than the therapist's own, and that
 * is the point: this shape has no working-notes field at all, so the therapist's
 * private notes cannot reach a family even by mistake (HANDOFF rule 21).
 */
import { api } from '../lib/api';
import type { ApiNoteHighlight, ApiNoteSuggestion, ApiSession, ApiSlot } from './therapist';

// The parent's screens work with the same session and slot shapes the therapist's do.
export type { ApiSession, ApiSlot } from './therapist';

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

// ---- Safety alerts -------------------------------------------------------

/**
 * One safety alert about this parent's own child.
 *
 * `level` is here because the parent's Alert screen shows it and the child's app
 * never does (rule 5). It carries no message text: an alert says what happened,
 * not what was said. Reading the conversation is a separate, deliberate step.
 */
export type ApiParentAlert = {
  id: string;
  child_id: string;
  child_name: string | null;
  level: 'concern' | 'urgent';
  timestamp: string;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
  emergency_requested_at: string | null;
  emergency_requested_by_name: string | null;
  /** "Priya Shah, Alex's therapist", or null when no therapist is assigned. */
  also_told: string | null;
};

export function listChildAlerts(childId: string, openOnly = false): Promise<ApiParentAlert[]> {
  return api.get<ApiParentAlert[]>(`/children/${childId}/alerts${openOnly ? '?open_only=true' : ''}`);
}

/** "I've seen this". This is what lets the child's app say someone who looks
 * after them has seen it, so it has to be the parent's own action. */
export function acknowledgeAlert(childId: string, alertId: string): Promise<ApiParentAlert> {
  return api.post<ApiParentAlert>(`/children/${childId}/alerts/${alertId}/acknowledge`);
}

/**
 * Records that this parent asked emergency services to help their child.
 * **SafeGate contacts nobody.** The record exists so the child can be told plainly
 * what is happening and so there is an account of who decided (rule 17).
 */
export function recordEmergencyRequest(childId: string, alertId: string): Promise<ApiParentAlert> {
  return api.post<ApiParentAlert>(`/children/${childId}/alerts/${alertId}/emergency-services`);
}

// ---- The child's chats ---------------------------------------------------

/** One exchange, as the child's own parent may read it. The child is told plainly
 * that their grown-up can read this (rule 3), so the parent gets the real words. */
export type ApiConversationTurn = {
  id: string;
  timestamp: string;
  child_message: string;
  reply: string;
  flagged: boolean;
  risk_level: string;
  device_id: string | null;
  device_label: string | null;
};

export function readChildConversations(childId: string, limit = 100): Promise<ApiConversationTurn[]> {
  return api.get<ApiConversationTurn[]>(`/children/${childId}/conversations?limit=${limit}`);
}

// ---- Choosing and booking a therapist -----------------------------------

export type ApiTherapistPublic = {
  id: string;
  full_name: string;
  title: string;
  years_with_kids: number | null;
  blurb: string;
  tagline: string;
  about: string;
  good_for: { emoji: string; text: string }[];
  clinic: { name: string; address: string } | null;
  offers_video: boolean;
  offers_in_person: boolean;
  session_length_min: number;
};

export function listTherapists(): Promise<ApiTherapistPublic[]> {
  return api.get<ApiTherapistPublic[]>('/therapists');
}

export function getTherapist(therapistId: string): Promise<ApiTherapistPublic> {
  return api.get<ApiTherapistPublic>(`/therapists/${therapistId}`);
}

/** A therapist's open times, worked out by the backend from their hours. */
export function listOpenTimes(therapistId: string): Promise<ApiSlot[]> {
  return api.get<ApiSlot[]>(`/availability/${therapistId}`);
}

export function bookSession(
  childId: string,
  slotId: string,
  meetingKind: 'video' | 'in_person',
): Promise<ApiSession> {
  return api.post<ApiSession>('/sessions', {
    child_id: childId,
    availability_slot_id: slotId,
    meeting_kind: meetingKind,
  });
}

export function cancelSession(sessionId: string): Promise<ApiSession> {
  return api.post<ApiSession>(`/sessions/${sessionId}/cancel`);
}

/** A child's goals, written by their therapist in words a family would recognise. */
export function readGoals(childId: string): Promise<{ child_id: string; goals: string[] }> {
  return api.get<{ child_id: string; goals: string[] }>(`/children/${childId}/goals`);
}

// ---- What this account hears about --------------------------------------

/** Safety alerts are deliberately absent: an alert about a child always reaches
 * their parent and cannot be switched off. */
export type ApiParentNotify = { sessions: boolean; each_activity: boolean; digest: boolean };

export function getNotifyPrefs(): Promise<ApiParentNotify> {
  return api.get<ApiParentNotify>('/auth/me/notify');
}

export function saveNotifyPrefs(prefs: ApiParentNotify): Promise<ApiParentNotify> {
  return api.put<ApiParentNotify>('/auth/me/notify', prefs);
}
