"use client";

import { motion } from "motion/react";
import { TrendingUp, Zap, BarChart3, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { TexSays, TexEmpty, TEX_COPY } from "@/components/tex";

type Gap = { id: string; topic: string; count: number; sample_question: string | null };
type Topic = { topic: string; usage_count: number };
type HistoricalDay = { day: string; green: number; amber: number; red: number };
type FunnelStep = { label: string; value: number };

interface ReportsViewProps {
  coverage: number;
  topGaps: Gap[];
  topTopics: Topic[];
  historical: HistoricalDay[];
  funnel: FunnelStep[];
  newConversations: number;
  newConversationsDelta: number | null;
}

export function ReportsView({
  coverage,
  topGaps,
  topTopics,
  historical,
  funnel,
  newConversations,
  newConversationsDelta,
}: ReportsViewProps) {
  const [range, setRange] = useState("7d");
  const hasAnyActivity =
    historical.some((d) => d.green + d.amber + d.red > 0) ||
    newConversations > 0 ||
    topTopics.length > 0;

  const texLine = !hasAnyActivity
    ? TEX_COPY.analytics.noData
    : coverage >= 80
      ? TEX_COPY.analytics.weekendsSolo
      : coverage >= 50
        ? TEX_COPY.analytics.mondaysPeak
        : TEX_COPY.analytics.roomToGrow;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-6xl mx-auto w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-fg-3 text-sm mt-0.5">Lo que hizo tu IA. Lo que te falta enseñarle.</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full sm:w-36 h-11 sm:h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="mb-6">
        <TexSays
          variant="analytics"
          size="sm"
          position="left"
          tone="info"
          message={<span className="text-[13px]">{texLine}</span>}
          maxBubbleWidth={440}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <GaugeCard value={coverage} label="Cobertura de IA" hint="Preguntas que la IA manejó sola." />
        <StatCard
          label="Conversaciones nuevas"
          value={newConversations}
          delta={newConversationsDelta}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            Semáforo histórico <BarChart3 className="h-4 w-4 text-brand-2" />
          </h3>
          {historical.every((d) => d.green + d.amber + d.red === 0) ? (
            <TexEmpty
              variant="analytics"
              size="sm"
              message={<span className="text-[12px]">Todavía no hay sugerencias en estos 7 días. Cuando la IA empiece a trabajar, ves el semáforo acá.</span>}
              className="py-4"
            />
          ) : (
            <HistoricalBars days={historical} />
          )}
        </section>
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-4">Funnel de conversión</h3>
          {funnel.length === 0 || funnel.every((s) => s.value === 0) ? (
            <TexEmpty
              variant="analytics"
              size="sm"
              message={<span className="text-[12px]">Sin contactos en el pipeline todavía. Creá o importá contactos para armar el funnel.</span>}
              className="py-4"
            />
          ) : (
            <Funnel steps={funnel} />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-2" /> Top 5 temas
          </h3>
          <div className="flex flex-col gap-2">
            {topTopics.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="text-fg-4 font-mono text-xs w-5">{i + 1}</div>
                <div className="flex-1">{t.topic}</div>
                <div className="w-32 h-1.5 rounded-full bg-bg-3 overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{
                      width: `${Math.min(100, (t.usage_count / Math.max(1, topTopics[0]?.usage_count || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <div className="font-mono text-xs text-fg-3 w-10 text-right">{t.usage_count}×</div>
              </div>
            ))}
            {!topTopics.length && (
              <TexEmpty
                variant="analytics"
                size="sm"
                message={<span className="text-[12px]">{TEX_COPY.analytics.noData}</span>}
                className="py-6"
              />
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-[color:var(--accent-red)]/25 bg-[rgba(239,68,68,0.04)] p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-[color:var(--accent-red)]" /> Top 5 scope gaps
          </h3>
          <div className="flex flex-col gap-2">
            {topGaps.map((g) => (
              <div key={g.id} className="flex items-center gap-3">
                <div className="flex-1">{g.topic}</div>
                <span className="text-xs text-fg-3">×{g.count}</span>
                <Link href="/conocimiento" className="inline-flex items-center gap-1 text-xs text-brand-2 hover:text-brand-3">
                  Crear tarjeta <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
            {!topGaps.length && <div className="text-sm text-fg-3">Tu IA cubre todo 🎉</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function GaugeCard({ value, label, hint }: { value: number; label: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
      <div className="text-xs text-fg-3">{label}</div>
      <div className="flex items-baseline gap-2 mt-1 mb-3">
        <div className="font-mono font-bold text-4xl bg-gradient-to-br from-brand-2 to-[#EC4899] bg-clip-text text-transparent">
          {value}%
        </div>
      </div>
      <div className="h-2 rounded-full bg-bg-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-brand to-[#EC4899]"
        />
      </div>
      <div className="text-xs text-fg-3 mt-3">{hint}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta: number | null;
}) {
  const positive = delta === null ? null : delta >= 0;
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
      <div className="flex items-center gap-2 text-xs text-fg-3">
        <Users className="h-4 w-4" />
        {label}
      </div>
      <div className="font-mono font-bold text-4xl mt-1 mb-1">{value}</div>
      {delta !== null ? (
        <div
          className={`text-xs font-medium ${
            positive ? "text-[color:var(--accent-green)]" : "text-[color:var(--accent-red)]"
          }`}
        >
          {positive ? "+" : ""}
          {delta}% vs 7 días previos
        </div>
      ) : (
        <div className="text-xs text-fg-4">Sin período previo para comparar</div>
      )}
    </div>
  );
}

function HistoricalBars({ days }: { days: HistoricalDay[] }) {
  const max = Math.max(1, ...days.map((d) => d.green + d.amber + d.red));
  return (
    <div className="flex items-end gap-3 h-40">
      {days.map((d, i) => {
        const total = d.green + d.amber + d.red;
        const pct = (n: number) => (total === 0 ? 0 : (n / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-stretch gap-1">
            <div className="flex-1 flex flex-col justify-end gap-0.5">
              <div
                className="bg-[color:var(--accent-red)] rounded-t-sm"
                style={{ height: `${pct(d.red)}%` }}
              />
              <div className="bg-[color:var(--accent-amber)]" style={{ height: `${pct(d.amber)}%` }} />
              <div
                className="bg-[color:var(--accent-green)] rounded-b-sm"
                style={{ height: `${pct(d.green)}%` }}
              />
            </div>
            <div className="text-[10px] text-fg-4 text-center uppercase">{d.day}</div>
          </div>
        );
      })}
    </div>
  );
}

function Funnel({ steps }: { steps: FunnelStep[] }) {
  const colors = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899", "#06B6D4"];
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="text-xs text-fg-3 w-36 shrink-0">{s.label}</div>
          <div className="flex-1 h-8 rounded-lg bg-bg-3 overflow-hidden relative">
            <div
              className="h-full"
              style={{ width: `${(s.value / max) * 100}%`, background: colors[i % colors.length] }}
            />
            <div className="absolute inset-0 flex items-center px-3 text-sm font-mono font-semibold">
              {s.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
