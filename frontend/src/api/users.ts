import { api, getPaged } from "../lib/api";
import type { Paged, TherapistStatus, User, UserRole } from "../types";

export interface CreateUserInput {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
}

export interface UpdateUserInput {
  full_name?: string;
  phone?: string | null;
  is_active?: boolean;
}

export interface UserListParams {
  role?: UserRole;
  therapistStatus?: TherapistStatus;
  q?: string;
  sort?: "created_at" | "full_name" | "email";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function listUsersPaged(params: UserListParams): Promise<Paged<User>> {
  return getPaged<User>(
    `/admin/users${query({
      role: params.role,
      therapist_status: params.therapistStatus,
      q: params.q,
      sort: params.sort,
      order: params.order,
      limit: params.limit,
      offset: params.offset,
    })}`,
  );
}

/** Everyone (up to the server's 500 cap) -- for name lookups on other pages. */
export function listUsers(role?: UserRole): Promise<User[]> {
  return api.get<User[]>(`/admin/users${query({ role, limit: 500 })}`);
}

export function getUser(id: string): Promise<User> {
  return api.get<User>(`/admin/users/${id}`);
}

export function createUser(input: CreateUserInput): Promise<User> {
  return api.post<User>("/admin/users", input);
}

export function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  return api.patch<User>(`/admin/users/${id}`, input);
}

export function setVerification(id: string, status: TherapistStatus): Promise<User> {
  return api.post<User>(`/admin/users/${id}/verification`, { status });
}

export function resetPassword(id: string, newPassword: string): Promise<void> {
  return api.post<void>(`/admin/users/${id}/reset-password`, { new_password: newPassword });
}

export function forceLogout(id: string): Promise<void> {
  return api.post<void>(`/admin/users/${id}/force-logout`);
}
