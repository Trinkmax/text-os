"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  Clock,
  DollarSign,
  Sparkles,
  ThumbsDown,
  TrendingUp,
  Wifi,
  WifiOff,
  ZapOff,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatRelative } from "@/lib/utils";
import { TexSays, TEX_COPY } from "@/components/tex";
import { flagAutosend } from "@/app/actions/suggestions";
import type { AiHealth } from "@/app/actions/ai-insights";

export function AiHealthView({
  orgId: _orgId,
  initialHealth,
  initialRange,
}: {
  orgId: string;
  initialHealth: AiHealth;
  initialRange: number;
}) {
  const router = useRouter();
  const [range, setRange] = useState(String(initialRange));
  const health = initialHealth;

  function changeRange(v: string) {
    setRange(v);
    router.push(`/reportes/ia?range=${v}`);
  }

  const pctAutopilot = Math.round(health.rates.autopilot * 100);
  const pctEscalation = Math.round(health.rates.escalation * 100);
  const pctFailure = Math.round(health.rates.failure * 100);

  const tex = useMemo(() => {
    if (health.totals.runs === 0) return TEX_COPY.analytics.noData;
    if (pctAutopilot >= 70) return "Estás autopiloteando bien. Cuando aparezca algo raro, te aviso.";
    if (pctAutopilot >= 30) return "Vamos saliendo. Cada tarjeta nueva sube el autopilot.";
    return "Recién arrancamos. Sumá tarjetas para que pueda responder más sola.";
  }, [pctAutopilot, health.totals.runs]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-6xl mx-auto w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Link
            href="/reportes"
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[color:var(--border)] hover:bg-bg-2 text-fg-3 hover:text-fg shrink-0"
            aria-label="Volver a Reportes"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Salud de la IA</h1>
              <Badge variant="brand" className="text-[11px]">
                <BrainCircuit className="h-3 w-3" /> Admin
              </Badge>
            </div>
            <p className="text-fg-3 text-sm mt-0.5 truncate">
              Cuánto trabajó tu IA, cuánto te costó, y dónde la podés ayudar.
            </p>
          </div>
        </div>
        <Select value={range} onValueChange={changeRange}>
          <SelectTrigger className="w-full sm:w-36 h-11 sm:h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Últimas 24h</SelectItem>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="mb-6">
        <TexSays
          variant="analytics"
          size="sm"
          tone="info"
          message={<span className="text-[13px]">{tex}</span>}
          maxBubbleWidth={460}
        />
      </div>

      {/* Big numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <BigStat
          label="Autopilot"
          value={`${pctAutopilot}%`}
          hint={`${health.totals.autosent}/${health.totals.suggestions || 0} mandadas solas`}
          accent="green"
        />
        <BigStat
          label="A revisar"
          value={`${health.totals.pending}`}
          hint="Esperando que decidas"
          accent="amber"
        />
        <BigStat
          label="A humano"
          value={`${pctEscalation}%`}
          hint={`${health.totals.escalated} escaladas`}
          accent="red"
        />
        <BigStat
          label="Costo IA"
          value={`$${health.cost.totalUsd.toFixed(2)}`}
          hint={`Últimos ${health.rangeDays} día${health.rangeDays === 1 ? "" : "s"}`}
          accent="brand"
          icon={<DollarSign className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Latency + Knowledge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-2" /> Latencia por etapa
          </h3>
          <p className="text-xs text-fg-3 mb-4">
            Mediana / p95. Si el total p95 sube de 6s, mirá quién se está colgando.
          </p>
          <LatencyTable latency={health.latency} />
        </section>

        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-brand-2" /> Memoria indexada
          </h3>
          <KnowledgeBlock knowledge={health.knowledge} pctFailure={pctFailure} />
        </section>
      </div>

      {/* Providers + Top cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Wifi className="h-4 w-4 text-brand-2" /> Proveedores
          </h3>
          <ProvidersList providers={health.providers} />
        </section>

        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-2" /> Top tarjetas usadas
          </h3>
          <TopCards cards={health.topCards} />
        </section>
      </div>

      <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[color:var(--accent-green)]" /> Lo que la IA mandó sola
        </h3>
        <p className="text-xs text-fg-3 mb-4">
          Una muestra reciente. Si viste algo mal, dejá feedback para que baje su confianza.
        </p>
        <RecentAutosends items={health.recentAutosends} />
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BigStat({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "green" | "amber" | "red" | "brand";
  icon?: React.ReactNode;
}) {
  const color =
    accent === "green"
      ? "from-[color:var(--accent-green)] to-[#06b67a]"
      : accent === "amber"
        ? "from-[color:var(--accent-amber)] to-[#d97706]"
        : accent === "red"
          ? "from-[color:var(--accent-red)] to-[#dc2626]"
          : "from-brand-2 to-[#EC4899]";
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4">
      <div className="text-[11px] uppercase tracking-wider text-fg-3 flex items-center gap-1.5">
        {icon} {label}
      </div>
      <div
        className={cn(
          "font-mono font-bold text-3xl sm:text-4xl mt-1 bg-gradient-to-br bg-clip-text text-transparent",
          color,
        )}
      >
        {value}
      </div>
      <div className="text-[11px] text-fg-3 mt-1 truncate">{hint}</div>
    </div>
  );
}

function LatencyTable({ latency }: { latency: AiHealth["latency"] }) {
  const stages: Array<{ key: keyof AiHealth["latency"]; label: string }> = [
    { key: "embed", label: "Embedding" },
    { key: "classify", label: "Clasificación" },
    { key: "retrieve", label: "Recuperación" },
    { key: "generate", label: "Generación" },
    { key: "ground", label: "Verificación" },
    { key: "total", label: "Total end-to-end" },
  ];
  const maxP95 = Math.max(1, ...stages.map((s) => latency[s.key].p95));
  return (
    <div className="flex flex-col gap-2.5">
      {stages.map((s) => {
        const data = latency[s.key];
        const isTotal = s.key === "total";
        const pct = (data.p95 / maxP95) * 100;
        return (
          <div key={s.key}>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className={cn("text-xs", isTotal && "font-semibold")}>{s.label}</div>
              <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-fg-3">
                <span title="mediana">p50: {fmtMs(data.p50)}</span>
                <span className="text-fg-4">·</span>
                <span title="percentil 95" className={isTotal ? "text-fg" : "text-fg-2"}>
                  p95: {fmtMs(data.p95)}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  isTotal ? "bg-gradient-to-r from-brand-2 to-[#EC4899]" : "bg-fg-3",
                )}
              />
            </div>
            <div className="text-[10px] text-fg-4 mt-0.5">{data.samples} muestras</div>
          </div>
        );
      })}
    </div>
  );
}

function fmtMs(ms: number): string {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function KnowledgeBlock({
  knowledge,
  pctFailure,
}: {
  knowledge: AiHealth["knowledge"];
  pctFailure: number;
}) {
  const pct = knowledge.total ? Math.round((knowledge.fresh / knowledge.total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <div className="font-mono font-bold text-3xl">
          {knowledge.fresh}
          <span className="text-fg-4">/{knowledge.total}</span>
        </div>
        <div className="text-xs text-fg-3">tarjetas indexadas</div>
      </div>
      <div className="h-1.5 rounded-full bg-bg-3 overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-brand-2 to-[#EC4899]"
        />
      </div>
      {knowledge.stale_or_failed > 0 ? (
        <div className="text-[12px] text-[color:var(--accent-amber)] flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          {knowledge.stale_or_failed} tarjeta{knowledge.stale_or_failed === 1 ? "" : "s"} pendiente.{" "}
          <Link href="/conocimiento" className="underline-offset-4 hover:underline">
            Indexarlas
          </Link>
        </div>
      ) : (
        <div className="text-[12px] text-fg-3 flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-[color:var(--accent-green)]" /> Memoria al día.
        </div>
      )}
      {pctFailure > 0 && (
        <div className="text-[11px] text-fg-3 mt-2">
          Tasa de error en pipeline: <b className="text-fg">{pctFailure}%</b>
        </div>
      )}
    </div>
  );
}

function ProvidersList({ providers }: { providers: AiHealth["providers"] }) {
  if (providers.length === 0) {
    return (
      <div className="text-sm text-fg-3 py-2">
        No hay proveedores conectados.{" "}
        <Link href="/ajustes?tab=ia" className="text-brand-2 hover:text-brand-3">
          Conectá uno →
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {providers.map((p) => {
        const dot =
          p.health === "ok" ? "#10B981" : p.health === "warn" ? "#F59E0B" : "#EF4444";
        const Icon = p.health === "down" ? WifiOff : p.health === "warn" ? ZapOff : Wifi;
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] bg-bg-1 p-3"
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${dot}22`, color: dot }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm flex items-center gap-1.5 flex-wrap">
                <span className="truncate">{p.nickname}</span>
                {p.is_default && p.is_active && (
                  <Badge variant="brand" className="text-[10px]">Principal</Badge>
                )}
                <Badge variant="ghost" className="text-[10px] capitalize">{p.role}</Badge>
              </div>
              <div className="text-[11px] text-fg-3 font-mono truncate">{p.model}</div>
              {p.last_test_error && (
                <div className="text-[11px] text-[color:var(--accent-red-2)] mt-1 truncate">
                  {p.last_test_error}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] font-mono tabular-nums text-fg">
                {p.recent_calls}
                <span className="text-fg-4"> calls</span>
              </div>
              {p.recent_errors > 0 && (
                <div className="text-[10px] text-[color:var(--accent-red-2)]">
                  {p.recent_errors} err
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopCards({ cards }: { cards: AiHealth["topCards"] }) {
  if (cards.length === 0) {
    return (
      <div className="text-sm text-fg-3 py-2">
        Todavía no hay datos.{" "}
        <Link href="/conocimiento" className="text-brand-2 hover:text-brand-3">
          Cargá tu primera tarjeta →
        </Link>
      </div>
    );
  }
  const max = Math.max(1, ...cards.map((c) => c.usage_count));
  return (
    <div className="flex flex-col gap-2">
      {cards.map((c, i) => (
        <Link
          key={c.id}
          href="/conocimiento"
          className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-bg-2 transition"
        >
          <div className="text-fg-4 font-mono text-xs w-5 shrink-0">{i + 1}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-brand-2 truncate">{c.topic}</div>
            <div className="text-sm truncate">{c.question}</div>
          </div>
          <div className="w-20 h-1.5 rounded-full bg-bg-3 overflow-hidden shrink-0">
            <div
              className="h-full bg-brand-2"
              style={{ width: `${(c.usage_count / max) * 100}%` }}
            />
          </div>
          <div className="font-mono text-xs text-fg-3 w-10 text-right tabular-nums shrink-0">
            {c.usage_count}×
          </div>
        </Link>
      ))}
    </div>
  );
}

function RecentAutosends({ items }: { items: AiHealth["recentAutosends"] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [, start] = useTransition();
  const visible = items.filter((i) => !hidden.has(i.id));
  if (visible.length === 0) {
    return (
      <div className="text-sm text-fg-3 py-2">
        Sin auto-sends en este período. La IA todavía no se animó a mandar sola.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-bg-1 p-3"
        >
          <div className="h-8 w-8 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-4 w-4 text-[color:var(--accent-green)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-fg-3 mb-0.5">
              Para <b className="text-fg">{a.contact_name}</b>
              <span className="text-fg-4 ml-2">{formatRelative(a.created_at)}</span>
              <span className="text-fg-4 ml-2">· {Math.round(a.confidence * 100)}%</span>
            </div>
            <div className="text-sm text-fg leading-relaxed">{a.proposed_text}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-fg-3 hover:text-[color:var(--accent-red)] shrink-0"
            onClick={() => {
              start(async () => {
                await flagAutosend(a.id);
                setHidden((p) => {
                  const next = new Set(p);
                  next.add(a.id);
                  return next;
                });
                toast("Gracias — bajamos la confianza para casos parecidos.");
              });
            }}
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1">Estuvo mal</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
