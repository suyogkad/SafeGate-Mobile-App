import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Tone = "sage" | "blue" | "sand" | "reward" | "alert" | "neutral";

const toneClasses: Record<Tone, string> = {
  sage: "bg-tint-sage text-primary-hover",
  blue: "bg-tint-blue text-[#2C5A66]",
  sand: "bg-tint-sand text-[#7A5C2E]",
  reward: "bg-reward/40 text-[#7A5C0F]",
  alert: "bg-alert/10 text-alert",
  neutral: "bg-border/50 text-text-muted",
};

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium leading-none",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: "parent" | "therapist" | "admin" }) {
  const map = {
    parent: { label: "Parent", tone: "blue" as const },
    therapist: { label: "Therapist", tone: "sage" as const },
    admin: { label: "Admin", tone: "reward" as const },
  };
  const { label, tone } = map[role];
  return <Badge tone={tone}>{label}</Badge>;
}

export function SessionStatusBadge({ status }: { status: "booked" | "cancelled" | "completed" }) {
  const map = {
    booked: { label: "Booked", tone: "sage" as const },
    cancelled: { label: "Cancelled", tone: "alert" as const },
    completed: { label: "Completed", tone: "blue" as const },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function RiskBadge({ risk }: { risk: "none" | "concern" | "urgent" }) {
  const map = {
    none: { label: "None", tone: "sage" as const },
    concern: { label: "Concern", tone: "sand" as const },
    urgent: { label: "Urgent", tone: "alert" as const },
  };
  const { label, tone } = map[risk];
  return <Badge tone={tone} dot={risk !== "none"}>{label}</Badge>;
}

export function TherapistStatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { label: "Pending approval", tone: "sand" as const },
    approved: { label: "Approved", tone: "sage" as const },
    rejected: { label: "Rejected", tone: "alert" as const },
  };
  const { label, tone } = map[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge tone="sage" dot>
      Active
    </Badge>
  ) : (
    <Badge tone="alert" dot>
      Deactivated
    </Badge>
  );
}
