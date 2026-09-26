import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, CalendarDays, History, KeyRound, LogOut, Mail, Phone, ShieldCheck, ShieldOff, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ActiveBadge, RoleBadge, TherapistStatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Drawer } from "../../components/ui/Drawer";
import { Input } from "../../components/ui/Input";
import { Avatar } from "../../components/ui/Avatar";
import { useAdminActions } from "../../hooks/useAdmin";
import { useForceLogout, useResetPassword, useSetVerification, useUpdateUser } from "../../hooks/useUsers";
import { ApiError } from "../../lib/api";
import { formatDate, formatDateTime } from "../../lib/utils";
import type { TherapistStatus, User } from "../../types";

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  phone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function UserDetailDrawer({ user, onClose }: { user: User | null; onClose: () => void }) {
  const updateUser = useUpdateUser();
  const setVerification = useSetVerification();
  const resetPassword = useResetPassword();
  const forceLogout = useForceLogout();
  const { data: history } = useAdminActions({ target_id: user?.id, limit: 10 }, Boolean(user));
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (user) reset({ full_name: user.full_name, phone: user.phone ?? "" });
  }, [user, reset]);

  if (!user) return null;

  const onSubmit = async (values: FormValues) => {
    try {
      await updateUser.mutateAsync({ id: user.id, input: { full_name: values.full_name, phone: values.phone || null } });
      toast.success("Details saved");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      toast.error("Couldn't save changes", { description: message });
    }
  };

  const fail = (title: string, err: unknown) =>
    toast.error(title, { description: err instanceof ApiError ? err.message : "Something went wrong." });

  const verify = async (status: TherapistStatus) => {
    try {
      await setVerification.mutateAsync({ id: user.id, status });
      toast.success(status === "approved" ? "Therapist approved" : "Therapist rejected");
    } catch (err) {
      fail("Couldn't update verification", err);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword.mutateAsync({ id: user.id, newPassword });
      toast.success("Password reset", { description: "All of their sessions were signed out." });
      setNewPassword("");
      setResetOpen(false);
    } catch (err) {
      fail("Couldn't reset password", err);
    }
  };

  const signOutEverywhere = async () => {
    try {
      await forceLogout.mutateAsync(user.id);
      toast.success("Signed out everywhere");
    } catch (err) {
      fail("Couldn't sign out", err);
    }
  };

  const toggleActive = async () => {
    try {
      await updateUser.mutateAsync({ id: user.id, input: { is_active: !user.is_active } });
      toast.success(user.is_active ? "Account deactivated" : "Account reactivated");
      setConfirmToggle(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong.";
      toast.error("Couldn't update account", { description: message });
    }
  };

  return (
    <>
      <Drawer open={Boolean(user)} onClose={onClose} title="Account details" subtitle={<RoleBadge role={user.role} />}>
        <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-tint-sage/30 p-4">
          <Avatar name={user.full_name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-text">{user.full_name}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-text-muted">
              <Mail className="size-3.5" />
              <span className="truncate">{user.email}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div className="flex items-center gap-2 text-[13px] text-text-muted">
            <CalendarDays className="size-4" />
            Joined {formatDate(user.created_at)}
          </div>
          <ActiveBadge isActive={user.is_active} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
          <Input label="Full name" error={errors.full_name?.message} {...register("full_name")} />
          <Input label="Phone" type="tel" icon={<Phone className="size-4" />} placeholder="Not set" {...register("phone")} />
          <Button type="submit" loading={updateUser.isPending} disabled={!isDirty} className="self-start">
            Save changes
          </Button>
        </form>

        {user.role === "therapist" && (
          <div className="mt-8 border-t border-border pt-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-medium text-text-muted">Verification</p>
              <TherapistStatusBadge status={user.therapist_status} />
            </div>
            <p className="mt-1 text-[13px] text-text-muted">
              Only approved therapists appear in the directory and can be assigned to children.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.therapist_status !== "approved" && (
                <Button size="sm" loading={setVerification.isPending} onClick={() => verify("approved")}>
                  <BadgeCheck className="size-3.5" /> Approve
                </Button>
              )}
              {user.therapist_status !== "rejected" && (
                <Button size="sm" variant="secondary" loading={setVerification.isPending} onClick={() => verify("rejected")}>
                  <XCircle className="size-3.5" /> Reject
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 border-t border-border pt-5">
          <p className="text-[13px] font-medium text-text-muted">Sign-in security</p>
          <p className="mt-1 text-[13px] text-text-muted">
            Resetting a password or forcing sign-out ends every active session for this person right away.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setResetOpen(true)}>
              <KeyRound className="size-3.5" /> Reset password
            </Button>
            <Button size="sm" variant="secondary" loading={forceLogout.isPending} onClick={signOutEverywhere}>
              <LogOut className="size-3.5" /> Force sign-out
            </Button>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-medium text-text-muted">
            <History className="size-4" /> Admin history
          </p>
          {!history || history.items.length === 0 ? (
            <p className="text-[13px] text-text-muted">No admin actions recorded for this account.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.items.map((a) => (
                <li key={a.id} className="rounded-xl border border-border px-3.5 py-2.5">
                  <p className="text-[13px] font-medium text-text">{a.action}</p>
                  <p className="text-[12px] text-text-muted">
                    {a.admin_name ?? "Unknown admin"} · {formatDateTime(a.timestamp)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8 border-t border-border pt-5">
          <p className="text-[13px] font-medium text-text-muted">Account access</p>
          <p className="mt-1 text-[13px] text-text-muted">
            {user.is_active
              ? "This account can currently sign in and use the platform."
              : "This account is deactivated. It cannot sign in, and any active session is immediately revoked."}
          </p>
          <Button
            variant={user.is_active ? "danger" : "primary"}
            size="sm"
            className="mt-3"
            onClick={() => setConfirmToggle(true)}
          >
            {user.is_active ? (
              <>
                <ShieldOff className="size-3.5" /> Deactivate account
              </>
            ) : (
              <>
                <ShieldCheck className="size-3.5" /> Reactivate account
              </>
            )}
          </Button>
        </div>
      </Drawer>

      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset password"
        description={`Set a new temporary password for ${user.full_name}. Share it with them securely; they will be signed out everywhere.`}
      >
        <form onSubmit={submitReset} className="flex flex-col gap-4">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="flex gap-3">
            <Button type="submit" loading={resetPassword.isPending} disabled={newPassword.length < 8} className="flex-1">
              Reset password
            </Button>
            <Button type="button" variant="secondary" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={confirmToggle}
        onClose={() => setConfirmToggle(false)}
        title={user.is_active ? "Deactivate this account?" : "Reactivate this account?"}
        description={
          user.is_active
            ? `${user.full_name} will be signed out immediately and won't be able to sign back in until reactivated.`
            : `${user.full_name} will be able to sign in again.`
        }
      >
        <div className="flex gap-3">
          <Button
            variant={user.is_active ? "danger" : "primary"}
            loading={updateUser.isPending}
            onClick={toggleActive}
            className="flex-1"
          >
            {user.is_active ? "Deactivate" : "Reactivate"}
          </Button>
          <Button variant="secondary" onClick={() => setConfirmToggle(false)}>
            Cancel
          </Button>
        </div>
      </Dialog>
    </>
  );
}
