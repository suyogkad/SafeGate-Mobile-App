import { AlertTriangle, Baby, CalendarCheck, CalendarClock, Stethoscope, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import { RoleBadge, SessionStatusBadge } from "../components/ui/Badge";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { PageHeader } from "../components/layout/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { StatCard } from "../components/ui/StatCard";
import { useSafetyStats, useSystemHealth } from "../hooks/useAdmin";
import { useAuth } from "../hooks/useAuth";
import { useChildren } from "../hooks/useChildren";
import { useSessions } from "../hooks/useSessions";
import { useUsers } from "../hooks/useUsers";
import { formatDateTime } from "../lib/utils";

export function DashboardPage() {
  const { user } = useAuth();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: children, isLoading: childrenLoading } = useChildren();
  const { data: sessions, isLoading: sessionsLoading } = useSessions();

  const parentCount = users?.filter((u) => u.role === "parent").length ?? 0;
  const therapistCount = users?.filter((u) => u.role === "therapist").length ?? 0;
  const bookedCount = sessions?.filter((s) => s.status === "booked").length ?? 0;

  const recentUsers = [...(users ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const upcomingSessions = [...(sessions ?? [])]
    .filter((s) => s.status === "booked")
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  const { data: stats } = useSafetyStats(30);
  const { data: health } = useSystemHealth();
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const attention: { to: string; text: string }[] = [];
  if (stats && stats.alerts_unacknowledged > 0)
    attention.push({ to: "/safety", text: `${plural(stats.alerts_unacknowledged, "safety alert hasn't", "safety alerts haven't")} been acknowledged` });
  if (stats && stats.unreviewed_flagged > 0)
    attention.push({ to: "/safety", text: `${plural(stats.unreviewed_flagged, "flagged conversation is", "flagged conversations are")} waiting for review` });
  if (health && health.pending_therapists > 0)
    attention.push({ to: "/users", text: `${plural(health.pending_therapists, "therapist is", "therapists are")} waiting for approval` });
  if (health && health.alerts_failed_24h > 0)
    attention.push({ to: "/safety", text: `${plural(health.alerts_failed_24h, "alert", "alerts")} failed to deliver in the last 24 hours` });
  if (stats && stats.classifier_failures > 0)
    attention.push({ to: "/safety", text: `The safety checker was unavailable for ${plural(stats.classifier_failures, "message", "messages")} (treated as a concern)` });
  if (health && !health.database_ok) attention.push({ to: "/system", text: "The database is not responding" });

  const isLoading = usersLoading || childrenLoading || sessionsLoading;

  return (
    <div>
      <PageHeader title={`Welcome back, ${user?.full_name.split(" ")[0] ?? ""}`} description="Here's how things are looking across the platform." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)
        ) : (
          <>
            <StatCard label="Parents" value={parentCount} icon={Users2} tone="blue" />
            <StatCard label="Therapists" value={therapistCount} icon={Stethoscope} tone="sage" />
            <StatCard label="Children" value={children?.length ?? 0} icon={Baby} tone="sand" />
            <StatCard label="Booked sessions" value={bookedCount} icon={CalendarCheck} tone="reward" />
          </>
        )}
      </div>

      {attention.length > 0 && (
        <div className="mt-6 rounded-2xl border border-alert/25 bg-alert/5 p-5">
          <p className="flex items-center gap-2 font-display text-[16px] font-medium text-text">
            <AlertTriangle className="size-4 text-alert" /> Needs attention
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {/* Keyed on the text, not the link: several of these point at /safety. */}
            {attention.map((a) => (
              <li key={a.text}>
                <Link to={a.to} className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 text-[13.5px] text-text transition-colors hover:bg-tint-sand/40">
                  <span>{a.text}</span>
                  <span className="text-[12.5px] font-medium text-primary">Review</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recently added accounts</CardTitle>
            <Link to="/users" className="text-[13px] font-medium text-primary hover:text-primary-hover">
              View all
            </Link>
          </CardHeader>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="px-5 py-4">
                <Skeleton className="h-4 w-full" />
              </div>
            ) : recentUsers.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-text-muted">No accounts yet.</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-text">{u.full_name}</p>
                    <p className="truncate text-[12px] text-text-muted">{u.email}</p>
                  </div>
                  <RoleBadge role={u.role} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming sessions</CardTitle>
            <Link to="/sessions" className="text-[13px] font-medium text-primary hover:text-primary-hover">
              View all
            </Link>
          </CardHeader>
          <div className="divide-y divide-border">
            {isLoading ? (
              <div className="px-5 py-4">
                <Skeleton className="h-4 w-full" />
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
                <CalendarClock className="size-5 text-text-muted" />
                <p className="text-[13px] text-text-muted">No upcoming sessions booked.</p>
              </div>
            ) : (
              upcomingSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <p className="text-[13.5px] font-medium text-text">{formatDateTime(s.start_time)}</p>
                  <SessionStatusBadge status={s.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
