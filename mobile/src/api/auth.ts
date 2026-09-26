/**
 * Signing in, and the two ways a child gets into the app.
 *
 * A child never has an email or a password (HANDOFF §1). Either the parent pairs the
 * child's own phone with a short code they read out, or the parent hands their phone
 * over and starts a session on it. Both end in a child token that can only reach
 * child-facing routes.
 */
import { api, endSession, request, setSession } from '../lib/api';

export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'parent' | 'therapist' | 'admin';
  phone: string | null;
  is_active: boolean;
  therapist_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type ApiChildProfile = { id: string; full_name: string; therapist_name: string | null };

type TokenResponse = { access_token: string };
type ChildTokenResponse = { access_token: string; expires_at: string; child: ApiChildProfile };

/** Signs in and stores the session. Returns the account so the caller can check the role. */
export async function signIn(email: string, password: string): Promise<ApiUser> {
  const form = new URLSearchParams({ username: email, password });
  const { access_token } = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    form,
    auth: false,
  });
  await setSession({ token: access_token, role: 'parent' });
  const me = await api.get<ApiUser>('/auth/me');
  await setSession({ token: access_token, role: me.role === 'therapist' ? 'therapist' : 'parent' });
  return me;
}

export async function createParentAccount(
  fullName: string,
  email: string,
  password: string,
): Promise<ApiUser> {
  await request<ApiUser>('/auth/register', {
    method: 'POST',
    auth: false,
    body: { email, password, full_name: fullName, role: 'parent' },
  });
  return signIn(email, password);
}

export function me(): Promise<ApiUser> {
  return api.get<ApiUser>('/auth/me');
}

/** The child types the code their grown-up read out. */
export async function linkChildPhone(code: string): Promise<ApiChildProfile> {
  const res = await request<ChildTokenResponse>('/auth/child/link', {
    method: 'POST',
    auth: false,
    body: { code },
  });
  await setSession({ token: res.access_token, role: 'child', childId: res.child.id });
  return res.child;
}

/** The parent hands their own phone over. Short-lived by design. */
export async function startChildSession(childId: string): Promise<ApiChildProfile> {
  const res = await api.post<ChildTokenResponse>(`/children/${childId}/child-session`);
  await setSession({ token: res.access_token, role: 'child', childId: res.child.id });
  return res.child;
}

export function childMe(): Promise<ApiChildProfile> {
  return api.get<ApiChildProfile>('/auth/child/me');
}

/** A code for the parent to read out (P08). */
export function createLinkCode(childId: string): Promise<{ code: string; expires_at: string }> {
  return api.post(`/children/${childId}/link-code`);
}

export function signOut(): Promise<void> {
  return endSession();
}
