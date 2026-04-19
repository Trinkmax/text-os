"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  MessageCircle,
  CheckCircle2,
  UserCheck,
  Clipboard,
  CalendarClock,
  CreditCard,
  ArrowRightFromLine,
  Power,
  Play,
  Plus,
  ZoomIn,
  ZoomOut,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import { TexTip, TexEmpty, TEX_COPY } from "@/components/tex";

type NodeType = "saludo" | "calif" | "faq" | "datos" | "agendar" | "pagar" | "derivar" | "cerrar";

type FlowNode = {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  title: string;
  summary: string;
  semaphore: "green" | "amber" | "red";
};

const PALETTE: { type: NodeType; title: string; icon: typeof MessageCircle; semaphore: "green" | "amber" | "red" }[] = [
  { type: "saludo", title: "Saludo", icon: MessageCircle, semaphore: "green" },
  { type: "calif", title: "Calificación", icon: UserCheck, semaphore: "amber" },
  { type: "faq", title: "FAQ", icon: Sparkles, semaphore: "green" },
  { type: "datos", title: "Recolectar dato", icon: Clipboard, semaphore: "amber" },
  { type: "agendar", title: "Agendar", icon: CalendarClock, semaphore: "amber" },
  { type: "pagar", title: "Pagar", icon: CreditCard, semaphore: "red" },
  { type: "derivar", title: "Derivar", icon: ArrowRightFromLine, semaphore: "red" },
  { type: "cerrar", title: "Cerrar", icon: Power, semaphore: "green" },
];

interface FlowsViewProps {
  flowName?: string | null;
  initialNodes?: FlowNode[];
  initialEdges?: { from: string; to: string }[];
}

