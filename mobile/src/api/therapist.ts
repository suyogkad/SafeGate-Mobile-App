/**
 * What a therapist's own screens read from the backend.
 *
 * A therapist only ever sees children assigned to them and sessions that are theirs;
 * that is enforced on the server, not by filtering here.
 */
import { api } from '../lib/api';
import type { ApiChild } from './children';

export type ApiSession = {
  id: string;
  child_id: string;
  therapist_id: string;
  availability_slot_id: string;
  start_time: string;
  end_time: string;
  status: 'booked' | 'cancelled' | 'completed';
  /** Chosen by the family when they booked. */
  meeting_kind: 'video' | 'in_person';
  video_room_url: string | null;
  created_at: string;
  child_name: string | null;
  therapist_name: string | null;
  /** When the therapist shared notes with the family, if they have. */
  notes_shared_at: string | null;
  /** Whether anything is written yet. Only the session's own therapist is told. */
  notes_written: boolean | null;
};

export type ApiSlot = {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  created_at: string;
};

/** The children assigned to the signed-in therapist. */
export function listMyClients(): Promise<ApiChild[]> {
  return api.get<ApiChild[]>('/children');
}

export function listMySessions(): Promise<ApiSession[]> {
  return api.get<ApiSession[]>('/sessions');
}

export function listMyOpenTimes(therapistId: string): Promise<ApiSlot[]> {
  return api.get<ApiSlot[]>(`/availability/${therapistId}`);
}

export function addOpenTime(startTime: string, endTime: string): Promise<ApiSlot> {
  return api.post<ApiSlot>('/availability', { start_time: startTime, end_time: endTime });
}

export function removeOpenTime(slotId: string): Promise<void> {
  return api.delete<void>(`/availability/${slotId}`);
}

/** A safety alert about one of this therapist's clients. Says what happened, never
 * what the child wrote. */
export type ApiTherapistAlert = {
  id: string;
  child_id: string;
  child_name: string | null;
  level: 'concern' | 'urgent';
  timestamp: string;
  /** Null until the family taps "I've seen this". */
  parent_seen_at: string | null;
  noted_at: string | null;
};

export function listMyAlerts(needsAttention = false): Promise<ApiTherapistAlert[]> {
  return api.get<ApiTherapistAlert[]>(`/therapist/alerts${needsAttention ? '?needs_attention=true' : ''}`);
}

/** Clears it from this therapist's own list. Nobody else is affected. */
export function noteAlert(alertId: string): Promise<void> {
  return api.post<void>(`/therapist/alerts/${alertId}/note`);
}

/** One session, by id, from the backend rather than the calendar list. */
export function getSession(sessionId: string): Promise<ApiSession> {
  return api.get<ApiSession>(`/sessions/${sessionId}`);
}

// ---- Session notes -------------------------------------------------------

export type ApiNoteHighlight = { emoji: string; text: string };
export type ApiNoteSuggestion = { title: string; line: string };

/** The therapist's own view of their notes: both parts. */
export type ApiSessionNotes = {
  session_id: string;
  highlights: ApiNoteHighlight[];
  shared: string;
  try_at_home: ApiNoteSuggestion[];
  /** Only the therapist ever receives this field (HANDOFF rule 21). */
  working: string;
  /** Null while it is still a draft. */
  shared_at: string | null;
  updated_at: string | null;
};

export type SessionNotesDraft = {
  highlights: ApiNoteHighlight[];
  shared: string;
  try_at_home: ApiNoteSuggestion[];
  working: string;
};

export function getSessionNotes(sessionId: string): Promise<ApiSessionNotes> {
  return api.get<ApiSessionNotes>(`/sessions/${sessionId}/notes`);
}

/** Saves a draft. Nothing reaches the family until shareSessionNotes. */
export function saveSessionNotes(sessionId: string, draft: SessionNotesDraft): Promise<ApiSessionNotes> {
  return api.put<ApiSessionNotes>(`/sessions/${sessionId}/notes`, draft);
}

export function shareSessionNotes(sessionId: string): Promise<ApiSessionNotes> {
  return api.post<ApiSessionNotes>(`/sessions/${sessionId}/notes/share`);
}

// ---- The therapist's own profile and hours -------------------------------

export type ApiGoodFor = { emoji: string; text: string };
export type ApiClinic = { name: string; address: string };
export type ApiTimeRange = { start: number; end: number };
export type ApiTimeOff = { id: string; from_date: string; to_date: string; label: string };

export type ApiWorkingHours = {
  weekly: Record<string, ApiTimeRange[]>;
  session_length_min: number;
  gap_min: number;
  offers_video: boolean;
  offers_in_person: boolean;
  booking_window_weeks: number;
  notice_days: number;
  timezone: string;
  time_off: ApiTimeOff[];
  /** How many times families can see right now, after the last rebuild. */
  open_times: number;
};

export type ApiNotifyPrefs = { bookings: boolean; sharing: boolean; notes_reminders: boolean };

export type ApiTherapistMe = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  title: string;
  years_with_kids: number | null;
  blurb: string;
  tagline: string;
  about: string;
  good_for: ApiGoodFor[];
  clinic: ApiClinic | null;
  /** Safety alerts are deliberately not here: they always reach the therapist. */
  notify: ApiNotifyPrefs;
  hours: ApiWorkingHours;
};

export type TherapistProfileDraft = {
  title: string;
  years_with_kids: number | null;
  blurb: string;
  tagline: string;
  about: string;
  good_for: ApiGoodFor[];
  clinic_name: string | null;
  clinic_address: string | null;
};

export type WorkingHoursDraft = {
  weekly: Record<string, ApiTimeRange[]>;
  session_length_min: number;
  gap_min: number;
  offers_video: boolean;
  offers_in_person: boolean;
  booking_window_weeks: number;
  notice_days: number;
  timezone: string;
};

export function saveNotifyPrefs(prefs: ApiNotifyPrefs): Promise<ApiTherapistMe> {
  return api.put<ApiTherapistMe>('/therapist/notify', prefs);
}

export function getMe(): Promise<ApiTherapistMe> {
  return api.get<ApiTherapistMe>('/therapist/me');
}

export function saveProfile(draft: TherapistProfileDraft): Promise<ApiTherapistMe> {
  return api.put<ApiTherapistMe>('/therapist/me', draft);
}

/** Saving hours rebuilds the open times. Booked sessions are never moved. */
export function saveHours(draft: WorkingHoursDraft): Promise<ApiWorkingHours> {
  return api.put<ApiWorkingHours>('/therapist/hours', draft);
}

export function addTimeOff(fromDate: string, toDate: string, label: string): Promise<ApiWorkingHours> {
  return api.post<ApiWorkingHours>('/therapist/time-off', { from_date: fromDate, to_date: toDate, label });
}

export function removeTimeOff(entryId: string): Promise<ApiWorkingHours> {
  return api.delete<ApiWorkingHours>(`/therapist/time-off/${entryId}`);
}

// ---- Goals ---------------------------------------------------------------

export type ApiGoals = { child_id: string; goals: string[]; updated_at: string | null };

export function getGoals(childId: string): Promise<ApiGoals> {
  return api.get<ApiGoals>(`/children/${childId}/goals`);
}

/** Only the child's own therapist may write these. */
export function saveGoals(childId: string, goals: string[]): Promise<ApiGoals> {
  return api.put<ApiGoals>(`/children/${childId}/goals`, { goals });
}
