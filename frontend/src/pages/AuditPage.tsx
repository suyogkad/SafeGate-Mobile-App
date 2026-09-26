import { ScrollText } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { ExportButton } from "../components/ui/ExportButton";
import { Pagination } from "../components/ui/Pagination";
import { Segmented } from "../components/ui/Segmented";
import { TableSkeleton } from "../components/ui/Skeleton";
import { useAccessLog, useAdminActions } from "../hooks/useAdmin";
import { formatDateTime } from "../lib/utils";

const PAGE_SIZE = 25;

function AccessTab() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useAccessLog({ limit: PAGE_SIZE, offset });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No access recorded" description="Every read or change of a child's record will appear here." />
      ) : (
        <>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium uppercase tracking-wide text-text-muted">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Who</th>
                <th className="px-5 py-3">Child</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-[13px] text-text-muted">{formatDateTime(r.timestamp)}</td>
                  <td className="px-5 py-3 text-[13.5px] text-text">
                    {r.user_name ?? "Unknown"} {r.user_role && <span className="text-[12px] text-text-muted">({r.user_role})</span>}
                  </td>
                  <td className="px-5 py-3 text-[13.5px] text-text">{r.child_name ?? "Unknown"}</td>
                  <td className="px-5 py-3">
                    <Badge tone="blue">{r.action}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination offset={offset} limit={PAGE_SIZE} total={data.total} onChange={setOffset} />
        </>
      )}
    </div>
  );
}

function ActionsTab() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading } = useAdminActions({ limit: PAGE_SIZE, offset });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={ScrollText} title="No admin actions yet" description="Account changes, approvals and other admin actions will appear here." />
      ) : (
        <>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-[12px] font-medium uppercase tracking-wide text-text-muted">
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Admin</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-[13px] text-text-muted">{formatDateTime(a.timestamp)}</td>
                  <td className="px-5 py-3 text-[13.5px] text-text">{a.admin_name ?? "Unknown"}</td>
                  <td className="px-5 py-3">
                    <Badge tone="sage">{a.action}</Badge>
                  </td>
                  <td className="px-5 py-3 text-[12.5px] text-text-muted">{a.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination offset={offset} limit={PAGE_SIZE} total={data.total} onChange={setOffset} />
        </>
      )}
    </div>
  );
}

export function AuditPage() {
  const [tab, setTab] = useState<"access" | "actions">("access");

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Who accessed children's records, and what admins have changed."
        action={tab === "access" ? <ExportButton path="/admin/export/access-log.csv" filename="safegate-access-log.csv" /> : undefined}
      />
      <div className="mb-4">
        <Segmented
          options={[
            { label: "Record access", value: "access" as const },
            { label: "Admin actions", value: "actions" as const },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === "access" ? <AccessTab /> : <ActionsTab />}
    </div>
  );
}
