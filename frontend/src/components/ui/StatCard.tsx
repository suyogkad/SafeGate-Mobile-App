import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "sage",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "sage" | "blue" | "sand" | "reward";
}) {
  const toneClasses = {
    sage: "bg-tint-sage text-primary-hover",
    blue: "bg-tint-blue text-[#2C5A66]",
    sand: "bg-tint-sand text-[#7A5C2E]",
    reward: "bg-reward/40 text-[#7A5C0F]",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-text-muted">{label}</p>
          <p className="mt-2 font-display text-[28px] font-medium leading-none text-text">{value}</p>
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-xl", toneClasses)}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}
