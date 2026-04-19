"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Clock,
  Focus,
  Pencil,
  Send,
  Sparkles,
  ThumbsDown,
  Undo2,
  X,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Instagram,
  Facebook,
  MessageCircle as WhatsApp,
  Globe,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { SwipeCard, type Card } from "@/components/swipe/swipe-card";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { cn, formatRelative } from "@/lib/utils";
import { resolveSuggestion, undoResolution, flagAutosend } from "@/app/actions/suggestions";
import { useFocus } from "@/components/shell/focus-context";
import { createClient } from "@/lib/supabase/client";
import { Switch } from "@/components/ui/switch";
import { TexMascot, TexSpeechBubble, TEX_COPY } from "@/components/tex";

type Autosent = {
  id: string;
  proposedText: string;
  createdAt: string;
  conversationId: string;
  contactName: string;
};

type Stats = { answeredToday: number; learnedToday: number; pending: number };

export function SwipeInbox({
  orgId,
  initialPending,
  initialAutosent,
  stats,
}: {
  orgId: string;
  initialPending: Card[];
  initialAutosent: Autosent[];
  stats: Stats;
}) {
  const [cards, setCards] = useState<Card[]>(initialPending);
  const [autosent, setAutosent] = useState<Autosent[]>(initialAutosent);
  const [tab, setTab] = useState<"pending" | "autosent">("pending");
  const [lastResolution, setLastResolution] = useState<{ id: string; at: number; label: string } | null>(null);
  const { focus, setFocus } = useFocus();
  const [isPending, start] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");

  // Realtime: new pending suggestions push into the deck
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`swipe-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "textos_suggestions",
          filter: `org_id=eq.${orgId}`,
        },
        async (payload) => {
          const row = payload.new as { id: string; status: string; conversation_id: string };
          if (row.status !== "pending") return;
          // Refetch that one suggestion hydrated
          const { data } = await sb
            .from("textos_suggestions")
            .select(
              "id,proposed_text,confidence,semaphore,reason,status,created_at,conversation_id,org_id,textos_conversations!inner(channel,textos_contacts!inner(name,avatar_url))"
            )
            .eq("id", row.id)
            .single();
          if (!data || (data as { status: string }).status !== "pending") return;
          const { data: lastIn } = await sb
            .from("textos_messages")
            .select("body")
            .eq("conversation_id", data.conversation_id)
            .eq("direction", "in")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          const c: Card = {
            id: data.id,
            proposedText: data.proposed_text || "",
            confidence: data.confidence,
            semaphore: data.semaphore as "green" | "amber" | "red",
            reason: data.reason,
            createdAt: data.created_at,
            conversationId: data.conversation_id,
            channel: (data as unknown as { textos_conversations: { channel: string } }).textos_conversations.channel,
            contactName: (data as unknown as { textos_conversations: { textos_contacts: { name: string } } }).textos_conversations.textos_contacts.name,
            contactAvatar: (data as unknown as { textos_conversations: { textos_contacts: { avatar_url?: string | null } } }).textos_conversations.textos_contacts.avatar_url || null,
            inboundMessage: lastIn?.body || "",
          };
          setCards((p) => [...p, c]);
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [orgId]);

  // Keyboard shortcuts
  const handle = useCallback(
    (action: "send" | "dismiss" | "escalate" | "snooze" | "edit") => {
      const top = cards[0];
      if (!top) return;
      if (action === "edit") {
        setEditing(true);
        setEditText(top.proposedText);
        return;
      }
      doAction(top, action);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT" || target?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        onUndo();
        return;
      }
      if (e.key === "Escape" && focus) {
        setFocus(false);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handle("send");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handle("dismiss");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        handle("escalate");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handle("snooze");
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        handle("edit");
      } else if (e.key.toLowerCase() === "f") {
        setFocus(!focus);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handle, focus]);

  function doAction(card: Card, action: "send" | "dismiss" | "escalate" | "snooze", editedText?: string, learn?: boolean) {
    // Optimistically remove the card
    setCards((p) => p.filter((c) => c.id !== card.id));
    setLastResolution({
      id: card.id,
      at: Date.now(),
      label:
        action === "send"
          ? "Enviado"
          : action === "dismiss"
            ? "Descartado"
            : action === "escalate"
              ? "Escalado a humano"
              : "Pospuesto",
    });
    start(async () => {
      try {
        await resolveSuggestion({
          suggestionId: card.id,
          action: action === "send" && card.semaphore === "red" ? "learn" : action,
          editedText,
          learnAsCard: learn,
        });
      } catch (e) {
        toast.error("No se pudo completar la acción");
      }
    });
  }

  function onUndo() {
    if (!lastResolution || Date.now() - lastResolution.at > 8000) return;
    const id = lastResolution.id;
    setLastResolution(null);
    start(async () => {
      await undoResolution(id);
      toast("Acción deshecha");
      // Refetch via router? Simpler: reload cards — but realtime will pick up. Optimistically, refetch the card if we had it.
    });
  }

  const top = cards[0];

  return (
    <div className={cn("relative min-h-[100dvh] md:min-h-[calc(100dvh-56px)] flex flex-col")}>
      {/* Header inside view */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Bandeja Swipe</h1>
            <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[rgba(139,92,246,0.1)] text-brand-2 border border-[rgba(139,92,246,0.2)]">
              <Sparkles className="h-3 w-3" /> Modo pareja IA
            </div>
          </div>
          <div className="text-fg-3 text-xs sm:text-sm mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              <b className="text-fg">{stats.answeredToday}</b> respondidas hoy
            </span>
            <span className="text-fg-4 hidden sm:inline">·</span>
            <span>
              <b className="text-fg">{stats.learnedToday}</b> aprendidas
            </span>
            <span className="text-fg-4 hidden sm:inline">·</span>
            <span>
              <b className="text-fg">{cards.length}</b> pendientes
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-bg-1 p-1 flex-1 sm:flex-none">
            <TabButton active={tab === "pending"} onClick={() => setTab("pending")}>
              <span className="sm:hidden">Para decidir</span>
              <span className="hidden sm:inline">Para decidir</span>
              <span className="ml-1.5 text-[10px] font-mono text-fg-4">{cards.length}</span>
            </TabButton>
            <TabButton active={tab === "autosent"} onClick={() => setTab("autosent")}>
              <span className="sm:hidden">Autosends</span>
              <span className="hidden sm:inline">Ver autosends recientes</span>
              <span className="ml-1.5 text-[10px] font-mono text-fg-4">{autosent.length}</span>
            </TabButton>
          </div>
          <Button
            variant={focus ? "primary" : "secondary"}
            size="md"
            onClick={() => setFocus(!focus)}
            className="gap-2"
            aria-label={focus ? "Salir de foco" : "Modo foco"}
          >
            <Focus className="h-4 w-4" />
            <span className="hidden sm:inline">{focus ? "Salir de foco" : "Modo foco"}</span>
            <Kbd className="hidden sm:inline-flex">F</Kbd>
          </Button>
        </div>
      </div>

      {tab === "autosent" ? (
        <AutosendsFeed items={autosent} orgId={orgId} onFlag={(id) => setAutosent((p) => p.filter((x) => x.id !== id))} />
      ) : (
        <>
          {cards.length === 0 ? (
            <EmptyDeck stats={stats} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center pb-20 sm:pb-24 relative overflow-hidden px-3">
              <div className="relative w-full max-w-[520px] h-[68dvh] max-h-[640px] min-h-[420px] flex items-center justify-center">
                <AnimatePresence>
                  {cards.slice(0, 3).map((c, i) => (
                    <SwipeCard
                      key={c.id}
                      card={c}
                      index={i}
                      isTop={i === 0}
                      editing={i === 0 && editing}
                      editText={editText}
                      onEditTextChange={setEditText}
                      onSaveEdit={() => {
                        setEditing(false);
                        setCards((p) =>
                          p.map((x) => (x.id === c.id ? { ...x, proposedText: editText } : x))
                        );
                      }}
                      onCancelEdit={() => setEditing(false)}
                      onStartEdit={() => {
                        setEditing(true);
                        setEditText(c.proposedText);
                      }}
                      onResolve={(action, editedText, learn) => doAction(c, action, editedText, learn)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <GestureGuide />
            </div>
          )}
        </>
      )}

      {/* Undo toast */}
      <AnimatePresence>
        {lastResolution && (
          <motion.div
            key={lastResolution.id}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed left-1/2 -translate-x-1/2 z-40 bottom-[calc(56px+1rem+env(safe-area-inset-bottom))] md:bottom-6 max-w-[calc(100vw-1.5rem)]"
            onAnimationComplete={() => {
              setTimeout(() => {
                setLastResolution((v) => (v && v.at === lastResolution.at ? null : v));
              }, 4000);
            }}
          >
            <div className="flex items-center gap-3 rounded-full border border-[color:var(--border)] bg-bg-2 backdrop-blur px-4 py-2 shadow-[var(--shadow-hover)]">
              <CheckCircle2 className="h-4 w-4 text-[color:var(--accent-green)]" />
              <span className="text-sm">{lastResolution.label}</span>
              <button
                onClick={onUndo}
                className="flex items-center gap-1.5 text-sm text-brand-2 hover:text-brand-3 font-medium"
              >
                <Undo2 className="h-3.5 w-3.5" /> Deshacer <Kbd>⌘Z</Kbd>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm transition-colors",
        active ? "bg-bg-3 text-fg font-medium" : "text-fg-3 hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

function GestureGuide() {
  // Hidden on mobile — swipe gestures are self-evident with the direction hints on the card itself.
  return (
    <div className="hidden sm:grid absolute bottom-6 left-1/2 -translate-x-1/2 grid-cols-4 gap-3 text-fg-4 max-w-[520px] w-full px-6">
      <GestureHint icon={<ArrowLeft className="h-4 w-4" />} label="Descartar" kb="←" />
      <GestureHint icon={<ArrowRight className="h-4 w-4" />} label="Enviar" kb="→" primary />
      <GestureHint icon={<ArrowUp className="h-4 w-4" />} label="Escalar" kb="↑" />
      <GestureHint icon={<ArrowDown className="h-4 w-4" />} label="Posponer" kb="↓" />
    </div>
  );
}

function GestureHint({
  icon,
  label,
  kb,
  primary,
}: {
  icon: React.ReactNode;
  label: string;
  kb: string;
  primary?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-xl p-2.5 border border-[color:var(--border)] bg-bg-1/60 transition-colors text-xs",
        primary && "border-brand-2/40 bg-[rgba(139,92,246,0.05)]"
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className={cn("text-fg-2", primary && "text-brand-2")}>{label}</span>
      </div>
      <Kbd>{kb}</Kbd>
    </div>
  );
}

function EmptyDeck({ stats }: { stats: Stats }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.1 }}
        className="mb-5"
      >
        <TexSpeechBubble tail="bottom-left" tone="celebrate" maxWidth={340}>
          <span className="text-[14px] font-medium">{TEX_COPY.empty.swipeZero}</span>
        </TexSpeechBubble>
      </motion.div>
      <TexMascot variant="goals" size="xl" popIn idle priority />
      <h2 className="text-3xl font-bold tracking-tight mt-6 mb-2">Todo bajo control.</h2>
      <p className="text-fg-3 text-lg max-w-md">
        La IA está respondiendo sola 🟢 y no hay nada que decidas por ahora.
      </p>
      <div className="mt-6 text-sm text-fg-3 inline-flex items-center gap-5 rounded-2xl border border-[color:var(--border)] bg-bg-1 px-5 py-3">
        <div>
          <b className="text-fg">{stats.answeredToday}</b> respondidas
        </div>
        <div className="h-4 w-px bg-[color:var(--border)]" />
        <div>
          <b className="text-fg">{stats.learnedToday}</b> aprendidas
        </div>
        <div className="h-4 w-px bg-[color:var(--border)]" />
        <div>
          <b className="text-fg">0</b> pendientes
        </div>
      </div>
    </div>
  );
}

function AutosendsFeed({
  items,
  orgId,
  onFlag,
}: {
  items: Autosent[];
  orgId: string;
  onFlag: (id: string) => void;
}) {
  const [isPending, start] = useTransition();
  if (!items.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <TexMascot variant="default" size="lg" popIn idle />
        <h2 className="text-xl font-semibold mt-5">Sin autosends hoy</h2>
        <p className="text-fg-3 text-sm mt-1 max-w-md">Cuando la IA responda sola, vas a poder revisarlo acá.</p>
      </div>
    );
  }
  return (
    <div className="flex-1 px-4 sm:px-6 py-4">
      <div className="text-xs text-fg-3 uppercase tracking-wider font-medium mb-3 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full dot-green shrink-0" />
        <span className="leading-snug normal-case">Lo que tu IA mandó sola. Si viste algo mal, dejá feedback para bajar su confianza.</span>
      </div>
      <div className="max-w-2xl mx-auto flex flex-col gap-2">
        {items.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-[color:var(--border)] bg-bg-1 p-4 flex items-start gap-3"
          >
            <div className="h-8 w-8 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.3)] flex items-center justify-center shrink-0">
              <Send className="h-3.5 w-3.5 text-[color:var(--accent-green)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-fg-3 mb-0.5">
                Para <span className="text-fg font-medium">{a.contactName}</span>
                <span className="text-fg-4 ml-2">{formatRelative(a.createdAt)}</span>
              </div>
              <div className="text-sm text-fg">{a.proposedText}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-fg-3 hover:text-[color:var(--accent-red)]"
              disabled={isPending}
              onClick={() => {
                start(async () => {
                  await flagAutosend(a.id);
                  onFlag(a.id);
                  toast("Gracias — bajamos la confianza para casos parecidos.");
                });
              }}
            >
              <ThumbsDown className="h-3.5 w-3.5" /> Esto estuvo mal
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
