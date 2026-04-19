"use client";

import { useState } from "react";
import { Plus, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { TexSays, TexEmpty, TEX_COPY } from "@/components/tex";

type Condition = {
  target?: string;
  condition?: string;
  value?: string;
  andTarget?: string;
  andCondition?: string;
  andValue?: string;
};

type Alert = {
  id: string;
  name: string | null;
  condition: Condition | null;
  notify: string[] | null;
  enabled: boolean;
  created_at: string;
};

interface AlertsViewProps {
  alerts: Alert[];
}

export function AlertsView({ alerts: initialAlerts }: AlertsViewProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-4xl mx-auto w-full">
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Alertas</h1>
          <p className="text-fg-3 text-sm mt-0.5">Reglas en lenguaje humano. Si pasa X, te avisamos por Y.</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Nueva alerta
        </Button>
      </header>
      <div className="mb-5">
        <TexSays
          variant="support"
          size="sm"
          tone="info"
          message={<span className="text-[13px]">{TEX_COPY.alerts.header}</span>}
          maxBubbleWidth={380}
        />
      </div>

      {alerts.length === 0 ? (
        <TexEmpty
          variant="support"
          size="xl"
          message={<span>{TEX_COPY.empty.noAlerts}</span>}
          action={
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Crear primera alerta
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((r) => {
            const c = r.condition || {};
            const notify = r.notify || [];
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4",
                  !r.enabled && "opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <Switch
                    checked={r.enabled}
                    onCheckedChange={(v) =>
                      setAlerts((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))
                    }
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 text-[13px] sm:text-sm">
                    <span className="text-fg-3">Si</span>
                    {c.target && <Pill>{c.target}</Pill>}
                    {c.condition && <Pill>{c.condition}</Pill>}
                    {c.value && <Pill>{c.value}</Pill>}
                    {c.andTarget && (
                      <>
                        <span className="text-fg-3">y</span>
                        <Pill>{c.andTarget}</Pill>
                      </>
                    )}
                    <span className="text-fg-3">,</span>
                    <Pill>notificarme por</Pill>
                    {notify.map((n) => (
                      <Pill key={n} tone="brand">
                        {n}
                      </Pill>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-fg-3 hover:text-[color:var(--accent-red)] shrink-0"
                    aria-label="Eliminar alerta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ children, tone }: { children: React.ReactNode; tone?: "brand" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-sm border transition-colors",
        tone === "brand"
          ? "bg-[rgba(139,92,246,0.12)] border-[rgba(139,92,246,0.3)] text-brand-2"
          : "bg-bg-2 border-[color:var(--border)] text-fg hover:bg-bg-3 cursor-pointer"
      )}
    >
      {children}
      {!tone && <ChevronDown className="h-3 w-3 text-fg-3" />}
    </span>
  );
}
