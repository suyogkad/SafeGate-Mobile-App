import { Lock, RotateCcw } from "lucide-react";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useUpdateSettings } from "../../hooks/useAdmin";
import { ApiError } from "../../lib/api";
import type { EditableSettings, PlatformSettings } from "../../types";

type Key = keyof EditableSettings;

function pick(s: PlatformSettings): EditableSettings {
  return {
    companion_rate_limit_per_minute: s.companion_rate_limit_per_minute,
    companion_session_max_messages: s.companion_session_max_messages,
    companion_session_window_minutes: s.companion_session_window_minutes,
    reminder_lead_minutes: s.reminder_lead_minutes,
    safety_country: s.safety_country,
    ai_provider: s.ai_provider,
    ai_companion_model: s.ai_companion_model,
    ai_classifier_model: s.ai_classifier_model,
    ai_classifier_timeout_seconds: s.ai_classifier_timeout_seconds,
    video_provider: s.video_provider,
    therapist_auto_approve: s.therapist_auto_approve,
  };
}

function Field({
  label,
  hint,
  k,
  settings,
  onReset,
  children,
}: {
  label: string;
  hint?: string;
  k: Key;
  settings: PlatformSettings;
  onReset: (k: Key) => void;
  children: ReactNode;
}) {
  const locked = settings.locked.includes(k);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[13px] font-medium text-text-muted">{label}</span>
        {locked ? (
          <Badge tone="neutral">
            <Lock className="size-3" /> Set by the server
          </Badge>
        ) : (
          settings.overridden.includes(k) && (
            <button
              type="button"
              onClick={() => onReset(k)}
              className="flex items-center gap-1 text-[11.5px] text-text-muted hover:text-primary"
              title={`Built-in default: ${String(settings.defaults[k])}`}
            >
              <RotateCcw className="size-3" /> Reset to default
            </button>
          )
        )}
      </div>
      <fieldset disabled={locked} className="contents">
        {children}
      </fieldset>
      {hint && <p className="mt-1 text-[12px] text-text-muted">{hint}</p>}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const update = useUpdateSettings();
  const [form, setForm] = useState<EditableSettings>(pick(settings));

  useEffect(() => setForm(pick(settings)), [settings]);

  const changes = (Object.keys(form) as Key[]).filter((k) => form[k] !== settings[k]);
  const invalid = changes.some((k) => typeof form[k] === "number" && Number.isNaN(form[k]));
  const set = <K extends Key>(k: K, v: EditableSettings[K]) => setForm((f) => ({ ...f, [k]: v }));
  const numeric = (k: Key) => (e: ChangeEvent<HTMLInputElement>) =>
    set(k, (e.target.value === "" ? NaN : Number(e.target.value)) as never);
  const shown = (k: Key) => (Number.isNaN(form[k]) ? "" : (form[k] as number));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, unknown> = {};
    for (const k of changes) body[k] = form[k];
    try {
      await update.mutateAsync(body);
      toast.success("Settings saved", { description: "Applied now. Reminder lead time affects newly booked sessions only." });
    } catch (err) {
      toast.error("Couldn't save settings", { description: err instanceof ApiError ? err.message : undefined });
    }
  };

  const reset = async (k: Key) => {
    try {
      await update.mutateAsync({ [k]: null });
      toast.success("Reset to default");
    } catch (err) {
      toast.error("Couldn't reset", { description: err instanceof ApiError ? err.message : undefined });
    }
  };

  const fp = { settings, onReset: reset };

  return (
    <form onSubmit={save} className="flex flex-col gap-4 pb-4">
      <Field label="Companion messages per minute" k="companion_rate_limit_per_minute" {...fp}>
        <Input type="number" min={1} max={120} value={shown("companion_rate_limit_per_minute")} onChange={numeric("companion_rate_limit_per_minute")} />
      </Field>
      <Field label="Messages per companion session" k="companion_session_max_messages" {...fp}>
        <Input type="number" min={1} max={500} value={shown("companion_session_max_messages")} onChange={numeric("companion_session_max_messages")} />
      </Field>
      <Field label="Companion session window (minutes)" k="companion_session_window_minutes" {...fp}>
        <Input type="number" min={1} max={1440} value={shown("companion_session_window_minutes")} onChange={numeric("companion_session_window_minutes")} />
      </Field>
      <Field label="Session reminder lead time (minutes)" k="reminder_lead_minutes" hint="Applies to newly booked sessions." {...fp}>
        <Input type="number" min={0} max={10080} value={shown("reminder_lead_minutes")} onChange={numeric("reminder_lead_minutes")} />
      </Field>
      <Field label="Safety country" k="safety_country" hint="Chooses which emergency numbers are shown to a child." {...fp}>
        <Select value={form.safety_country} onChange={(e) => set("safety_country", e.target.value)}>
          {settings.countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
      <div className="rounded-xl bg-tint-sand/30 px-3.5 py-2.5 text-[12.5px] text-text-muted">
        Currently shown to children: {Object.values(settings.emergency_numbers).join(" · ")}. These numbers are fixed clinical text and are
        not editable here.
      </div>
      <Field label="AI provider" k="ai_provider" hint="Gemini needs GOOGLE_API_KEY on the server." {...fp}>
        <Select value={form.ai_provider} onChange={(e) => set("ai_provider", e.target.value as EditableSettings["ai_provider"])}>
          <option value="gemini">Gemini</option>
          <option value="mock">Mock (testing only)</option>
        </Select>
      </Field>
      <Field label="Companion model" k="ai_companion_model" {...fp}>
        <Input value={form.ai_companion_model} onChange={(e) => set("ai_companion_model", e.target.value)} />
      </Field>
      <Field label="Safety classifier model" k="ai_classifier_model" {...fp}>
        <Input value={form.ai_classifier_model} onChange={(e) => set("ai_classifier_model", e.target.value)} />
      </Field>
      <Field label="Classifier timeout (seconds)" k="ai_classifier_timeout_seconds" hint="If the checker is slower than this, the message is treated as a concern." {...fp}>
        <Input type="number" min={1} max={120} step="any" value={shown("ai_classifier_timeout_seconds")} onChange={numeric("ai_classifier_timeout_seconds")} />
      </Field>
      <Field label="Video provider" k="video_provider" hint="Daily needs DAILY_API_KEY on the server." {...fp}>
        <Select value={form.video_provider} onChange={(e) => set("video_provider", e.target.value as EditableSettings["video_provider"])}>
          <option value="mock">Mock</option>
          <option value="daily">Daily.co</option>
        </Select>
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-border px-4 py-3">
        <input
          type="checkbox"
          checked={form.therapist_auto_approve}
          disabled={settings.locked.includes("therapist_auto_approve")}
          onChange={(e) => set("therapist_auto_approve", e.target.checked)}
          className="mt-0.5 size-4 accent-primary"
        />
        <span>
          <span className="flex items-center gap-2 text-[13.5px] font-medium text-text">
            Auto-approve new therapists {settings.overridden.includes("therapist_auto_approve") && <Badge tone="sage">Custom</Badge>}
          </span>
          <span className="text-[12.5px] text-text-muted">When off, new therapists wait for admin approval before parents can see them.</span>
        </span>
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" loading={update.isPending} disabled={changes.length === 0 || invalid}>
          Save changes
        </Button>
        {changes.length > 0 && (
          <Button type="button" variant="ghost" onClick={() => setForm(pick(settings))}>
            Discard
          </Button>
        )}
      </div>
    </form>
  );
}
