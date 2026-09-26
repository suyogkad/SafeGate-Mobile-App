import { cn } from "../../lib/utils";
import { initials } from "../../lib/utils";

const palette = [
  "bg-tint-sage text-primary-hover",
  "bg-tint-blue text-[#2C5A66]",
  "bg-tint-sand text-[#7A5C2E]",
  "bg-reward/50 text-[#7A5C0F]",
];

function paletteIndex(name: string): number {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return sum % palette.length;
}

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClasses = { sm: "size-7 text-[11px]", md: "size-9 text-[13px]", lg: "size-12 text-[16px]" }[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeClasses,
        palette[paletteIndex(name)],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
