import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  forceLogout,
  getUser,
  listUsers,
  listUsersPaged,
  resetPassword,
  setVerification,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
  type UserListParams,
} from "../api/users";
import type { TherapistStatus, UserRole } from "../types";

/** Everyone, for name lookups on other pages (children, sessions, dashboard). */
export function useUsers(role?: UserRole) {
  return useQuery({ queryKey: ["users", "lookup", role ?? "all"], queryFn: () => listUsers(role) });
}

/** One page of users with server-side search, sorting and filtering. */
export function useUsersPage(params: UserListParams) {
  return useQuery({
    queryKey: ["users", "page", params],
    queryFn: () => listUsersPaged(params),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["users", "detail", id],
    queryFn: () => getUser(id as string),
    enabled: Boolean(id),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-actions"] });
    queryClient.invalidateQueries({ queryKey: ["system-health"] });
  };
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: (input: CreateUserInput) => createUser(input), onSuccess: invalidate });
}

export function useUpdateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => updateUser(id, input),
    onSuccess: invalidate,
  });
}

export function useSetVerification() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TherapistStatus }) => setVerification(id, status),
    onSuccess: invalidate,
  });
}

export function useResetPassword() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => resetPassword(id, newPassword),
    onSuccess: invalidate,
  });
}

export function useForceLogout() {
  const invalidate = useInvalidateUsers();
  return useMutation({ mutationFn: (id: string) => forceLogout(id), onSuccess: invalidate });
}
