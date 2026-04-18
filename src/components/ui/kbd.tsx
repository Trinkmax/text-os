import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <kbd className={cn("inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-md text-[11px] font-mono border border-[color:var(--border)] bg-bg-2 text-fg-2 leading-none", className)}>{children}</kbd>;
}
