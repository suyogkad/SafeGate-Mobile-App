import type { CalmMode } from '../store/app';

/**
 * The truthful line on every calm screen (product rule 12).
 *
 * This is the one place it is written. The child's calm screen shows it, and the
 * parent's Alert quotes it back under "What <child> sees now", so the two sides
 * cannot drift apart. It tells the child what grown-ups have actually done and
 * **never promises a time**.
 */

/** What the server tells the child's app about a flagged message. Carries no risk
 * level, no score and no classifier output (rule 5). */
export type CalmState = {
  active: boolean;
  seen_by_grown_up: boolean;
  emergency_requested: boolean;
};

/** Emergency wins over seen, seen over told. */
export function calmLeadFor(state: CalmState | null): string {
  if (state?.emergency_requested)
    return 'A grown-up who looks after you has asked emergency services to help you. You are not in trouble.';
  if (state?.seen_by_grown_up) return 'Someone who looks after you has seen this and will reach out.';
  return 'A grown-up who looks after you has been told. They may get in touch.';
}

/** The child app's local calm state, until it reads the server's. Same words. */
export function calmLead(calmMode: CalmMode, emergency: { by: string; at: string } | null): string {
  return calmLeadFor({
    active: calmMode !== 'off',
    seen_by_grown_up: calmMode === 'seen',
    emergency_requested: !!emergency,
  });
}
