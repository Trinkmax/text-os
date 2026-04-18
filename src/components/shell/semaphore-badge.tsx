"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SemaphoreCounter({
  initial,
  orgId,
}: {
  initial: { green: number; amber: number; red: number };
  orgId: string;
}) {
  const [counts, setCounts] = useState(initial);

  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`sem-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "textos_suggestions", filter: `org_id=eq.${orgId}` },
        async () => {
          const { data } = await sb
            .from("textos_suggestions")
            .select("semaphore,status")
            .eq("org_id", orgId)
            .in("status", ["pending", "auto_sent"]);
          if (!data) return;
          const next = { green: 0, amber: 0, red: 0 };
          for (const row of data) {
            if (row.status === "auto_sent") next.green += 1;
            else if (row.semaphore === "amber") next.amber += 1;
            else if (row.semaphore === "red") next.red += 1;
          }
          setCounts(next);
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [orgId]);

  return (
    <div className="flex items-center gap-3 px-3 h-9 rounded-full border border-[color:var(--border)] bg-bg-1 text-sm">
      <Count color="green" value={counts.green} label="Auto" />
      <div className="h-4 w-px bg-[color:var(--border)]" />
      <Count color="amber" value={counts.amber} label="Sugerir" />
      <div className="h-4 w-px bg-[color:var(--border)]" />
      <Count color="red" value={counts.red} label="Humano" />
    </div>
  );
}

function Count({ color, value, label }: { color: "green" | "amber" | "red"; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", `dot-${color}`)} aria-hidden />
      <span className="font-mono tabular-nums font-semibold text-fg">{value}</span>
      <span className="text-fg-3 text-xs hidden md:inline">{label}</span>
    </div>
  );
}
