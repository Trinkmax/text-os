"use client";

import { useState } from "react";
import { Bell, Plus, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Rule = {
  id: string;
  enabled: boolean;
  target: string;
  condition: string;
  value: string;
  andTarget?: string;
  andCondition?: string;
  andValue?: string;
  notify: string[];
};

const INITIAL: Rule[] = [
  {
    id: "1",
    enabled: true,
    target: "una conversación",
    condition: "no responde en",
    value: "30 minutos",
    andTarget: "está asignada a mí",
    andCondition: "",
    andValue: "",
    notify: ["push", "email"],
  },
  {
    id: "2",
    enabled: true,
    target: "la IA",
    condition: "escaló a humano por scope gap",
    value: "",
    notify: ["push"],
  },
  {
    id: "3",
    enabled: false,
    target: "un lead nuevo",
    condition: "entra por",
    value: "Instagram",
    notify: ["email"],
  },
];

export function AlertsView() {
  const [rules, setRules] = useState<Rule[]>(INITIAL);
  return (
    <div className="px-6 lg:px-10 py-8 max-w-4xl mx-auto w-full">
      <header className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
          <p className="text-fg-3 text-sm mt-0.5">Reglas en lenguaje humano. Si pasa X, te avisamos por Y.</p>
        </div>
        <div className="flex-1" />
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Nueva alerta
        </Button>
      </header>
      <div className="flex flex-col gap-2">
        {rules.map((r) => (
          <div
            key={r.id}
            className={cn(
              "rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4",
              !r.enabled && "opacity-60"
            )}
          >
            <div className="flex items-start gap-3">
              <Switch checked={r.enabled} onCheckedChange={(c) => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: c } : x)))} />
              <div className="flex-1 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-fg-3">Si</span>
                <Pill>{r.target}</Pill>
                <Pill>{r.condition}</Pill>
                {r.value && <Pill>{r.value}</Pill>}
                {r.andTarget && (
                  <>
                    <span className="text-fg-3">y</span>
                    <Pill>{r.andTarget}</Pill>
                  </>
                )}
                <span className="text-fg-3">,</span>
                <Pill>notificarme por</Pill>
                {r.notify.map((n) => (
                  <Pill key={n} tone="brand">
                    {n}
                  </Pill>
                ))}
              </div>
              <Button variant="ghost" size="icon-sm" className="text-fg-3 hover:text-[color:var(--accent-red)]">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
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
