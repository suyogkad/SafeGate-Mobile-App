import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeAlert,
  adminCancelSession,
  adminUpdateChild,
  archiveChild,
  endAllChildSessions,
  listChildDevices,
  revokeChildDevice,
  restoreChild,
  getPlatformSettings,
  getSafetyStats,
  getSystemHealth,
  listAccessLog,
  listAdminActions,
  listAlerts,
  listFlagged,
  reviewConversation,
  updatePlatformSettings,
  type AdminChildInput,
  type PageParams,
} from "../api/admin";

export function useAlerts(params: PageParams & { status?: string; level?: string; acknowledged?: boolean }) {
  return useQuery({ queryKey: ["alerts", params], queryFn: () => listAlerts(params), placeholderData: keepPreviousData });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["safety-stats"] });
    },
  });
}

export function useSafetyStats(days: number) {
  return useQuery({ queryKey: ["safety-stats", days], queryFn: () => getSafetyStats(days) });
}

export function useFlagged(params: PageParams & { risk?: string; reviewed?: boolean }) {
  return useQuery({ queryKey: ["flagged", params], queryFn: () => listFlagged(params), placeholderData: keepPreviousData });
}

export function useReviewConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reviewConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flagged"] });
      queryClient.invalidateQueries({ queryKey: ["safety-stats"] });
    },
  });
}

export function useAccessLog(params: PageParams & { child_id?: string; user_id?: string; action?: string }) {
  return useQuery({ queryKey: ["access-log", params], queryFn: () => listAccessLog(params), placeholderData: keepPreviousData });
}

export function useAdminActions(params: PageParams & { target_id?: string; action_prefix?: string }, enabled = true) {
  return useQuery({
    queryKey: ["admin-actions", params],
    queryFn: () => listAdminActions(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useAdminUpdateChild() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminChildInput }) => adminUpdateChild(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["admin-actions"] });
    },
  });
}

export function useArchiveChild(restore = false) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => (restore ? restoreChild(id) : archiveChild(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["children"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-actions"] });
    },
  });
}

export function useChildDevices(childId: string | undefined) {
  return useQuery({
    queryKey: ["child-devices", childId],
    queryFn: () => listChildDevices(childId as string),
    enabled: Boolean(childId),
  });
}

export function useEndChildSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ childId, deviceId }: { childId: string; deviceId?: string }) =>
      deviceId ? revokeChildDevice(childId, deviceId) : endAllChildSessions(childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["child-devices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-actions"] });
    },
  });
}

export function useAdminCancelSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCancelSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-actions"] });
    },
  });
}

export function useSystemHealth() {
  return useQuery({ queryKey: ["system-health"], queryFn: getSystemHealth, refetchInterval: 30_000 });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePlatformSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(["platform-settings"], data);
      queryClient.invalidateQueries({ queryKey: ["system-health"] });
      queryClient.invalidateQueries({ queryKey: ["admin-actions"] });
    },
  });
}

export function usePlatformSettings() {
  return useQuery({ queryKey: ["platform-settings"], queryFn: getPlatformSettings });
}
