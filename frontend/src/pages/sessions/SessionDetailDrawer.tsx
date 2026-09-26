import { Ban, Baby, CalendarClock, Stethoscope, Video } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SessionStatusBadge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Drawer } from "../../components/ui/Drawer";
import { useAdminCancelSession } from "../../hooks/useAdmin";
import { ApiError } from "../../lib/api";
import { formatDateTime } from "../../lib/utils";
import type { Child, TherapySession, User } from "../../types";

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-text-muted" />
      <div className="min-w-0">
        <p className="text-[11.5px] font-medium uppercase tracking-wide text-text-muted">{label}</p>
        <p className="text-[13.5px] text-text">{value}</p>
      </div>
    </div>
  );
}

export function SessionDetailDrawer({
  session,
  child,
  therapist,
  onClose,
}: {
  session: TherapySession | null;
  child?: Child;
  therapist?: User;
  onClose: () => void;
}) {
  const cancel = useAdminCancelSession();
  const [confirm, setConfirm] = useState(false);

  if (!session) return null;

  const cancelSession = async () => {
    try {
      await cancel.mutateAsync(session.id);
      toast.success("Session cancelled");
      setConfirm(false);
      onClose();
    } catch (err) {
      toast.error("Couldn't cancel", { description: err instanceof ApiError ? err.message : undefined });
    }
  };

  return (
    <Drawer open={Boolean(session)} onClose={onClose} title="Session" subtitle={<SessionStatusBadge status={session.status} />}>
      <div className="divide-y divide-border rounded-2xl border border-border px-4">
        <InfoRow icon={Baby} label="Child" value={child?.full_name ?? "Unknown"} />
        <InfoRow icon={Stethoscope} label="Therapist" value={therapist?.full_name ?? "Unknown"} />
        <InfoRow icon={CalendarClock} label="Starts" value={formatDateTime(session.start_time)} />
        <InfoRow icon={CalendarClock} label="Ends" value={formatDateTime(session.end_time)} />
      </div>

      <div className="mt-5 rounded-2xl border border-border bg-tint-blue/25 p-4">
        <div className="flex items-center gap-2 text-[13px] font-medium text-text">
          <Video className="size-4 text-text-muted" />
          Video room
        </div>
        {session.video_room_url ? (
          <p className="mt-2 truncate text-[13px] text-text-muted">{session.video_room_url}</p>
        ) : (
          <p className="mt-2 text-[13px] text-text-muted">
            No room yet. One is created the first time someone joins.
          </p>
        )}
        <p className="mt-2 text-[11.5px] text-text-muted">
          The room is private, so this address alone will not let anyone in. Entry needs a personal pass that
          only the child's parent and assigned therapist can request, and it works only around the session
          time. Admins can see that a room exists but cannot join the call.
        </p>
      </div>

      {session.status === "booked" && (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-[13px] font-medium text-text-muted">Cancel on behalf of the family</p>
          <p className="mt-1 text-[13px] text-text-muted">The slot is freed and the reminder is removed. This is recorded in the audit log.</p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirm(true)}>
            <Ban className="size-3.5" /> Cancel session
          </Button>
        </div>
      )}

      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Cancel this session?" description="The parent's booking will be cancelled and the time slot becomes available again.">
        <div className="flex gap-3">
          <Button variant="danger" loading={cancel.isPending} onClick={cancelSession} className="flex-1">
            Cancel session
          </Button>
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Keep it
          </Button>
        </div>
      </Dialog>
    </Drawer>
  );
}
