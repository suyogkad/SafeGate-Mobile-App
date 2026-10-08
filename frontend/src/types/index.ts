export type UserRole = "parent" | "therapist" | "admin";
export type SessionStatus = "booked" | "cancelled" | "completed";
export type RiskLevel = "none" | "concern" | "urgent";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  therapist_status: TherapistStatus;
  created_at: string;
}

export interface Child {
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
}

export interface AvailabilitySlot {
  id: string;
  therapist_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  created_at: string;
}

export interface TherapySession {
  id: string;
  child_id: string;
  therapist_id: string;
  availability_slot_id: string;
  start_time: string;
  end_time: string;
  status: SessionStatus;
  video_room_url: string | null;
  created_at: string;
  child_name: string | null;
  therapist_name: string | null;
}

export interface ScheduleItem {
  id: string;
  position: number;
  title: string;
  image_url: string | null;
  created_at: string;
}

export interface VisualSchedule {
  id: string;
  child_id: string;
  title: string;
  created_by: string;
  created_at: string;
  items: ScheduleItem[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export type TherapistStatus = "pending" | "approved" | "rejected";

export interface AlertRow {
  id: string;
  child_id: string;
  child_name: string | null;
  level: "concern" | "urgent";
  recipients: string;
  status: "pending" | "sent" | "failed";
  timestamp: string;
  no_recipients: boolean;
  acknowledged_at: string | null;
  acknowledged_by_name: string | null;
}

/** Metadata only -- the backend never sends message or reply text to admins. */
export interface FlaggedConversationRow {
  id: string;
  child_id: string;
  child_name: string | null;
  timestamp: string;
  risk_level: RiskLevel;
  is_fallback: boolean;
  classifier_failed: boolean;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
}

export interface DailyFlagCount {
  date: string;
  concern: number;
  urgent: number;
  fallback: number;
}

export interface SafetyStats {
  days: number;
  flagged_total: number;
  concern: number;
  urgent: number;
  fallback_replies: number;
  classifier_failures: number;
  alerts_total: number;
  alerts_failed: number;
  alerts_unacknowledged: number;
  unreviewed_flagged: number;
  daily: DailyFlagCount[];
}

export interface AccessLogRow {
  id: string;
  timestamp: string;
  /** Null when the actor was the child's own device rather than an adult account. */
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  device_id: string | null;
  child_id: string;
  child_name: string | null;
  action: string;
}

export interface AdminActionRow {
  id: string;
  timestamp: string;
  admin_id: string;
  admin_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  detail: string | null;
}

export interface SystemHealth {
  database_ok: boolean;
  scheduler_running: boolean;
  scheduled_reminder_jobs: number;
  ai_provider: string;
  ai_key_configured: boolean;
  ai_is_mock: boolean;
  video_provider: string;
  notifications: string;
  alerts_failed_24h: number;
  pending_therapists: number;
  environment: string;
}

export interface EditableSettings {
  companion_rate_limit_per_minute: number;
  companion_session_max_messages: number;
  companion_session_window_minutes: number;
  reminder_lead_minutes: number;
  safety_country: string;
  ai_provider: "mock" | "gemini";
  ai_companion_model: string;
  ai_classifier_model: string;
  ai_classifier_timeout_seconds: number;
  video_provider: "mock" | "daily";
  therapist_auto_approve: boolean;
}

export interface PlatformSettings extends EditableSettings {
  emergency_numbers: Record<string, string>;
  countries: string[];
  defaults: EditableSettings;
  overridden: (keyof EditableSettings)[];
  /** Pinned by a server environment variable -- cannot be changed from here. */
  locked: (keyof EditableSettings)[];
}

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface ApiErrorBody {
  detail?: string | { msg: string }[];
}

/** A phone a child can use SafeGate from. Metadata only: an admin never reads
 * what was said on it. */
export interface ChildDevice {
  id: string;
  child_id: string;
  kind: "linked" | "parent_hosted";
  label: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
