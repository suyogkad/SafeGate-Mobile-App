import { useQuery } from "@tanstack/react-query";
import { getSession, listSessions } from "../api/sessions";

export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: listSessions,
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: ["sessions", "detail", id],
    queryFn: () => getSession(id as string),
    enabled: Boolean(id),
  });
}
