import { CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { usePlatformSettings, useSystemHealth } from "../hooks/useAdmin";
import { SettingsForm } from "./system/SettingsForm";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <p className="text-[13.5px] text-text-muted">{label}</p>
      <div className="text-right text-[13.5px] font-medium text-text">{children}</div>
    </div>
  );
}

function Ok({ ok, yes = "OK", no = "Problem" }: { ok: boolean; yes?: string; no?: string }) {
  return ok ? (
    <Badge tone="sage">
      <CheckCircle2 className="size-3" /> {yes}
    </Badge>
  ) : (
    <Badge tone="alert">
      <XCircle className="size-3" /> {no}
    </Badge>
  );
}

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 pb-2 pt-5 shadow-soft">
      <p className="font-display text-[16px] font-medium text-text">{title}</p>
      {note && <p className="mt-1 text-[12.5px] text-text-muted">{note}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function SystemPage() {
  const { data: health } = useSystemHealth();
  const { data: settings } = usePlatformSettings();

  return (
    <div>
      <PageHeader title="System" description="Health of the services SafeGate depends on, and the settings that control the companion." />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Panel title="Health" note="Refreshes every 30 seconds.">
          {!health ? (
            <Skeleton className="mb-3 h-32 rounded-xl" />
          ) : (
            <>
              <Row label="Database">
                <Ok ok={health.database_ok} />
              </Row>
              <Row label="Reminder scheduler">
                <Ok ok={health.scheduler_running} yes="Running" no="Stopped" />
              </Row>
              <Row label="Scheduled reminders">{health.scheduled_reminder_jobs}</Row>
              <Row label="AI companion">
                <Ok
                  ok={health.ai_is_mock || health.ai_key_configured}
                  yes={health.ai_is_mock ? "Mock (testing)" : "Configured"}
                  no="No API key"
                />
              </Row>
              <Row label="Video provider">{health.video_provider}</Row>
              <Row label="Notifications">{health.notifications}</Row>
              <Row label="Alerts failed (24h)">
                <Ok ok={health.alerts_failed_24h === 0} yes="None" no={String(health.alerts_failed_24h)} />
              </Row>
              <Row label="Therapists awaiting approval">{health.pending_therapists}</Row>
              <Row label="Environment">{health.environment}</Row>
            </>
          )}
        </Panel>

        <Panel title="Settings" note="Saved to the database and applied immediately -- no redeploy. API keys and other secrets stay in the server environment.">
          {!settings ? <Skeleton className="mb-3 h-32 rounded-xl" /> : <SettingsForm settings={settings} />}
        </Panel>
      </div>
    </div>
  );
}
