import { Archive, ArchiveRestore, CalendarDays, ListChecks, MapPin, Phone, Stethoscope, User as UserIcon } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Drawer } from "../../components/ui/Drawer";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAdminUpdateChild, useArchiveChild } from "../../hooks/useAdmin";
import { useSchedules } from "../../hooks/useSchedules";
import { useUsers } from "../../hooks/useUsers";
import { ApiError } from "../../lib/api";
import { formatDate } from "../../lib/utils";
import type { Child, User } from "../../types";

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

function ArchiveSection({ child, onDone }: { child: Child; onDone: () => void }) {
  const archived = child.archived_at !== null;
  const mutation = useArchiveChild(archived);
  const [confirm, setConfirm] = useState(false);

  const run = async () => {
    try {
      await mutation.mutateAsync(child.id);
      toast.success(archived ? "Child restored" : "Child archived");
      setConfirm(false);
      if (!archived) onDone();
    } catch (err) {
      toast.error("Couldn't update", { description: err instanceof ApiError ? err.message : undefined });
    }
  };

  return (
    <div className="mt-6 border-t border-border pt-5">
      <p className="text-[13px] font-medium text-text-muted">{archived ? "Archived record" : "Archive this child"}</p>
      <p className="mt-1 text-[13px] text-text-muted">
        {archived
          ? "Hidden from the parent and therapist, and the companion is switched off. Nothing has been deleted."
          : "Hides the record from the parent and therapist, switches off the companion, and cancels upcoming sessions. Nothing is deleted and you can restore it later."}
      </p>
      <Button variant={archived ? "primary" : "danger"} size="sm" className="mt-3" onClick={() => (archived ? run() : setConfirm(true))} loading={archived && mutation.isPending}>
        {archived ? <><ArchiveRestore className="size-3.5" /> Restore</> : <><Archive className="size-3.5" /> Archive</>}
      </Button>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Archive ${child.full_name}?`} description="Upcoming booked sessions will be cancelled and the family will no longer see this record.">
        <div className="flex gap-3">
          <Button variant="danger" loading={mutation.isPending} onClick={run} className="flex-1">Archive</Button>
          <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
        </div>
      </Dialog>
    </div>
  );
}

function ChildEditForm({ child }: { child: Child }) {
  const { data: therapists } = useUsers("therapist");
  const update = useAdminUpdateChild();
  const [name, setName] = useState(child.full_name);
  const [contactName, setContactName] = useState(child.emergency_contact_name);
  const [contactPhone, setContactPhone] = useState(child.emergency_contact_phone);
  const [address, setAddress] = useState(child.home_address);
  const [therapistId, setTherapistId] = useState(child.therapist_id ?? "");

  const assignable = (therapists ?? []).filter((t) => t.is_active && t.therapist_status === "approved");
  const valid = name.trim() && contactName.trim() && contactPhone.trim() && address.trim();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await update.mutateAsync({
        id: child.id,
        input: {
          full_name: name.trim(),
          emergency_contact_name: contactName.trim(),
          emergency_contact_phone: contactPhone.trim(),
          home_address: address.trim(),
          therapist_id: therapistId || null,
        },
      });
      toast.success("Child record updated");
    } catch (err) {
      toast.error("Couldn't save changes", { description: err instanceof ApiError ? err.message : undefined });
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4 border-t border-border pt-5">
      <p className="text-[13px] font-medium text-text">Correct details or reassign therapist</p>
      <Select label="Assigned therapist" value={therapistId} onChange={(e) => setTherapistId(e.target.value)}>
        <option value="">Not assigned</option>
        {assignable.map((t) => (
          <option key={t.id} value={t.id}>
            {t.full_name}
          </option>
        ))}
      </Select>
      <Input label="Child's name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Emergency contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
      <Input label="Emergency contact phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
      <Input label="Home address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <Button type="submit" loading={update.isPending} disabled={!valid} className="self-start">
        Save changes
      </Button>
    </form>
  );
}

export function ChildDetailDrawer({
  child,
  parent,
  therapist,
  onClose,
}: {
  child: Child | null;
  parent?: User;
  therapist?: User;
  onClose: () => void;
}) {
  const { data: schedules, isLoading } = useSchedules(child?.id);

  if (!child) return null;

  return (
    <Drawer open={Boolean(child)} onClose={onClose} title={child.full_name} subtitle="Child record">
      <div className="divide-y divide-border rounded-2xl border border-border px-4">
        <InfoRow icon={UserIcon} label="Parent" value={parent?.full_name ?? "Unknown"} />
        <InfoRow icon={Stethoscope} label="Assigned therapist" value={therapist?.full_name ?? "Not yet assigned"} />
        <InfoRow icon={Phone} label="Emergency contact" value={`${child.emergency_contact_name} · ${child.emergency_contact_phone}`} />
        <InfoRow icon={MapPin} label="Home address" value={child.home_address} />
        <InfoRow icon={CalendarDays} label="On the platform since" value={formatDate(child.created_at)} />
      </div>

      <ChildEditForm key={child.id} child={child} />
      <ArchiveSection child={child} onDone={onClose} />

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2 text-[13px] font-medium text-text">
          <ListChecks className="size-4 text-text-muted" />
          Visual schedules
        </div>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        ) : !schedules || schedules.length === 0 ? (
          <EmptyState icon={ListChecks} title="No schedules yet" description="This child's parent or therapist hasn't created a visual routine." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {schedules.map((s) => (
              <div key={s.id} className="rounded-xl border border-border bg-tint-sand/20 p-3.5">
                <p className="text-[13.5px] font-medium text-text">{s.title}</p>
                <p className="mt-1 text-[12px] text-text-muted">
                  {s.items.length} {s.items.length === 1 ? "step" : "steps"}
                </p>
                {s.items.length > 0 && (
                  <ol className="mt-2.5 flex flex-wrap gap-1.5">
                    {s.items
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((item) => (
                        <li
                          key={item.id}
                          className="rounded-full bg-surface px-2.5 py-1 text-[11.5px] text-text-muted"
                        >
                          {item.position}. {item.title}
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
