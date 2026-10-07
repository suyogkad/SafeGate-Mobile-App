/** The parent's children, and the companion the child talks to. */
import { api, upload } from '../lib/api';

export type ApiChild = {
  id: string;
  parent_id: string;
  therapist_id: string | null;
  full_name: string;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  home_address: string | null;
  created_at: string;
  therapist_name: string | null;
  archived_at: string | null;
};

export function listChildren(): Promise<ApiChild[]> {
  return api.get<ApiChild[]>('/children');
}

/** Only the child's name is required. The setup flow does not ask for an emergency
 * contact or an address, and inventing one would look like real data later. */
export function createChild(input: {
  full_name: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  home_address?: string;
  therapist_id?: string | null;
}): Promise<ApiChild> {
  return api.post<ApiChild>('/children', input);
}

/** What the safety layer decided about one message. `risk_level` is for the adults'
 * side of the story and must never be shown to the child (HANDOFF rule 5). */
export type CompanionReply = {
  reply: string;
  flagged: boolean;
  risk_level: 'none' | 'concern' | 'urgent';
};

export function companionReply(
  childId: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<CompanionReply> {
  return api.post<CompanionReply>('/companion/reply', { child_id: childId, messages });
}

/** Turns a recording into text so the child can check it. The transcript is never
 * sent onward by itself -- the child confirms or edits it first (HANDOFF rule 13). */
export async function transcribeSpeech(childId: string, uri: string): Promise<string> {
  const form = new FormData();
  const name = uri.split('/').pop() || 'speech.m4a';
  // React Native's FormData takes this shape for a file; the web build gets a Blob.
  if (uri.startsWith('blob:') || uri.startsWith('data:')) {
    const blob = await (await fetch(uri)).blob();
    form.append('audio', blob, name);
  } else {
    form.append('audio', { uri, name, type: 'audio/m4a' } as unknown as Blob);
  }
  const { text } = await upload<{ text: string }>(
    `/companion/transcribe?child_id=${encodeURIComponent(childId)}`,
    form,
  );
  return text;
}

/** A phone the child can use SafeGate from. */
export type ApiChildDevice = {
  id: string;
  child_id: string;
  kind: 'linked' | 'parent_hosted';
  label: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function listChildDevices(childId: string): Promise<ApiChildDevice[]> {
  return api.get<ApiChildDevice[]>(`/children/${childId}/devices`);
}

/** Stops the child using SafeGate anywhere, straight away. The conversation is kept:
 * ending a sitting must not erase what the parent needs to read. */
export function endAllChildSessions(childId: string): Promise<void> {
  return api.post<void>(`/children/${childId}/devices/end-all`);
}

export function revokeChildDevice(childId: string, deviceId: string): Promise<void> {
  return api.post<void>(`/children/${childId}/devices/${deviceId}/revoke`);
}