export function FlowsView({ flowName, initialNodes = [], initialEdges = [] }: FlowsViewProps = {}) {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges] = useState(initialEdges);
  const [selected, setSelected] = useState<FlowNode | null>(null);
  const [testOpen, setTestOpen] = useState(false);
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number; sx: number; sy: number } | null>(null);
  const [scale, setScale] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);

  function onMouseDown(e: React.MouseEvent, n: FlowNode) {
    setSelected(n);
    const rect = canvasRef.current!.getBoundingClientRect();
    setDrag({ id: n.id, ox: e.clientX - rect.left - n.x, oy: e.clientY - rect.top - n.y, sx: 0, sy: 0 });
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!drag) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    setNodes((ns) =>
      ns.map((n) => (n.id === drag.id ? { ...n, x: e.clientX - rect.left - drag.ox, y: e.clientY - rect.top - drag.oy } : n))
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      <header className="px-6 py-4 border-b border-[color:var(--border)] flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Flujos</h1>
        {flowName && <div className="text-xs text-fg-3">{flowName}</div>}
        <div className="flex-1" />
        <div className="flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-bg-1 p-1">
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="h-8 w-8 flex items-center justify-center text-fg-3 hover:text-fg rounded-lg hover:bg-bg-2">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs font-mono px-1.5">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(1.5, s + 0.1))} className="h-8 w-8 flex items-center justify-center text-fg-3 hover:text-fg rounded-lg hover:bg-bg-2">
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        <Button variant="secondary" className="gap-2">
          <Plus className="h-4 w-4" /> Nuevo flujo
        </Button>
        <Button className="gap-2" onClick={() => setTestOpen(true)}>
          <Play className="h-4 w-4" /> Probar flujo
        </Button>
      </header>

      <div className="flex-1 flex min-h-0 relative">
        <div className="absolute top-3 right-4 z-20 max-w-xs">
          <TexTip
            id="flows-intro"
            variant="default"
            tone="info"
            message={<span className="text-[12px]">Los flujos son como un tablero de Arkanoid. Arrastrá nodos y conectalos.</span>}
          />
        </div>
        {/* Palette */}
        <aside className="w-56 border-r border-[color:var(--border)] bg-bg-1 p-3">
          <div className="text-[11px] uppercase tracking-wider text-fg-3 font-medium mb-2 px-1">Nodos</div>
          <div className="flex flex-col gap-1.5">
            {PALETTE.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.type}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-bg-2 border text-sm cursor-grab active:cursor-grabbing hover:border-[color:var(--border-strong)] transition-colors",
                    p.semaphore === "green" && "border-[rgba(16,185,129,0.25)]",
                    p.semaphore === "amber" && "border-[rgba(245,158,11,0.25)]",
                    p.semaphore === "red" && "border-[rgba(239,68,68,0.25)]"
                  )}
                >
                  <Icon className="h-4 w-4 text-fg-2" />
                  {p.title}
                </div>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto grid-bg"
          onMouseMove={onMouseMove}
          onMouseUp={() => setDrag(null)}
          onMouseLeave={() => setDrag(null)}
          onClick={(e) => {
            if (e.target === canvasRef.current) setSelected(null);
          }}
        >
          <div className="absolute" style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: 1600, height: 900 }}>
            <svg className="absolute inset-0 pointer-events-none" width={1600} height={900}>
              {edges.map((e, i) => {
                const a = nodes.find((n) => n.id === e.from);
                const b = nodes.find((n) => n.id === e.to);
                if (!a || !b) return null;
                const x1 = a.x + 240;
                const y1 = a.y + 60;
                const x2 = b.x;
                const y2 = b.y + 60;
                const mx = (x1 + x2) / 2;
                return (
                  <g key={i}>
                    <path
                      d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                      stroke="rgba(139,92,246,0.4)"
                      strokeWidth="2"
                      fill="none"
                    />
                    <circle cx={x2} cy={y2} r="4" fill="rgba(139,92,246,0.8)" />
                  </g>
                );
              })}
            </svg>

            {nodes.map((n) => {
              const meta = PALETTE.find((p) => p.type === n.type)!;
              const Icon = meta.icon;
              const ring =
                n.semaphore === "green"
                  ? "border-[rgba(16,185,129,0.35)]"
                  : n.semaphore === "amber"
                    ? "border-[rgba(245,158,11,0.4)]"
                    : "border-[rgba(239,68,68,0.4)]";
              return (
                <motion.div
                  key={n.id}
                  layout
                  onMouseDown={(e) => onMouseDown(e, n)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(n);
                  }}
                  className={cn(
                    "absolute w-[240px] rounded-2xl border-2 bg-bg-1 p-3 cursor-grab active:cursor-grabbing select-none transition-all",
                    ring,
                    selected?.id === n.id && "ring-4 ring-brand/30"
                  )}
                  style={{ left: n.x, top: n.y }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="h-7 w-7 rounded-lg bg-bg-2 flex items-center justify-center text-fg">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="font-semibold text-sm">{n.title}</div>
                    <span className={cn("ml-auto h-1.5 w-1.5 rounded-full", `dot-${n.semaphore}`)} />
                  </div>
                  <div className="text-xs text-fg-3 leading-snug">{n.summary}</div>
                </motion.div>
              );
            })}
          </div>

          {nodes.length === 0 ? (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
              <TexEmpty
                variant="default"
                size="xl"
                message={<span>{TEX_COPY.empty.noFlows}</span>}
              />
            </div>
          ) : (
            !selected && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center text-fg-4 text-sm">
                Click en un nodo para editarlo. Drag para mover.
              </div>
            )
          )}
        </div>

        {/* Right: config panel / simulator */}
        {testOpen ? (
          <FlowSimulator onClose={() => setTestOpen(false)} />
        ) : selected ? (
          <aside className="w-[340px] border-l border-[color:var(--border)] bg-bg-1 flex flex-col">
            <div className="px-5 pt-5 pb-3">
              <div className="text-[11px] uppercase tracking-wider text-fg-3 font-medium">Nodo</div>
              <div className="flex items-center gap-2 mt-1">
                <h3 className="font-semibold">{selected.title}</h3>
                <span className={cn("h-1.5 w-1.5 rounded-full", `dot-${selected.semaphore}`)} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-5 flex flex-col gap-3">
              <div>
                <label className="text-xs text-fg-3 font-medium mb-1 block">Título</label>
                <input
                  className="w-full h-10 rounded-xl bg-bg-2 border border-[color:var(--border)] px-3 text-sm text-fg focus:outline-none focus:border-brand-2"
                  value={selected.title}
                  onChange={(e) =>
                    setNodes((ns) => ns.map((n) => (n.id === selected.id ? { ...n, title: e.target.value } : n)))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-fg-3 font-medium mb-1 block">Descripción</label>
                <textarea
                  rows={4}
                  className="w-full rounded-xl bg-bg-2 border border-[color:var(--border)] p-3 text-sm text-fg focus:outline-none focus:border-brand-2 resize-none"
                  value={selected.summary}
                  onChange={(e) =>
                    setNodes((ns) => ns.map((n) => (n.id === selected.id ? { ...n, summary: e.target.value } : n)))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-fg-3 font-medium mb-1 block">Semáforo máximo</label>
                <div className="flex gap-1.5">
                  {(["green", "amber", "red"] as const).map((s) => (
                    <Chip
                      key={s}
                      active={selected.semaphore === s}
                      onClick={() =>
                        setNodes((ns) => ns.map((n) => (n.id === selected.id ? { ...n, semaphore: s } : n)))
                      }
                    >
                      <span className={`h-1.5 w-1.5 rounded-full dot-${s}`} />
                      {s === "green" ? "Auto" : s === "amber" ? "Sugerir" : "Humano"}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function FlowSimulator({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ from: "bot" | "me"; text: string }[]>([]);
  const [input, setInput] = useState("");
  function send() {
    if (!input.trim()) return;
    setMsgs((m) => [...m, { from: "me", text: input }]);
    setInput("");
  }
  return (
    <aside className="w-[340px] border-l border-[color:var(--border)] bg-bg-1 flex flex-col">
      <header className="px-4 py-3 border-b border-[color:var(--border)] flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-[color:var(--accent-green)] animate-pulse" />
        <div className="text-sm font-medium">Simulador en vivo</div>
        <button onClick={onClose} className="ml-auto text-xs text-fg-3 hover:text-fg">
          Cerrar
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {msgs.length === 0 && (
          <div className="text-center text-fg-4 text-xs py-8">
            Escribí un mensaje para probar cómo responde tu flujo.
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                m.from === "me" ? "bg-brand text-white rounded-tr-md" : "bg-bg-2 border border-[color:var(--border)] rounded-tl-md"
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-[color:var(--border)] flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Escribí como cliente…"
          className="flex-1 h-10 rounded-xl bg-bg-2 border border-[color:var(--border)] px-3 text-sm text-fg focus:outline-none focus:border-brand-2"
        />
        <Button size="icon" onClick={send}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
