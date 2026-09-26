import { AlertTriangle, BellOff, CheckCheck, Eye, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge, RiskBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { Segmented } from "../components/ui/Segmented";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import { StatCard } from "../components/ui/StatCard";
import { useAcknowledgeAlert, useAlerts, useFlagged, useReviewConversation, useSafetyStats } from "../hooks/useAdmin";
import { ApiError } from "../lib/api";
import { formatDateTime } from "../lib/utils";
import type { DailyFlagCount } from "../types";

const PAGE_SIZE = 20;

function DailyChart({ daily }: { daily: DailyFlagCount[] }) {
  const max = Math.max(1, ...daily.map((d) => d.concern + d.urgent));
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-medium text-text">Flagged messages per day</p>
        <div className="flex gap-3 text-[12px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-reward" /> Concern
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-alert" /> Urgent
          </span>
        </div>
      </div>
      {daily.every((d) => d.concern + d.urgent === 0) && (
        <p className="mt-4 text-[13px] text-text-muted">No flagged messages in this period.</p>
      )}
      <div className="mt-4 flex h-32 items-end gap-1">
        {daily.map((d) => {
          const total = d.concern + d.urgent;
          return (
            <div key={d.date} className="group flex h-full flex-1 flex-col justify-end" title={`${d.date}: ${d.concern} concern, ${d.urgent} urgent`}>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-t" style={{ height: `${(total / max) * 100}%` }}>
                <div className="bg-alert" style={{ flex: d.urgent }} />
                <div className="bg-reward" style={{ flex: d.concern }} />
              </div>
              {total === 0 && <div className="h-0.5 w-full rounded bg-border" />}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-text-muted">
        <span>{daily[0]?.date}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function AlertsTab() {
  const [filter, setFilter] = useState<"open" | "all" | "failed">("open");
  const [offset, setOffset] = useState(0);
  const ack = useAcknowledgeAlert();
  const { data, isLoading } = useAlerts({
    limit: PAGE_SIZE,
    offset,
    acknowledged: filter === "open" ? false : undefined,
    status: filter === "failed" ? "failed" : undefined,
  });

  const acknowledge = async (id: string) => {
    try {
      await ack.mutateAsync(id);
      toast.success("Alert acknowledged");
    } catch (err) {
      toast.error("Couldn't acknowledge", { description: err instanceof ApiError ? err.message : undefined });
    }
  };

  return (
    <>
      <div className="mb-4">
        <Segmented
          options={[
            { label: "Needs acknowledging", value: "open" as const },
            { label: "Delivery failed", value: "failed" as const },
            { label: "All", value: "all" as const },
          ]}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setOffset(0);
          }}
        />
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nothing here" description="No alerts match this filter." />
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[12px] font-medium uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3">Child</th>
                  <th className="px-5 py-3">Level</th>
                  <th className="px-5 py-3">Delivery</th>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 text-[13.5px] font-medium text-text">{a.child_name ?? "Unknown"}</td>
                    <td className="px-5 py-3.5">
                      <RiskBadge risk={a.level} />
                    </td>
                    <td className="px-5 py-3.5">
                      {a.no_recipients ? (
                        <Badge tone="alert">
                          <BellOff className="size-3" /> Nobody was notified
                        </Badge>
                      ) : (
                        <Badge tone={a.status === "sent" ? "sage" : a.status === "failed" ? "alert" : "sand"}>{a.status}</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-text-muted">{formatDateTime(a.timestamp)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {a.acknowledged_at ? (
                        <span className="text-[12px] text-text-muted">Acknowledged by {a.acknowledged_by_name ?? "an admin"}</span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => acknowledge(a.id)} loading={ack.isPending && ack.variables === a.id}>
                          <CheckCheck className="size-3.5" /> Acknowledge
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination offset={offset} limit={PAGE_SIZE} total={data.total} onChange={setOffset} />
          </>
        )}
      </div>
    </>
  );
}

function FlaggedTab() {
  const [filter, setFilter] = useState<"unreviewed" | "all" | "urgent">("unreviewed");
  const [offset, setOffset] = useState(0);
  const review = useReviewConversation();
  const { data, isLoading } = useFlagged({
    limit: PAGE_SIZE,
    offset,
    reviewed: filter === "unreviewed" ? false : undefined,
    risk: filter === "urgent" ? "urgent" : undefined,
  });

  const markReviewed = async (id: string) => {
    try {
      await review.mutateAsync(id);
      toast.success("Marked as reviewed");
    } catch (err) {
      toast.error("Couldn't update", { description: err instanceof ApiError ? err.message : undefined });
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          options={[
            { label: "Unreviewed", value: "unreviewed" as const },
            { label: "Urgent only", value: "urgent" as const },
            { label: "All", value: "all" as const },
          ]}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setOffset(0);
          }}
        />
        <p className="flex items-center gap-1.5 text-[12px] text-text-muted">
          <Eye className="size-3.5" /> Message text is never shown here. Only the child's therapist and parent can read conversations.
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
        {isLoading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="Nothing to review" description="No flagged conversations match this filter." />
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border text-[12px] font-medium uppercase tracking-wide text-text-muted">
                  <th className="px-5 py-3">Child</th>
                  <th className="px-5 py-3">Risk</th>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3.5 text-[13.5px] font-medium text-text">{c.child_name ?? "Unknown"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <RiskBadge risk={c.risk_level} />
                        {c.is_fallback && <Badge tone="neutral">Safe reply used</Badge>}
                        {c.classifier_failed && <Badge tone="sand">Safety check unavailable</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-text-muted">{formatDateTime(c.timestamp)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {c.reviewed_at ? (
                        <span className="text-[12px] text-text-muted">Reviewed by {c.reviewed_by_name ?? "an admin"}</span>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => markReviewed(c.id)} loading={review.isPending && review.variables === c.id}>
                          <CheckCheck className="size-3.5" /> Mark reviewed
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination offset={offset} limit={PAGE_SIZE} total={data.total} onChange={setOffset} />
          </>
        )}
      </div>
    </>
  );
}

export function SafetyPage() {
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"alerts" | "flagged">("alerts");
  const { data: stats, isLoading } = useSafetyStats(days);

  return (
    <div>
      <PageHeader
        title="Safety"
        description="Alerts and flagged conversations from the AI companion's safety checks. Safety check outages are messages flagged only because the checker failed; it always fails toward caution."
        action={
          <Segmented
            options={[
              { label: "7 days", value: "7" },
              { label: "30 days", value: "30" },
              { label: "90 days", value: "90" },
            ]}
            value={String(days)}
            onChange={(v) => setDays(Number(v))}
          />
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {isLoading || !stats ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Flagged messages" value={stats.flagged_total} icon={ShieldAlert} tone="sand" />
            <StatCard label="Urgent" value={stats.urgent} icon={AlertTriangle} tone="reward" />
            <StatCard label="Alerts to acknowledge" value={stats.alerts_unacknowledged} icon={BellOff} tone="blue" />
            <StatCard label="Alerts that failed" value={stats.alerts_failed} icon={AlertTriangle} tone="sage" />
            <StatCard label="Safety check outages" value={stats.classifier_failures} icon={ShieldAlert} tone="reward" />
          </>
        )}
      </div>

      {stats && (
        <div className="mt-5">
          <DailyChart daily={stats.daily} />
        </div>
      )}

      <div className="mt-7">
        <div className="mb-4">
          <Segmented
            options={[
              { label: "Alerts", value: "alerts" as const },
              { label: "Flagged conversations", value: "flagged" as const },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        {tab === "alerts" ? <AlertsTab /> : <FlaggedTab />}
      </div>
    </div>
  );
}
