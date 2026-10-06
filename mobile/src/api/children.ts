/** The parent's children, and the companion the child talks to. */
import { api } from '../lib/api';

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
