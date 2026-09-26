import { Baby, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { PageHeader } from "../components/layout/PageHeader";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useChildren } from "../hooks/useChildren";
import { useUsers } from "../hooks/useUsers";
import type { Child } from "../types";
import { ChildDetailDrawer } from "./children/ChildDetailDrawer";

export function ChildrenPage() {
  const { data: children, isLoading } = useChildren();
  const { data: users } = useUsers();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const selected: Child | null = children?.find((c) => c.id === selectedId) ?? null;

  const usersById = useMemo(() => new Map(users?.map((u) => [u.id, u])), [users]);

  const filtered = useMemo(() => {
    if (!children) return [];
    const q = search.trim().toLowerCase();
    const visible = children.filter((c) => showArchived || !c.archived_at);
    if (!q) return visible;
    return visible.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [children, search, showArchived]);

  return (
    <div>
      <PageHeader title="Children" description="Every child on the platform. Open a record to correct details or reassign their therapist." />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-text-muted">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="size-4 accent-primary" />
          Show archived
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Baby} title="No children found" description={search ? "Try a different search term." : "No children have been added yet."} />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium uppercase tracking-wide text-text-muted">
                <th className="px-5 py-3">Child</th>
                <th className="px-5 py-3">Parent</th>
                <th className="px-5 py-3">Therapist</th>
                <th className="px-5 py-3">Emergency contact</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const parent = usersById.get(c.parent_id);
                const therapist = c.therapist_id ? usersById.get(c.therapist_id) : undefined;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="cursor-pointer border-b border-border last:border-0 transition-colors hover:bg-tint-sage/20"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.full_name} size="sm" />
                        <p className="text-[13.5px] font-medium text-text">{c.full_name}</p>
                        {c.archived_at && <Badge tone="neutral">Archived</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-text-muted">{parent?.full_name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      {therapist ? (
                        <span className="text-[13px] text-text-muted">{therapist.full_name}</span>
                      ) : (
                        <Badge tone="sand">Unassigned</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-text-muted">{c.emergency_contact_phone}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ChildDetailDrawer
        child={selected}
        parent={selected ? usersById.get(selected.parent_id) : undefined}
        therapist={selected?.therapist_id ? usersById.get(selected.therapist_id) : undefined}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
