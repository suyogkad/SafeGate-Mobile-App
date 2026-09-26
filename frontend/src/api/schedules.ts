import { api } from "../lib/api";
import type { VisualSchedule } from "../types";

export function listSchedules(childId: string): Promise<VisualSchedule[]> {
  return api.get<VisualSchedule[]>(`/children/${childId}/schedules`);
}
