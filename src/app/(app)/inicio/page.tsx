import Link from "next/link";
import { getCurrentOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Layers,
  MessagesSquare,
  BrainCircuit,
  Megaphone,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { formatRelative } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const orgId = await getCurrentOrgId();
  if (!orgId) redirect("/onboarding");
  const sb = await createSbServer();

  const [orgRes, sugsRes, lastMsgs, cardsRes] = await Promise.all([
    sb.from("textos_orgs").select("name,owner_display_name,coverage_estimate").eq("id", orgId).single(),
    sb.from("textos_suggestions").select("status,semaphore,created_at").eq("org_id", orgId).gte("created_at", startOfDay()),
    sb.from("textos_messages").select("id,body,direction,created_at,conversation_id,textos_conversations!inner(textos_contacts!inner(name))").eq("org_id", orgId).order("created_at", { ascending: false }).limit(6),
    sb.from("textos_knowledge_cards").select("id,topic,question,confidence,usage_count,origin").eq("org_id", orgId).order("usage_count", { ascending: false }).limit(4),
  ]);

  const todaySuggestions = sugsRes.data || [];
  const greenToday = todaySuggestions.filter((s) => s.status === "auto_sent").length;
  const amberToday = todaySuggestions.filter((s) => s.status === "pending" && s.semaphore === "amber").length;
  const redToday = todaySuggestions.filter((s) => s.status === "pending" && s.semaphore === "red").length;
  const total = Math.max(greenToday + amberToday + redToday, 1);
  const greenPct = Math.round((greenToday / total) * 100);

  const name = orgRes.data?.owner_display_name?.split(" ")[0] || "Hola";

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <div className="text-fg-3 text-sm mb-1">Buenos días, {name}</div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tu IA manejó <span className="text-[color:var(--accent-green)]">{greenPct}%</span> sola hoy.
        </h1>
      </div>

      {/* Semáforo cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <SemCard
          color="green"
          title="Auto-enviadas"
          value={greenToday}
          hint="La IA resolvió estas sin que tengas que hacer nada."
          href="/swipe?tab=autosent"
        />
        <SemCard
          color="amber"
          title="Esperando tu OK"
          value={amberToday}
          hint="Sugerencias de alta calidad, listas para revisar."
          href="/swipe"
          primary
        />
        <SemCard
          color="red"
          title="Necesitan humano"
          value={redToday}
          hint="Fuera del alcance de la IA. Respondelas y va a aprender."
          href="/swipe"
        />
      </div>

      {/* Big shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-10">
        <ShortcutTile icon={<Layers className="h-6 w-6" />} href="/swipe" title="Ir a la Bandeja Swipe" subtitle="Decidí de un gesto" primary />
        <ShortcutTile icon={<MessagesSquare className="h-6 w-6" />} href="/conversaciones" title="Conversaciones" subtitle="Contexto profundo" />
        <ShortcutTile icon={<BrainCircuit className="h-6 w-6" />} href="/conocimiento" title="Memoria de la IA" subtitle="Tarjetas aprendidas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Actividad reciente</h3>
            <Link href="/conversaciones" className="text-xs text-fg-3 hover:text-fg flex items-center gap-1">
              Ver todo <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {(lastMsgs.data || []).map((m) => (
              <li key={m.id} className="flex items-start gap-3 rounded-xl px-2.5 py-2 hover:bg-bg-2 transition-colors">
                <div
                  className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ${
                    m.direction === "in" ? "bg-bg-3 text-fg-2" : "bg-brand"
                  }`}
                >
                  {m.direction === "in" ? "→" : "↑"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    <b>
                      {(m as unknown as { textos_conversations: { textos_contacts: { name: string } } }).textos_conversations.textos_contacts.name}
                    </b>
                    : <span className="text-fg-2">{m.body}</span>
                  </div>
                  <div className="text-[11px] text-fg-4">{formatRelative(m.created_at)}</div>
                </div>
              </li>
            ))}
            {!lastMsgs.data?.length && (
              <div className="py-8 text-center text-sm text-fg-3">Sin actividad todavía.</div>
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              Top temas <TrendingUp className="h-4 w-4 text-brand-2" />
            </h3>
            <Link href="/conocimiento" className="text-xs text-fg-3 hover:text-fg flex items-center gap-1">
              Abrir memoria <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {(cardsRes.data || []).map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-bg-2 border border-[color:var(--border)]">
                <div className="text-xs uppercase tracking-wider text-fg-4 font-medium w-16 shrink-0">{c.topic}</div>
                <div className="flex-1 text-sm truncate">{c.question}</div>
                <div className="text-xs font-mono tabular-nums text-fg-3">{c.usage_count ?? 0}× · {Math.round((c.confidence ?? 0) * 100)}%</div>
              </li>
            ))}
            {!cardsRes.data?.length && (
              <div className="py-8 text-center text-sm text-fg-3">Tu IA todavía no aprendió nada. Respondé tu primera consulta.</div>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SemCard({
  color,
  title,
  value,
  hint,
  href,
  primary,
}: {
  color: "green" | "amber" | "red";
  title: string;
  value: number;
  hint: string;
  href: string;
  primary?: boolean;
}) {
  const hex = color === "green" ? "#10B981" : color === "amber" ? "#F59E0B" : "#EF4444";
  return (
    <Link
      href={href}
      className={`group rounded-2xl border bg-bg-1 p-5 flex flex-col gap-2 transition-all hover:shadow-[var(--shadow-card)] ${
        primary ? "border-[color:var(--border-strong)]" : "border-[color:var(--border)]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full dot-${color}`} />
        <div className="text-sm text-fg-3">{title}</div>
      </div>
      <div className="font-mono tabular-nums text-5xl font-bold" style={{ color: hex }}>
        {value}
      </div>
      <div className="text-xs text-fg-3 leading-snug">{hint}</div>
      <div className="mt-2 text-xs text-fg-3 inline-flex items-center gap-1 group-hover:text-fg transition-colors">
        Abrir <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function ShortcutTile({
  icon,
  href,
  title,
  subtitle,
  primary,
}: {
  icon: React.ReactNode;
  href: string;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-2xl border p-5 flex items-center gap-4 transition-all ${
        primary
          ? "border-transparent bg-gradient-to-br from-brand to-[#EC4899] text-white shadow-[0_10px_40px_rgba(139,92,246,0.35)]"
          : "border-[color:var(--border)] bg-bg-1 hover:bg-bg-2"
      }`}
    >
      <div
        className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
          primary ? "bg-white/20 text-white" : "bg-bg-2 text-fg-2"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className={`font-semibold ${primary ? "text-white" : ""}`}>{title}</div>
        <div className={`text-xs ${primary ? "text-white/80" : "text-fg-3"}`}>{subtitle}</div>
      </div>
      <ArrowRight className={`h-4 w-4 ${primary ? "text-white/70" : "text-fg-3"} group-hover:translate-x-0.5 transition-transform`} />
    </Link>
  );
}

function startOfDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
