"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BrainCircuit, Plus, Search, Sparkles, TrendingUp, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/ui/chip";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn, formatRelative } from "@/lib/utils";
import { saveKnowledgeCard, convertScopeGap, deleteKnowledgeCard } from "@/app/actions/knowledge";
import { TexEmpty, TexSays, TEX_COPY } from "@/components/tex";

type Card = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  variants: string[];
  confidence: number;
  origin: "onboarding" | "learned" | "manual";
  usage_count: number;
  updated_at: string;
  needs_review: boolean;
};

type Gap = { id: string; topic: string; sample_question: string | null; count: number };

export function KnowledgeView({ cards, gaps }: { cards: Card[]; gaps: Gap[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"usage" | "confidence" | "recent">("usage");
  const [originFilter, setOriginFilter] = useState<"all" | "onboarding" | "learned" | "manual">("all");
  const [editing, setEditing] = useState<Card | null>(null);
  const [creating, setCreating] = useState(false);
  const [convertGap, setConvertGap] = useState<Gap | null>(null);

  const filtered = useMemo(() => {
    let arr = cards;
    if (originFilter !== "all") arr = arr.filter((c) => c.origin === originFilter);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((c) => c.question.toLowerCase().includes(q) || c.answer.toLowerCase().includes(q) || c.topic.toLowerCase().includes(q));
    }
    if (sort === "usage") arr = [...arr].sort((a, b) => b.usage_count - a.usage_count);
    if (sort === "confidence") arr = [...arr].sort((a, b) => b.confidence - a.confidence);
    if (sort === "recent") arr = [...arr].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return arr;
  }, [cards, search, sort, originFilter]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-7xl mx-auto w-full">
      <header className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Memoria de tu IA</h1>
            <Badge variant="brand">
              <BrainCircuit className="h-3 w-3" /> {cards.length} tarjetas
            </Badge>
          </div>
          <p className="text-fg-3 text-sm mt-0.5">Acá vive todo lo que tu IA sabe responder. Cada tarjeta es una respuesta reutilizable.</p>
        </div>
        <Button className="gap-2 w-full sm:w-auto" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Agregar tarjeta
        </Button>
      </header>

      {gaps.length > 0 && (
        <section className="mb-8 rounded-2xl border border-[color:var(--accent-red)]/20 bg-[rgba(239,68,68,0.04)] p-5">
          <div className="mb-3">
            <TexSays
              variant="analytics"
              size="sm"
              tone="warn"
              message={<span className="text-[13px]">Estas son las preguntas que me dejaron sin respuesta esta semana. Tocá una y la convertimos en tarjeta.</span>}
              maxBubbleWidth={460}
            />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-[color:var(--accent-red)]" />
            <h3 className="font-semibold">Scope gaps esta semana</h3>
            <span className="text-xs text-fg-3">Temas que aparecieron y la IA no supo contestar.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {gaps.map((g) => (
              <button
                key={g.id}
                onClick={() => setConvertGap(g)}
                className="group flex items-center gap-2 px-3 h-9 rounded-full border border-[color:var(--accent-red)]/30 bg-[rgba(239,68,68,0.06)] text-sm hover:bg-[rgba(239,68,68,0.12)] transition"
              >
                <Zap className="h-3.5 w-3.5 text-[color:var(--accent-red)]" />
                <span>{g.topic}</span>
                <span className="text-xs text-fg-3">×{g.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
          <Input
            placeholder="Buscar tema, pregunta o respuesta"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-11 sm:h-9"
            inputMode="search"
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-none gap-2">
          <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as never)}>
            <SelectTrigger className="sm:w-40 h-11 sm:h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="onboarding">Onboarding</SelectItem>
              <SelectItem value="learned">Aprendidas</SelectItem>
              <SelectItem value="manual">Manuales</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as never)}>
            <SelectTrigger className="sm:w-40 h-11 sm:h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="usage">Por uso</SelectItem>
              <SelectItem value="confidence">Por confianza</SelectItem>
              <SelectItem value="recent">Recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <AnimatePresence initial={false}>
          {filtered.map((c) => (
            <motion.article
              key={c.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={() => setEditing(c)}
              className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4 hover:border-[color:var(--border-strong)] cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-[10px] uppercase tracking-wider font-medium text-brand-2">{c.topic}</div>
                <OriginBadge origin={c.origin} />
              </div>
              <h3 className="font-semibold text-fg leading-snug mb-2 line-clamp-2">{c.question}</h3>
              <p className="text-sm text-fg-2 line-clamp-3 leading-relaxed mb-3">{c.answer}</p>
              <div className="flex items-center justify-between gap-2">
                <ConfidenceBar value={c.confidence} />
                <div className="text-[11px] text-fg-3 font-mono">{c.usage_count}×</div>
              </div>
            </motion.article>
          ))}
        </AnimatePresence>
      </div>

      {!filtered.length && (
        search ? (
          <div className="py-20 text-center text-fg-3">Sin coincidencias</div>
        ) : (
          <TexEmpty
            variant="default"
            size="xl"
            message={<span>Soy tu memoria. Cargá la primera tarjeta y empezamos a aprender juntos.</span>}
            action={
              <Button onClick={() => setCreating(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Crear primera tarjeta
              </Button>
            }
          />
        )
      )}

      {(editing || creating) && (
        <CardEditor
          card={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      {convertGap && <ConvertGapModal gap={convertGap} onClose={() => setConvertGap(null)} />}
    </div>
  );
}

function OriginBadge({ origin }: { origin: Card["origin"] }) {
  const map = {
    onboarding: { label: "Onboarding", color: "default" as const },
    learned: { label: "Aprendida", color: "brand" as const },
    manual: { label: "Manual", color: "default" as const },
  };
  const m = map[origin];
  return <Badge variant={m.color} className="text-[10px] uppercase tracking-wider">{m.label}</Badge>;
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#10B981" : pct >= 55 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="h-1.5 rounded-full bg-bg-3 flex-1 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono tabular-nums" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function CardEditor({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const [form, setForm] = useState({
    topic: card?.topic || "",
    question: card?.question || "",
    answer: card?.answer || "",
    variants: card?.variants || [],
    variantInput: "",
    confidence: card?.confidence ?? 0.7,
  });
  const [isPending, start] = useTransition();
  function addVariant() {
    if (!form.variantInput.trim()) return;
    setForm({ ...form, variants: [...form.variants, form.variantInput.trim()], variantInput: "" });
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-2" />
            {card ? "Editar tarjeta" : "Nueva tarjeta de conocimiento"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-fg-3 font-medium mb-1 block">Tema</label>
            <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Ej: Horarios" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-fg-3 font-medium mb-1 block">Pregunta</label>
            <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Ej: ¿A qué hora abren?" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-fg-3 font-medium mb-1 block">Respuesta canónica</label>
            <Textarea rows={5} value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Cómo responde la IA…" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-fg-3 font-medium mb-1 block">Variantes (distintas formas de preguntarlo)</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.variants.map((v, i) => (
                <Chip key={i} active onRemove={() => setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })}>
                  {v}
                </Chip>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={form.variantInput}
                placeholder="Agregar variante y Enter"
                onChange={(e) => setForm({ ...form, variantInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addVariant();
                  }
                }}
              />
              <Button variant="secondary" onClick={addVariant}>
                Agregar
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          {card && (
            <Button
              variant="danger"
              onClick={() =>
                start(async () => {
                  await deleteKnowledgeCard(card.id);
                  onClose();
                })
              }
            >
              Eliminar
            </Button>
          )}
          <Button
            disabled={!form.question.trim() || !form.answer.trim() || isPending}
            onClick={() =>
              start(async () => {
                await saveKnowledgeCard({
                  id: card?.id,
                  topic: form.topic || "General",
                  question: form.question,
                  answer: form.answer,
                  variants: form.variants,
                  confidence: form.confidence,
                });
                onClose();
              })
            }
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertGapModal({ gap, onClose }: { gap: Gap; onClose: () => void }) {
  const [answer, setAnswer] = useState("");
  const [isPending, start] = useTransition();
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[color:var(--accent-red)]" /> Enseñarle a la IA
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="text-sm text-fg-3">
            Tema detectado: <b className="text-fg">{gap.topic}</b>
          </div>
          {gap.sample_question && (
            <div className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-3 text-sm text-fg-2 italic">
              "{gap.sample_question}"
            </div>
          )}
          <Textarea
            autoFocus
            placeholder="Escribí la respuesta que la IA debería dar cuando esto aparezca de nuevo…"
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            disabled={!answer.trim() || isPending}
            onClick={() =>
              start(async () => {
                await convertScopeGap(gap.id, answer);
                onClose();
              })
            }
          >
            Crear tarjeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
