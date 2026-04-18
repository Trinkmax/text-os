"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Megaphone, Plus, Send, Users, Clock, Eye, MessageCircle, ArrowRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

const MOCK = [
  { id: "1", name: "Recordatorio turnos mañana", status: "scheduled", delivered: 0, read: 0, replied: 0, total: 124, scheduledAt: "Mañana 9:00" },
  { id: "2", name: "Promo fin de semana", status: "completed", delivered: 412, read: 380, replied: 67, total: 412 },
  { id: "3", name: "Clientes inactivos 30 días", status: "draft", delivered: 0, read: 0, replied: 0, total: 208 },
];

export function CampaignsView() {
  const [composing, setComposing] = useState(false);
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto w-full">
      <header className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campañas</h1>
          <p className="text-fg-3 text-sm mt-0.5">Mensajes masivos, con métricas como si fueran uno a uno.</p>
        </div>
        <div className="flex-1" />
        <Button className="gap-2" onClick={() => setComposing(true)}>
          <Plus className="h-4 w-4" /> Nueva campaña
        </Button>
      </header>

      <div className="flex flex-col gap-2">
        {MOCK.map((c) => (
          <div key={c.id} className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-bg-2 border border-[color:var(--border)] flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-fg-2" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{c.name}</div>
              <div className="text-xs text-fg-3 flex items-center gap-3 mt-0.5">
                <StatusBadge status={c.status} />
                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.total}</span>
                {c.scheduledAt && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.scheduledAt}</span>}
              </div>
            </div>
            {c.status === "completed" && (
              <div className="flex items-center gap-4 text-xs">
                <Metric label="Entregados" value={c.delivered} />
                <Metric label="Leídos" value={c.read} />
                <Metric label="Respondieron" value={c.replied} />
              </div>
            )}
            <Button variant="ghost" size="sm" className="gap-1">
              Abrir <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {composing && <Composer onClose={() => setComposing(false)} />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-fg-4 text-[10px] uppercase tracking-wider">{label}</div>
      <div className="font-mono font-semibold text-fg tabular-nums">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "amber" | "green" | "brand" }> = {
    draft: { label: "Borrador", variant: "default" },
    scheduled: { label: "Programada", variant: "amber" },
    sending: { label: "Enviando", variant: "brand" },
    completed: { label: "Completada", variant: "green" },
  };
  const m = map[status] || map.draft;
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function Composer({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"audience" | "message" | "schedule">("audience");
  const [audience, setAudience] = useState<string[]>(["Clientes activos"]);
  const [message, setMessage] = useState("");
  const [schedule, setSchedule] = useState<"now" | "later">("now");

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-4xl h-[680px] max-h-[80vh] rounded-2xl border border-[color:var(--border)] bg-bg-1 overflow-hidden flex flex-col"
      >
        <header className="px-6 py-4 border-b border-[color:var(--border)] flex items-center">
          <h2 className="font-semibold text-lg">Nueva campaña</h2>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {(["audience", "message", "schedule"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold",
                    step === s ? "bg-brand text-white" : "bg-bg-3 text-fg-3"
                  )}
                >
                  {i + 1}
                </div>
                {i < 2 && <div className="w-6 h-px bg-[color:var(--border)]" />}
              </div>
            ))}
          </div>
        </header>

        <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
          <div className="p-6 border-r border-[color:var(--border)] overflow-y-auto flex flex-col gap-4">
            {step === "audience" && (
              <>
                <h3 className="font-semibold">¿A quién le enviás?</h3>
                <div className="flex flex-wrap gap-2">
                  {["Clientes activos", "Leads nuevos", "Última compra > 30 días", "Tag: VIP", "Etapa: Propuesta"].map((a) => (
                    <Chip
                      key={a}
                      active={audience.includes(a)}
                      onClick={() =>
                        setAudience((ar) => (ar.includes(a) ? ar.filter((x) => x !== a) : [...ar, a]))
                      }
                    >
                      {a}
                    </Chip>
                  ))}
                </div>
                <div className="mt-auto rounded-xl border border-[color:var(--border)] bg-bg-2 p-3 flex items-center gap-3 text-sm">
                  <Users className="h-4 w-4 text-brand-2" />
                  <div>
                    <b>214</b> contactos coinciden
                  </div>
                </div>
              </>
            )}
            {step === "message" && (
              <>
                <h3 className="font-semibold">Escribí el mensaje</h3>
                <Textarea rows={8} placeholder="Usá {nombre} para personalizar." value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="flex flex-wrap gap-1.5">
                  <Chip onClick={() => setMessage(message + " {nombre}")}>{"{nombre}"}</Chip>
                  <Chip onClick={() => setMessage(message + " {negocio}")}>{"{negocio}"}</Chip>
                </div>
              </>
            )}
            {step === "schedule" && (
              <>
                <h3 className="font-semibold">¿Cuándo?</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSchedule("now")}
                    className={cn(
                      "flex-1 p-4 rounded-xl border text-left transition",
                      schedule === "now" ? "border-brand bg-[rgba(139,92,246,0.08)]" : "border-[color:var(--border)] bg-bg-2"
                    )}
                  >
                    <div className="font-medium">Ahora</div>
                    <div className="text-xs text-fg-3">Enviar al confirmar</div>
                  </button>
                  <button
                    onClick={() => setSchedule("later")}
                    className={cn(
                      "flex-1 p-4 rounded-xl border text-left transition",
                      schedule === "later" ? "border-brand bg-[rgba(139,92,246,0.08)]" : "border-[color:var(--border)] bg-bg-2"
                    )}
                  >
                    <div className="font-medium">Programar</div>
                    <div className="text-xs text-fg-3">Elegí fecha y hora</div>
                  </button>
                </div>
                {schedule === "later" && (
                  <div className="flex gap-2">
                    <Input type="date" />
                    <Input type="time" />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-6 bg-bg-0 flex items-center justify-center">
            <MobilePreview message={message || "Escribí tu mensaje para verlo acá."} />
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-[color:var(--border)] flex justify-between">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <div className="flex items-center gap-2">
            {step !== "audience" && (
              <Button variant="secondary" onClick={() => setStep(step === "schedule" ? "message" : "audience")}>
                Atrás
              </Button>
            )}
            {step !== "schedule" ? (
              <Button onClick={() => setStep(step === "audience" ? "message" : "schedule")}>
                Continuar
              </Button>
            ) : (
              <Button onClick={onClose} className="gap-2">
                <Send className="h-4 w-4" /> Enviar campaña
              </Button>
            )}
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

function MobilePreview({ message }: { message: string }) {
  return (
    <div className="h-[500px] w-[260px] rounded-[40px] border-[10px] border-bg-3 bg-bg-0 p-4 flex flex-col">
      <div className="h-4 w-16 rounded-full bg-bg-3 mx-auto mb-3" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="bg-bg-2 rounded-2xl rounded-tl-md px-3 py-2 text-xs max-w-[85%]">{message}</div>
      </div>
    </div>
  );
}
