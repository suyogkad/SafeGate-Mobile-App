/**
 * Sign-in flows: talk to the backend, then set the store so the screens follow.
 *
 * Screens call these instead of the store's demo flags directly, so there is one
 * place where "signed in" means a real session on the device.
 */
import {
  childMe,
  createParentAccount,
  createLinkCode,
  linkChildPhone,
  me,
  signIn as apiSignIn,
  signOut as apiSignOut,
  startChildSession,
  type ApiChildProfile,
} from '../api/auth';
import { listChildren } from '../api/children';
import { ApiError, currentSession } from './api';
import { useApp } from '../store/app';

/** Pulls the parent's first child into the store, so the child's screens have an id to use. */
async function adoptFirstChild(): Promise<void> {
  try {
    const children = (await listChildren()).filter((c) => !c.archived_at);
    const first = children[0];
    if (!first) return;
    useApp.getState().setChildId(first.id);
    useApp.getState().updateChild({ name: first.full_name });
  } catch {
    // Not fatal: the parent may not have added a child yet.
  }
}

export async function parentSignIn(email: string, password: string): Promise<void> {
  const user = await apiSignIn(email, password);
  if (user.role !== 'parent') {
    await apiSignOut();
    throw new ApiError(403, 'This is a parent sign in. Use the therapist sign in instead.');
  }
  useApp.getState().setAccount({ id: user.id, name: user.full_name, email: user.email, role: 'parent' });
  useApp.getState().signInParent();
  await adoptFirstChild();
}

export async function parentCreateAccount(name: string, email: string, password: string): Promise<void> {
  const user = await createParentAccount(name, email, password);
  useApp.getState().setAccount({ id: user.id, name: user.full_name, email: user.email, role: 'parent' });
  useApp.getState().signInParent();
}

export async function therapistSignIn(email: string, password: string): Promise<void> {
  const user = await apiSignIn(email, password);
  if (user.role !== 'therapist') {
    await apiSignOut();
    throw new ApiError(403, 'This is a therapist sign in. Use the parent sign in instead.');
  }
  if (user.therapist_status !== 'approved') {
    await apiSignOut();
    throw new ApiError(403, 'Your account is waiting to be approved by SafeGate.');
  }
  useApp.getState().setAccount({ id: user.id, name: user.full_name, email: user.email, role: 'therapist' });
  useApp.getState().signInTherapist();
}

/** C04: the child types the code their grown-up read out. */
export async function childLink(code: string): Promise<ApiChildProfile> {
  const child = await linkChildPhone(code);
  useApp.getState().setChildId(child.id);
  useApp.getState().updateChild({ name: child.full_name });
  useApp.getState().linkChild();
  return child;
}

/** The parent hands their phone over for a sitting. */
export async function childSessionOnThisPhone(childId: string): Promise<ApiChildProfile> {
  const child = await startChildSession(childId);
  useApp.getState().setChildId(child.id);
  useApp.getState().updateChild({ name: child.full_name });
  return child;
}

/** P08: a fresh code for the parent to read out. */
export function linkCodeFor(childId: string) {
  return createLinkCode(childId);
}

export async function signOutEverywhere(): Promise<void> {
  await apiSignOut();
  useApp.getState().signOut();
}

/**
 * Brings a stored session back after the app is reopened.
 *
 * Only the token survives on the device (HANDOFF §8 conflict 2): who it belongs to is
 * re-fetched from the server. Without this a child could reopen the app holding a valid
 * token but with no idea which child they are, and Talk would have nothing to send.
 *
 * Returns where the app should go, so the splash can route by session.
 */
export async function restoreSession(): Promise<'/parent/home' | '/therapist/today' | '/home' | '/welcome'> {
  const session = await currentSession();
  if (!session) return '/welcome';

  try {
    if (session.role === 'child') {
      const child = await childMe();
      useApp.getState().setChildId(child.id);
      useApp.getState().updateChild({ name: child.full_name });
      useApp.getState().linkChild();
      return '/home';
    }

    const user = await me();
    useApp.getState().setAccount({
      id: user.id,
      name: user.full_name,
      email: user.email,
      role: user.role === 'therapist' ? 'therapist' : 'parent',
    });
    if (user.role === 'therapist') {
      useApp.getState().signInTherapist();
      return '/therapist/today';
    }
    useApp.getState().signInParent();
    await adoptFirstChild();
    return '/parent/home';
  } catch {
    // A revoked or expired token: the api layer has already cleared it.
    return '/welcome';
  }
}

let restoring: Promise<Awaited<ReturnType<typeof restoreSession>>> | null = null;

/** Restores once per app start, whichever screen is opened first (including a deep link). */
export function ensureRestored() {
  return (restoring ??= restoreSession());
}
