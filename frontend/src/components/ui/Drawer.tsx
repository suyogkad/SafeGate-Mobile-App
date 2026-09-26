import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  width?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" }[width];

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-text/20 backdrop-blur-[2px] animate-in"
        style={{ animationName: "fade-in", animationDuration: "0.18s", animationFillMode: "both" }}
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex h-full w-full flex-col bg-bg shadow-lifted",
          widthClass,
        )}
        style={{ animationName: "slide-in", animationDuration: "0.24s", animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)", animationFillMode: "both" }}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <h2 className="font-display text-[19px] font-medium text-text">{title}</h2>
            {subtitle && <div className="mt-1 text-[13px] text-text-muted">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-tint-sand/60 hover:text-text"
            aria-label="Close"
          >
            <X className="size-4.5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
