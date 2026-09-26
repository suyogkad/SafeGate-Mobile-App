import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-tint-sage text-primary-hover">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="font-display text-[16px] font-medium text-text">{title}</p>
        {description && <p className="mt-1 max-w-sm text-[13px] text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
