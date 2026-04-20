"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFlowStore } from "../state/use-flow-store";
import { startSimRun, sendSimMessage, endSimRun } from "@/app/actions/flows";

type Msg = {
  from: "bot" | "me" | "system";
  text: string;
  at: string;
  nodeId?: string | null;
};

export function FlowSimulator({ onClose, noHeader }: { onClose: () => void; noHeader?: boolean }) {
  const flowId = useFlowStore((s) => s.flowId);
  const flowName = useFlowStore((s) => s.flowName);
  const dirty = useFlowStore((s) => s.dirty);

  const [runId, setRunId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [isPending, startTransition] = useTransition();
  const [isInitializing, setInitializing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Arrancar una nueva run al montarse.
    void initRun();
    return () => {
      // Cerrar la run al desmontar (best-effort).
      if (runId) void endSimRun(runId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);

  async function initRun() {
    setInitializing(true);
    setMsgs([
      {
        from: "system",
        text: dirty
          ? "Estás probando con cambios sin guardar (todavía no publicados)."
          : "Simulador conectado al borrador actual. Escribí como cliente.",
        at: new Date().toISOString(),
      },
    ]);
    const res = await startSimRun(flowId);
    if (res.ok) {
      setRunId(res.runId);
      // Trigger the engine with empty message to get the first bot reply (greeting).
      setTimeout(() => {
        void sendInitial(res.runId);
      }, 100);
    } else {
      toast.error(res.error);
    }
    setInitializing(false);
  }

  async function sendInitial(rid: string) {
    const res = await sendSimMessage({ runId: rid, body: "" });
    if (res.ok) {
      if (res.reply) {
        setMsgs((m) => [
          ...m,
          {
            from: "bot",
            text: res.reply!,
            at: new Date().toISOString(),
            nodeId: res.currentNodeId,
          },
        ]);
      }
      setCurrentNodeId(res.currentNodeId);
      setVariables(res.variables);
    }
  }

  function onSend() {
    const text = input.trim();
    if (!text || !runId) return;
    const newMsg: Msg = { from: "me", text, at: new Date().toISOString() };
    setMsgs((m) => [...m, newMsg]);
    setInput("");

    startTransition(async () => {
      const res = await sendSimMessage({ runId, body: text });
      if (res.ok) {
        if (res.reply) {
          setMsgs((m) => [
            ...m,
            {
              from: "bot",
              text: res.reply!,
              at: new Date().toISOString(),
              nodeId: res.currentNodeId,
            },
          ]);
        } else if (res.note) {
          setMsgs((m) => [
            ...m,
            { from: "system", text: res.note!, at: new Date().toISOString() },
          ]);
        }
        setCurrentNodeId(res.currentNodeId);
        setVariables(res.variables);
      } else {
        toast.error(res.error);
      }
    });
  }

  async function onReset() {
    if (runId) await endSimRun(runId);
    setRunId(null);
    setMsgs([]);
    setCurrentNodeId(null);
    setVariables({});
    await initRun();
  }

  const varCount = Object.keys(variables).length;

  return (
    <div className="flex flex-col h-full w-full bg-bg-1">
      {!noHeader && (
        <header className="px-4 py-3 border-b border-[color:var(--border)] flex items-center gap-2 flex-shrink-0">
          <div className="h-2 w-2 rounded-full bg-[color:var(--accent-green)] animate-pulse shadow-[0_0_12px_var(--accent-green)]" />
          <div className="text-sm font-medium flex-1 truncate">Simulador · {flowName}</div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onReset}
            disabled={isPending || isInitializing}
            title="Reiniciar conversación"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Cerrar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </header>
      )}

      {(currentNodeId || varCount > 0) && (
        <div className="px-4 py-2 border-b border-[color:var(--border)] flex items-center gap-2 flex-wrap bg-bg-2/40">
          {currentNodeId && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-fg-3 bg-bg-2 border border-[color:var(--border)] rounded-full px-2 py-0.5">
              <span className="font-mono text-fg-4 uppercase tracking-wider">Nodo</span>
              <span className="font-mono">{currentNodeId.slice(0, 8)}</span>
            </span>
          )}
          {Object.entries(variables).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-[color:var(--accent-blue)] bg-blue/10 border border-[rgba(59,130,246,0.25)] rounded-full px-2 py-0.5"
            >
              {k}={truncate(String(v))}
            </span>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5 min-h-0">
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: m.from === "bot" ? 0.12 : 0 }}
              className={cn(
                "flex",
                m.from === "me" ? "justify-end" : m.from === "system" ? "justify-center" : "justify-start",
              )}
            >
              {m.from === "system" ? (
                <div className="text-[11px] text-fg-4 italic text-center max-w-[90%] py-1">
                  {m.text}
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.from === "me"
                      ? "bg-brand text-white rounded-tr-md shadow-[0_2px_8px_rgba(139,92,246,0.35)]"
                      : "bg-bg-2 border border-[color:var(--border)] rounded-tl-md text-fg",
                  )}
                >
                  <div className="whitespace-pre-wrap leading-snug">{m.text}</div>
                </div>
              )}
            </motion.div>
          ))}
          {isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-bg-2 border border-[color:var(--border)] rounded-2xl rounded-tl-md px-3 py-2.5 text-sm">
                <span className="thinking-dots inline-flex gap-0.5">
                  <span>•</span>
                  <span>•</span>
                  <span>•</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 border-t border-[color:var(--border)] flex gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex-shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          disabled={isPending || isInitializing || !runId}
          placeholder="Escribí como cliente…"
          className="flex-1 h-10 rounded-xl bg-bg-2 border border-[color:var(--border)] px-3 text-[16px] lg:text-sm text-fg focus:outline-none focus:border-brand-2 focus:ring-2 focus:ring-brand-2/30"
        />
        <Button size="icon" onClick={onSend} disabled={!input.trim() || isPending || !runId} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function truncate(s: string, n = 20) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
