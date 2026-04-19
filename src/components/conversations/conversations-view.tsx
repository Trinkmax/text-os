"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Paperclip,
  Sparkles,
  Workflow,
  Search,
  ChevronLeft,
  UserRound,
} from "lucide-react";
import { InstagramIcon, MessengerIcon, WhatsAppIcon, GlobeIcon, MailIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn, formatRelative, formatTime, initials, avatarGradient, money } from "@/lib/utils";
import { sendMessage, setConversationAiMode } from "@/app/actions/contacts";
import { createClient } from "@/lib/supabase/client";

type Contact = {
  id: string;
  name: string;
  avatar_url: string | null;
  stage: string;
  tags: string[];
  phone: string | null;
  email: string | null;
  value: number;
  last_interaction_at: string | null;
  source: string | null;
};

type Conversation = {
  id: string;
  channel: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  semaphore: "green" | "amber" | "red";
  aiMode: "auto" | "suggest" | "off";
  contact: Contact;
};

type Message = { id: string; body: string; direction: "in" | "out"; author: string; created_at: string };

export function ConversationsView({
  orgId,
  initialConversations,
  initialMessages,
  initialSelectedId,
}: {
  orgId: string;
  initialConversations: Conversation[];
  initialMessages: Message[];
  initialSelectedId: string | null;
  initialSelected?: { id: string } | null;
}) {
  const [convs] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [filter, setFilter] = useState<"all" | "unread" | "mine" | "red">("all");
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [isPending, start] = useTransition();
  const [rightTab, setRightTab] = useState("perfil");
  const scrollRef = useRef<HTMLDivElement>(null);

  const selected = convs.find((c) => c.id === selectedId) || null;

  const filtered = convs.filter((c) => {
    if (filter === "unread" && c.unread === 0) return false;
    if (filter === "red" && c.semaphore !== "red") return false;
    if (search && !c.contact.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Load messages when selecting conversation
  useEffect(() => {
    if (!selectedId) return;
    const sb = createClient();
    (async () => {
      const { data } = await sb
        .from("textos_messages")
        .select("id,body,direction,author,created_at")
        .eq("conversation_id", selectedId)
        .order("created_at", { ascending: true });
      setMessages((data as never) || []);
    })();
  }, [selectedId]);

  // Realtime for messages in selected conv
  useEffect(() => {
    if (!selectedId) return;
    const sb = createClient();
    const ch = sb
      .channel(`conv-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "textos_messages", filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          setMessages((p) => [...p, payload.new as Message]);
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [selectedId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, selectedId]);

  async function suggestWithAI() {
    if (!selected) return;
    // Pull suggestion if exists
    const sb = createClient();
    const { data } = await sb
      .from("textos_suggestions")
      .select("proposed_text")
      .eq("conversation_id", selected.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.proposed_text) setInput(data.proposed_text);
  }

  function onSend() {
    if (!selected || !input.trim()) return;
    const body = input.trim();
    setInput("");
    setMessages((p) => [
      ...p,
      { id: Math.random().toString(), body, direction: "out", author: "human", created_at: new Date().toISOString() },
    ]);
    start(async () => {
      await sendMessage({ conversationId: selected.id, body });
    });
  }

  // Mobile flow: only one of list / thread is visible at a time. Tapping a
  // conversation hides the list; the back arrow re-shows it.
  // On md (tablet): two panes — list + thread — profile in a Sheet on demand.
  // On lg+: three panes, identical to before.
  const showThread = !!selectedId;
  const showProfileSheetButton = !!selected; // appears on <lg breakpoints

  return (
    <div className="flex flex-col md:grid md:grid-cols-[320px_1fr] lg:grid-cols-[320px_1fr_340px] h-[100dvh] md:h-[calc(100dvh-56px)] min-h-0">
      {/* Left: list — hidden on mobile when a thread is selected */}
      <aside
        className={cn(
          "border-r border-[color:var(--border)] flex flex-col min-h-0 bg-bg-1",
          showThread && "hidden md:flex"
        )}
      >
        <div className="px-3 pt-3 pb-2 flex flex-col gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversaciones"
              className="h-9 pl-9 bg-bg-2"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as never)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">Todas</TabsTrigger>
              <TabsTrigger value="unread" className="flex-1">Sin leer</TabsTrigger>
              <TabsTrigger value="mine" className="flex-1">Asignadas</TabsTrigger>
              <TabsTrigger value="red" className="flex-1">🔴</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={cn(
                "w-full text-left px-3 py-3 border-b border-[color:var(--border)] flex items-start gap-3 transition-colors",
                selectedId === c.id ? "bg-bg-2" : "hover:bg-bg-2/60"
              )}
            >
              <div
                className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-semibold relative"
                style={{ backgroundImage: avatarGradient(c.contact.name) }}
              >
                {initials(c.contact.name)}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-1",
                    `dot-${c.semaphore}`
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm truncate flex-1">{c.contact.name}</div>
                  <div className="text-[10px] text-fg-4">{formatRelative(c.lastMessageAt)}</div>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <ChannelIcon channel={c.channel} />
                  <div className={cn("text-xs truncate flex-1", c.unread > 0 ? "text-fg font-medium" : "text-fg-3")}>
                    {c.lastMessage || "Sin mensajes"}
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-brand text-white text-[10px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 font-semibold">
                      {c.unread}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-fg-3 px-1.5 py-0.5 rounded bg-bg-3">{c.contact.stage}</span>
                </div>
              </div>
            </button>
          ))}
          {!filtered.length && (
            <div className="py-16 text-center text-sm text-fg-3">Sin conversaciones.</div>
          )}
        </div>
      </aside>

      {/* Center: thread — hidden on mobile when no selection */}
      <section className={cn("flex flex-col min-w-0 min-h-0 bg-bg-0", !showThread && "hidden md:flex")}>
        {selected ? (
          <>
            <header className="h-14 shrink-0 px-3 md:px-5 flex items-center gap-2 md:gap-3 border-b border-[color:var(--border)]">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Volver a la lista"
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl text-fg-2 hover:bg-bg-2 hover:text-fg -ml-2"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ backgroundImage: avatarGradient(selected.contact.name) }}
              >
                {initials(selected.contact.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium flex items-center gap-2 truncate">
                  <span className="truncate">{selected.contact.name}</span>
                  <span className={`h-2 w-2 rounded-full shrink-0 dot-${selected.semaphore}`} />
                </div>
                <div className="text-[11px] text-fg-3 flex items-center gap-1.5 truncate">
                  <ChannelIcon channel={selected.channel} />
                  <span className="truncate">{selected.channel}</span>
                  {(selected.contact.phone || selected.contact.email) && (
                    <>
                      <span className="text-fg-4">·</span>
                      <span className="truncate">{selected.contact.phone || selected.contact.email}</span>
                    </>
                  )}
                </div>
              </div>
              <Select
                value={selected.aiMode}
                onValueChange={async (v) => {
                  start(async () => {
                    await setConversationAiMode(selected.id, v as never);
                  });
                }}
              >
                <SelectTrigger className="hidden sm:flex w-36 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectTrigger className="sm:hidden h-10 w-10 px-0 justify-center" aria-label="Modo IA">
                  <Sparkles className="h-4 w-4" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">IA: Auto</SelectItem>
                  <SelectItem value="suggest">IA: Sugerir</SelectItem>
                  <SelectItem value="off">IA: Off</SelectItem>
                </SelectContent>
              </Select>
              {showProfileSheetButton && (
                <Sheet>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      aria-label="Ver perfil del contacto"
                      className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl text-fg-2 hover:bg-bg-2 hover:text-fg"
                    >
                      <UserRound className="h-5 w-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent side="right" className="p-0 w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle className="sr-only">Perfil del contacto</SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-y-auto">
                      <ConversationProfilePanel
                        selected={selected}
                        rightTab={rightTab}
                        setRightTab={setRightTab}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </header>
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-4 md:py-6 flex flex-col gap-3 no-scrollbar"
            >
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const sameDate = prev && sameDay(prev.created_at, m.created_at);
                return (
                  <div key={m.id}>
                    {!sameDate && (
                      <div className="my-3 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-bg-1 text-[11px] text-fg-3 border border-[color:var(--border)]">
                          {new Date(m.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}
                        </span>
                      </div>
                    )}
                    {m.author === "system" ? (
                      <div className="flex items-center gap-2 text-[11px] text-fg-3 px-3 py-1 rounded-full bg-bg-2 border border-[color:var(--border)] w-fit mx-auto">
                        <Workflow className="h-3 w-3 text-brand-2" /> {m.body}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "flex",
                          m.direction === "out" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed break-words",
                            m.direction === "out"
                              ? "bg-brand text-white rounded-tr-md shadow-[0_4px_14px_rgba(139,92,246,0.25)]"
                              : "bg-bg-2 border border-[color:var(--border)] text-fg rounded-tl-md"
                          )}
                        >
                          {m.body}
                          <div className={cn("text-[10px] mt-1 tabular-nums", m.direction === "out" ? "text-white/70" : "text-fg-4")}>
                            {formatTime(m.created_at)}
                            {m.author === "ai" && m.direction === "out" && " · IA"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {!messages.length && <div className="py-16 text-center text-sm text-fg-3">Sin mensajes.</div>}
            </div>
            <footer className="shrink-0 border-t border-[color:var(--border)] bg-bg-1 px-3 md:px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
              <div className="flex items-end gap-2">
                <Button size="icon" variant="ghost" className="shrink-0" aria-label="Adjuntar archivo">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onSend();
                      }
                    }}
                    placeholder="Escribí un mensaje…"
                    className="min-h-[44px] p-3 bg-bg-2 resize-none"
                    rows={1}
                  />
                </div>
                <Button
                  variant="secondary"
                  onClick={suggestWithAI}
                  className="gap-1.5 shrink-0 px-3 sm:px-4"
                  size="md"
                  aria-label="Sugerir respuesta con IA"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sugerir IA</span>
                </Button>
                <Button
                  onClick={onSend}
                  disabled={!input.trim() || isPending}
                  size="icon"
                  className="shrink-0"
                  aria-label="Enviar mensaje"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-fg-3 text-sm">
            Seleccioná una conversación
          </div>
        )}
      </section>

      {/* Right: contact panel — inline only on lg+ */}
      <aside className="hidden lg:flex border-l border-[color:var(--border)] flex-col min-h-0 bg-bg-1">
        {selected && (
          <ConversationProfilePanel
            selected={selected}
            rightTab={rightTab}
            setRightTab={setRightTab}
          />
        )}
      </aside>
    </div>
  );
}

function ConversationProfilePanel({
  selected,
  rightTab,
  setRightTab,
}: {
  selected: Conversation;
  rightTab: string;
  setRightTab: (v: string) => void;
}) {
  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="px-5 pt-5 pb-3">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold mx-auto"
          style={{ backgroundImage: avatarGradient(selected.contact.name) }}
        >
          {initials(selected.contact.name)}
        </div>
        <div className="text-center mt-3">
          <div className="font-semibold">{selected.contact.name}</div>
          <div className="text-xs text-fg-3">{selected.contact.source || "Ingresó por " + selected.channel}</div>
        </div>
      </div>
      <Tabs value={rightTab} onValueChange={setRightTab} className="flex-1 flex flex-col min-h-0">
        <div className="px-4">
          <TabsList className="w-full">
            <TabsTrigger value="perfil" className="flex-1">Perfil</TabsTrigger>
            <TabsTrigger value="notas" className="flex-1">Notas</TabsTrigger>
            <TabsTrigger value="flujo" className="flex-1">Flujo</TabsTrigger>
          </TabsList>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">
          <TabsContent value="perfil" className="mt-0">
            <ProfileField label="Etapa" value={<Badge variant="brand">{selected.contact.stage}</Badge>} />
            <ProfileField
              label="Tags"
              value={
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {selected.contact.tags.length === 0 && <span className="text-fg-3 text-xs">Sin tags</span>}
                  {selected.contact.tags.map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              }
            />
            <ProfileField label="Teléfono" value={selected.contact.phone || "—"} />
            <ProfileField label="Email" value={selected.contact.email || "—"} />
            <ProfileField label="Valor estimado" value={money(selected.contact.value)} />
            <ProfileField
              label="Última interacción"
              value={selected.contact.last_interaction_at ? formatRelative(selected.contact.last_interaction_at) : "—"}
            />
          </TabsContent>
          <TabsContent value="notas" className="mt-0 flex flex-col gap-2">
            <Textarea placeholder="Escribí una nota interna para el equipo…" rows={6} className="bg-bg-2" />
            <Button variant="secondary" className="self-end" size="sm">
              Guardar nota
            </Button>
          </TabsContent>
          <TabsContent value="flujo" className="mt-0">
            <div className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-4 text-sm text-fg-3">
              <div className="flex items-center gap-2 mb-2 text-fg">
                <Workflow className="h-4 w-4 text-brand-2" />
                <b>Flujo: Atención general</b>
              </div>
              <div className="flex flex-col gap-2">
                <FlowStep label="Saludo" done />
                <FlowStep label="Calificación" done />
                <FlowStep label="FAQ" active />
                <FlowStep label="Agendar" />
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-[color:var(--border)] last:border-0 flex items-center justify-between gap-3">
      <div className="text-xs text-fg-3">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function FlowStep({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "h-5 w-5 rounded-full flex items-center justify-center text-[10px]",
          done ? "bg-brand text-white" : active ? "bg-amber text-white" : "bg-bg-3 text-fg-4"
        )}
      >
        {done ? "✓" : "·"}
      </div>
      <span className={cn("text-xs", active ? "text-fg" : done ? "text-fg-2" : "text-fg-4")}>{label}</span>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string | null }) {
  const style = { color: "var(--fg-3)" } as React.CSSProperties;
  switch (channel) {
    case "whatsapp":
      return <WhatsAppIcon size={14} style={style} />;
    case "instagram":
      return <InstagramIcon size={14} style={style} />;
    case "messenger":
      return <MessengerIcon size={14} style={style} />;
    case "email":
      return <MailIcon size={14} style={style} />;
    default:
      return <GlobeIcon size={14} style={style} />;
  }
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
