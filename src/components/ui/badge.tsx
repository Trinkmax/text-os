import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "green" | "amber" | "red" | "brand" | "ghost";
}) {
  const variants: Record<string, string> = {
    default: "bg-bg-2 text-fg-2 border border-[color:var(--border)]",
    green: "bg-[rgba(16,185,129,0.1)] text-[color:var(--accent-green)] border border-[rgba(16,185,129,0.2)]",
    amber: "bg-[rgba(245,158,11,0.1)] text-[color:var(--accent-amber)] border border-[rgba(245,158,11,0.2)]",
    red: "bg-[rgba(239,68,68,0.1)] text-[color:var(--accent-red)] border border-[rgba(239,68,68,0.2)]",
    brand: "bg-[rgba(139,92,246,0.12)] text-[color:var(--brand-2)] border border-[rgba(139,92,246,0.24)]",
    ghost: "text-fg-3",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
