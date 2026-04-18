"use client";

import { motion } from "motion/react";
import { TrendingUp, Zap, BarChart3, Users, Clock, Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

type Gap = { id: string; topic: string; count: number; sample_question: string | null };
type Topic = { topic: string; usage_count: number };

export function ReportsView({ coverage, topGaps, topTopics }: { coverage: number; topGaps: Gap[]; topTopics: Topic[] }) {
  const [range, setRange] = useState("7d");
  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto w-full">
      <header className="mb-6 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-fg-3 text-sm mt-0.5">Lo que hizo tu IA. Lo que te falta enseñarle.</p>
        </div>
        <div className="flex-1" />
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Últimas 24h</SelectItem>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
          </SelectContent>
        </Select>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <GaugeCard value={coverage} label="Cobertura de IA" hint="Preguntas que la IA manejó sola." />
        <StatCard icon={<Clock className="h-4 w-4" />} label="Tiempo primera respuesta" value="2m 14s" delta="-18%" positive />
        <StatCard icon={<Users className="h-4 w-4" />} label="Conversaciones nuevas" value="142" delta="+22%" positive />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            Semáforo histórico <BarChart3 className="h-4 w-4 text-brand-2" />
          </h3>
          <HistoricalBars />
        </section>
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <h3 className="font-semibold mb-4">Funnel de conversión</h3>
          <Funnel />
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
                  <div className="h-full bg-brand" style={{ width: `${Math.min(100, (t.usage_count / 50) * 100)}%` }} />
                </div>
                <div className="font-mono text-xs text-fg-3 w-10 text-right">{t.usage_count}×</div>
              </div>
            ))}
            {!topTopics.length && <div className="text-sm text-fg-3">Sin datos todavía.</div>}
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
  const angle = (value / 100) * 180;
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
  icon,
  label,
  value,
  delta,
  positive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
      <div className="flex items-center gap-2 text-xs text-fg-3">
        {icon}
        {label}
      </div>
      <div className="font-mono font-bold text-4xl mt-1 mb-1">{value}</div>
      <div className={`text-xs font-medium ${positive ? "text-[color:var(--accent-green)]" : "text-[color:var(--accent-red)]"}`}>
        {delta} vs período anterior
      </div>
    </div>
  );
}

function HistoricalBars() {
  const days = Array.from({ length: 7 }).map((_, i) => ({
    day: ["lun", "mar", "mie", "jue", "vie", "sab", "dom"][i],
    green: 40 + Math.floor(Math.random() * 30),
    amber: 10 + Math.floor(Math.random() * 15),
    red: Math.floor(Math.random() * 8),
  }));
  const max = 80;
  return (
    <div className="flex items-end gap-3 h-40">
      {days.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-stretch gap-1">
          <div className="flex-1 flex flex-col justify-end gap-0.5">
            <div className="bg-[color:var(--accent-red)] rounded-t-sm" style={{ height: `${(d.red / max) * 100}%` }} />
            <div className="bg-[color:var(--accent-amber)]" style={{ height: `${(d.amber / max) * 100}%` }} />
            <div className="bg-[color:var(--accent-green)] rounded-b-sm" style={{ height: `${(d.green / max) * 100}%` }} />
          </div>
          <div className="text-[10px] text-fg-4 text-center uppercase">{d.day}</div>
        </div>
      ))}
    </div>
  );
}

function Funnel() {
  const steps = [
    { label: "Lead nuevo", value: 540, color: "#3B82F6" },
    { label: "Calificado", value: 312, color: "#8B5CF6" },
    { label: "Propuesta enviada", value: 184, color: "#F59E0B" },
    { label: "Convertido", value: 87, color: "#10B981" },
  ];
  const max = Math.max(...steps.map((s) => s.value));
  return (
    <div className="flex flex-col gap-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="text-xs text-fg-3 w-36 shrink-0">{s.label}</div>
          <div className="flex-1 h-8 rounded-lg bg-bg-3 overflow-hidden relative">
            <div className="h-full" style={{ width: `${(s.value / max) * 100}%`, background: s.color }} />
            <div className="absolute inset-0 flex items-center px-3 text-sm font-mono font-semibold">{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
