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
  video_room_url: string | null;
  created_at: string;
  child_name: string | null;
  therapist_name: string | null;
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
