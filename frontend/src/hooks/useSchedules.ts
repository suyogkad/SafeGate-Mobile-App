import { useQuery } from "@tanstack/react-query";
import { listSchedules } from "../api/schedules";

export function useSchedules(childId: string | undefined) {
  return useQuery({
    queryKey: ["schedules", childId],
    queryFn: () => listSchedules(childId as string),
    enabled: Boolean(childId),
  });
}
