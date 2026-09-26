import type { CalmMode } from '../store/app';

/**
 * The truthful line on every calm screen (product rule 12).
 * Tells the child what grown-ups have actually done. Never promises a time.
 */
export function calmLead(calmMode: CalmMode, emergency: { by: string; at: string } | null): string {
  if (emergency) return 'A grown-up who looks after you has asked emergency services to help you. You are not in trouble.';
  if (calmMode === 'seen') return 'Someone who looks after you has seen this and will reach out.';
  return 'A grown-up who looks after you has been told. They may get in touch.';
}
