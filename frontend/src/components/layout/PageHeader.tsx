import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-medium text-text">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
