import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      gap={10}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex items-center gap-3 w-full rounded-xl border border-border bg-surface px-4 py-3.5 shadow-lifted font-sans",
          title: "text-[13.5px] font-medium text-text",
          description: "text-[13px] text-text-muted mt-0.5",
          success: "!border-primary/30",
          error: "!border-alert/40",
          icon: "shrink-0",
        },
      }}
    />
  );
}
