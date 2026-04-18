import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-[color:var(--border)] bg-bg-1 px-4 text-base text-fg placeholder:text-fg-3 transition-colors focus:border-brand-2 focus:outline-none focus:ring-2 focus:ring-brand-2/30 disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
