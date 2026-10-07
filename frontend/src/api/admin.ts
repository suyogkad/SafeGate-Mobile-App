import { api, getPaged } from "../lib/api";
import type {
  AccessLogRow,
  AdminActionRow,
  AlertRow,
  Child,
  ChildDevice,
  EditableSettings,
  FlaggedConversationRow,
  Paged,
  PlatformSettings,
  SafetyStats,
  SystemHealth,
  TherapySession,
} from "../types";

function query(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [string, string | number | boolean | undefined][]) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export interface PageParams {
  limit?: number;
  offset?: number;
}

export function listAlerts(params: PageParams & { status?: string; level?: string; acknowledged?: boolean }): Promise<Paged<AlertRow>> {
  return getPaged<AlertRow>(`/admin/alerts${query(params)}`);
}

export function acknowledgeAlert(id: string): Promise<void> {
  return api.post<void>(`/admin/alerts/${id}/acknowledge`);
}

export function getSafetyStats(days: number): Promise<SafetyStats> {
  return api.get<SafetyStats>(`/admin/safety/stats?days=${days}`);
}

export function listFlagged(params: PageParams & { risk?: string; reviewed?: boolean }): Promise<Paged<FlaggedConversationRow>> {
  return getPaged<FlaggedConversationRow>(`/admin/conversations/flagged${query(params)}`);
}

export function reviewConversation(id: string): Promise<void> {
  return api.post<void>(`/admin/conversations/${id}/review`);
}

export function listAccessLog(params: PageParams & { child_id?: string; user_id?: string; action?: string }): Promise<Paged<AccessLogRow>> {
  return getPaged<AccessLogRow>(`/admin/audit/access${query(params)}`);
}

export function listAdminActions(params: PageParams & { target_id?: string; action_prefix?: string }): Promise<Paged<AdminActionRow>> {
  return getPaged<AdminActionRow>(`/admin/audit/actions${query(params)}`);
}

export interface AdminChildInput {
  full_name?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  home_address?: string;
  therapist_id?: string | null;
}

export function adminUpdateChild(id: string, input: AdminChildInput): Promise<Child> {
  return api.put<Child>(`/admin/children/${id}`, input);
}

export function archiveChild(id: string): Promise<Child> {
  return api.post<Child>(`/admin/children/${id}/archive`);
}

export function restoreChild(id: string): Promise<Child> {
  return api.post<Child>(`/admin/children/${id}/restore`);
}

export function adminCancelSession(id: string): Promise<TherapySession> {
  return api.post<TherapySession>(`/admin/sessions/${id}/cancel`);
}

export function listChildDevices(childId: string): Promise<ChildDevice[]> {
  return api.get<ChildDevice[]>(`/admin/children/${childId}/devices`);
}

/** Signs the child out everywhere. The conversation is kept -- ending a sitting
 * must not erase what the family needs to read. */
export function endAllChildSessions(childId: string): Promise<void> {
  return api.post<void>(`/admin/children/${childId}/devices/end-all`);
}

export function revokeChildDevice(childId: string, deviceId: string): Promise<void> {
  return api.post<void>(`/admin/children/${childId}/devices/${deviceId}/revoke`);
}

export function getSystemHealth(): Promise<SystemHealth> {
  return api.get<SystemHealth>("/admin/system");
}

/** Send only changed keys; a null value resets that key to its environment default. */
export function updatePlatformSettings(changes: { [K in keyof EditableSettings]?: EditableSettings[K] | null }): Promise<PlatformSettings> {
  return api.patch<PlatformSettings>("/admin/settings", changes);
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  return api.get<PlatformSettings>("/admin/settings");
}
