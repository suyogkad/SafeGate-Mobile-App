import { api } from "../lib/api";
import type { TherapySession } from "../types";

export function listSessions(): Promise<TherapySession[]> {
  return api.get<TherapySession[]>("/sessions");
}

export function getSession(id: string): Promise<TherapySession> {
  return api.get<TherapySession>(`/sessions/${id}`);
}
