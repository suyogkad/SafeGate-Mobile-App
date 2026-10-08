/**
 * Joining a session's video call.
 *
 * The link is issued per participant by the backend and only inside the session's
 * own window, so the app cannot open a room early, late, or for someone who is not
 * part of the session. The app never holds a room URL of its own.
 */
import * as Linking from 'expo-linking';
import { api } from './api';

/** How early the room opens, matching JOIN_EARLY_MINUTES on the server. */
export const JOIN_EARLY_MINUTES = 10;

export type JoinLink = { join_url: string; expires_at: string; is_host: boolean };

export function requestJoinLink(sessionId: string): Promise<JoinLink> {
  return api.post<JoinLink>(`/sessions/${sessionId}/join`);
}

/**
 * Open the call. Returns the message to show when it could not be opened --
 * the backend's own wording ("This session's room is not open yet"), which says
 * what to do, rather than a raw status code (HANDOFF rule 15).
 */
export async function joinCall(sessionId: string): Promise<string | null> {
  try {
    const { join_url } = await requestJoinLink(sessionId);
    await Linking.openURL(join_url);
    return null;
  } catch (e) {
    return e instanceof Error && e.message ? e.message : 'Could not open the video call.';
  }
}

/** True once the room would accept this participant, so the button is not offered early. */
export function callIsOpen(startTime: string, endTime: string, now = Date.now()): boolean {
  const opens = new Date(startTime).getTime() - JOIN_EARLY_MINUTES * 60_000;
  // The server allows a grace period after the end; this only has to stop an
  // obviously dead button, so the scheduled end is close enough.
  return now >= opens && now <= new Date(endTime).getTime() + 15 * 60_000;
}
