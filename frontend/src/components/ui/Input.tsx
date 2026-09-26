import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-text-muted">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-10 w-full rounded-xl border bg-surface px-3 text-sm text-text placeholder:text-text-muted/70",
              "transition-colors duration-150 outline-none",
              "focus:border-primary focus:ring-2 focus:ring-primary/15",
              error ? "border-alert focus:border-alert focus:ring-alert/15" : "border-border",
              icon && "pl-9",
              className,
            )}
            {...props}
          />
        </div>
        {error ? (
          <span className="text-[12px] text-alert">{error}</span>
        ) : hint ? (
          <span className="text-[12px] text-text-muted">{hint}</span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = "Input";
