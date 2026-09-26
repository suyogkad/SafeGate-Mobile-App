import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";
import { SessionStatusBadge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ExportButton } from "../components/ui/ExportButton";
import { PageHeader } from "../components/layout/PageHeader";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useChildren } from "../hooks/useChildren";
import { useSessions } from "../hooks/useSessions";
import { useUsers } from "../hooks/useUsers";
import { cn, formatDateTime } from "../lib/utils";
import type { SessionStatus, TherapySession } from "../types";
import { SessionDetailDrawer } from "./sessions/SessionDetailDrawer";

const statusFilters: { label: string; value: SessionStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Booked", value: "booked" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();
  const { data: children } = useChildren();
  const { data: users } = useUsers();
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">("all");
  const [selected, setSelected] = useState<TherapySession | null>(null);

  const childrenById = useMemo(() => new Map(children?.map((c) => [c.id, c])), [children]);
  const usersById = useMemo(() => new Map(users?.map((u) => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const sorted = [...sessions].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    if (statusFilter === "all") return sorted;
    return sorted.filter((s) => s.status === statusFilter);
  }, [sessions, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="All booked, completed, and cancelled sessions across the platform."
        action={<ExportButton path="/admin/export/sessions.csv" filename="safegate-sessions.csv" />}
      />

      <div className="mb-5 flex gap-1.5 rounded-xl border border-border bg-surface p-1 w-fit">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
              statusFilter === f.value ? "bg-primary text-white" : "text-text-muted hover:text-text",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No sessions found" description="No sessions match this filter yet." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium uppercase tracking-wide text-text-muted">
                <th className="px-5 py-3">Child</th>
                <th className="px-5 py-3">Therapist</th>
                <th className="px-5 py-3">Start time</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-tint-sage/20"
                >
                  <td className="px-5 py-3.5 text-[13.5px] font-medium text-text">
                    {childrenById.get(s.child_id)?.full_name ?? "Unknown"}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-text-muted">
                    {usersById.get(s.therapist_id)?.full_name ?? "Unknown"}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-text-muted">{formatDateTime(s.start_time)}</td>
                  <td className="px-5 py-3.5">
                    <SessionStatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SessionDetailDrawer
        session={selected}
        child={selected ? childrenById.get(selected.child_id) : undefined}
        therapist={selected ? usersById.get(selected.therapist_id) : undefined}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
