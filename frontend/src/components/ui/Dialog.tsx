import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-text/25 backdrop-blur-[2px]"
        style={{ animationName: "fade-in", animationDuration: "0.15s", animationFillMode: "both" }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lifted"
        style={{ animationName: "scale-in", animationDuration: "0.18s", animationTimingFunction: "cubic-bezier(0.16,1,0.3,1)", animationFillMode: "both" }}
      >
        <h3 className="font-display text-[17px] font-medium text-text">{title}</h3>
        {description && <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{description}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
