import { ArrowDown, ArrowUp, Plus, Search, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar } from "../components/ui/Avatar";
import { ActiveBadge, RoleBadge, TherapistStatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ExportButton } from "../components/ui/ExportButton";
import { PageHeader } from "../components/layout/PageHeader";
import { Pagination } from "../components/ui/Pagination";
import { Segmented } from "../components/ui/Segmented";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useUsersPage } from "../hooks/useUsers";
import { formatDate } from "../lib/utils";
import type { User, UserRole } from "../types";
import { CreateUserDrawer } from "./users/CreateUserDrawer";
import { UserDetailDrawer } from "./users/UserDetailDrawer";

type Filter = UserRole | "all" | "pending";
type SortKey = "created_at" | "full_name" | "email";

const filters: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Parents", value: "parent" },
  { label: "Therapists", value: "therapist" },
  { label: "Admins", value: "admin" },
  { label: "Pending therapists", value: "pending" },
];

const PAGE_SIZE = 25;

export function UsersPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<SortKey>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [offset, setOffset] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useUsersPage({
    role: filter === "pending" ? "therapist" : filter === "all" ? undefined : filter,
    therapistStatus: filter === "pending" ? "pending" : undefined,
    q: debounced || undefined,
    sort,
    order,
    limit: PAGE_SIZE,
    offset,
  });

  const users = data?.items ?? [];
  const selected = users.find((u) => u.id === selectedId) ?? null;

  const toggleSort = (key: SortKey) => {
    if (sort === key) setOrder(order === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setOrder(key === "created_at" ? "desc" : "asc");
    }
    setOffset(0);
  };

  const SortHead = ({ label, k }: { label: string; k: SortKey }) => (
    <th className="px-5 py-3">
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-text">
        {label}
        {sort === k && (order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );

  return (
    <div>
      <PageHeader
        title="Users"
        description="Create and manage parent, therapist, and admin accounts."
        action={
          <div className="flex gap-2">
            <ExportButton path="/admin/export/users.csv" filename="safegate-users.csv" />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New account
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          options={filters}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setOffset(0);
          }}
        />
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-[13.5px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        {isLoading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title="No accounts found"
            description={
              debounced ? "Try a different search term." : filter === "pending" ? "No therapists are waiting for approval." : "Create the first account to get started."
            }
          />
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[12px] font-medium text-text-muted">
                  <SortHead label="Name" k="full_name" />
                  <th className="px-5 py-3 uppercase tracking-wide">Role</th>
                  <th className="px-5 py-3 uppercase tracking-wide">Status</th>
                  <SortHead label="Joined" k="created_at" />
                </tr>
              </thead>
              <tbody>
                {users.map((u: User) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedId(u.id)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-tint-sage/20"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-medium text-text">{u.full_name}</p>
                          <p className="truncate text-[12px] text-text-muted">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <RoleBadge role={u.role} />
                        {u.role === "therapist" && u.therapist_status !== "approved" && <TherapistStatusBadge status={u.therapist_status} />}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ActiveBadge isActive={u.is_active} />
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-text-muted">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination offset={offset} limit={PAGE_SIZE} total={data?.total ?? 0} onChange={setOffset} />
          </>
        )}
      </div>

      <CreateUserDrawer open={createOpen} onClose={() => setCreateOpen(false)} />
      <UserDetailDrawer user={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
