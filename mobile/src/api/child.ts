/**
 * What the child's own app may ask the backend about itself.
 *
 * The child's device token carries no role and can never reach an adult route, and
 * nothing here returns a risk level, a score or anything the classifier said (HANDOFF
 * rule 5). The child is told what grown-ups have done, never how they were assessed.
 */
import { api } from '../lib/api';

export type ApiCalmState = {
  /** True while there is something a grown-up was told about. */
  active: boolean;
  /** True once a grown-up who looks after the child has seen it. */
  seen_by_grown_up: boolean;
  /** True once one of them said they asked emergency services to help. */
  emergency_requested: boolean;
  started_at: string | null;
};

export function getCalmState(): Promise<ApiCalmState> {
  return api.get<ApiCalmState>('/companion/calm-state');
}
