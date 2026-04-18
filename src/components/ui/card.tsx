import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-[color:var(--border)] bg-bg-1 transition-colors",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";
