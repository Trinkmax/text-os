"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Chip({
  children,
  onRemove,
  active,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onRemove?: () => void; active?: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium transition-all cursor-pointer select-none",
        active
          ? "bg-brand text-white border border-brand shadow-[0_2px_12px_rgba(139,92,246,0.35)]"
          : "bg-bg-2 text-fg-2 border border-[color:var(--border)] hover:bg-bg-3 hover:text-fg",
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-0.5 hover:bg-bg-4 -mr-1"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
