"use client";

// Command palette (Cmd+K) específico del editor de Flujos.
// Se monta por encima del editor y provee acciones rápidas contextuales.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { motion, AnimatePresence } from "motion/react";
import {
  Rocket,
  Play,
  Plus,
  Sparkles,
  Undo2,
  Redo2,
  Search,
  MessageCircle,
  UserCheck,
  Clipboard,
  CalendarClock,
  CreditCard,
  ArrowRightFromLine,
  Power,
  GitBranch,
} from "lucide-react";
import { useFlowStore } from "./state/use-flow-store";
import { NODE_REGISTRY, PALETTE_TYPES } from "./types/registry";
import type { NodeType } from "./types/flow";
import { autoLayout } from "./state/auto-layout";

const ICON_MAP: Record<NodeType, typeof MessageCircle> = {
  start: Play,
  saludo: MessageCircle,
  calif: UserCheck,
  faq: Sparkles,
  datos: Clipboard,
  agendar: CalendarClock,
  pagar: CreditCard,
  derivar: ArrowRightFromLine,
  cerrar: Power,
  condition: GitBranch,
};

export function FlowsCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const addNode = useFlowStore((s) => s.addNode);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const replaceGraph = useFlowStore((s) => s.replaceGraph);
  const viewport = useFlowStore((s) => s.viewport);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const canUndo = useFlowStore((s) => s.past.length > 0);
  const canRedo = useFlowStore((s) => s.future.length > 0);
  const selectNode = useFlowStore((s) => s.selectNode);
  const openSimulator = useFlowStore((s) => s.openSimulator);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Separado del use-keyboard: esto es global del editor con preventDefault.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function run(action: () => void) {
    action();
    setOpen(false);
    setSearch("");
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-[101] w-[92vw] max-w-[560px]"
          >
            <Command
              shouldFilter
              className="overflow-hidden rounded-2xl border border-[color:var(--border-strong)] bg-bg-1 shadow-[var(--shadow-hover)]"
            >
              <div className="flex items-center gap-2 px-3 border-b border-[color:var(--border)]">
                <Search className="h-4 w-4 text-fg-4" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Buscá acciones o nodos…"
                  className="flex-1 h-11 bg-transparent text-sm text-fg placeholder:text-fg-4 focus:outline-none"
                />
                <kbd className="text-[10px]">ESC</kbd>
              </div>
              <Command.List className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-xs text-fg-4">
                  Nada que coincida.
                </Command.Empty>

                <Command.Group heading="Acciones" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-4 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                  <Item onSelect={() => run(() => openSimulator(true))} icon={<Play className="h-3.5 w-3.5" />}>
                    Probar flujo
                  </Item>
                  <Item
                    onSelect={() =>
                      run(() => {
                        const laidOut = autoLayout(nodes, edges);
                        replaceGraph({ nodes: laidOut, edges, viewport });
                      })
                    }
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    disabled={nodes.length < 2}
                  >
                    Organizar automáticamente
                  </Item>
                  <Item onSelect={() => run(undo)} icon={<Undo2 className="h-3.5 w-3.5" />} disabled={!canUndo}>
                    Deshacer <Shortcut>⌘Z</Shortcut>
                  </Item>
                  <Item onSelect={() => run(redo)} icon={<Redo2 className="h-3.5 w-3.5" />} disabled={!canRedo}>
                    Rehacer <Shortcut>⌘⇧Z</Shortcut>
                  </Item>
                  <Item
                    onSelect={() => run(() => router.push("/flujos"))}
                    icon={<Rocket className="h-3.5 w-3.5" />}
                  >
                    Volver a Flujos
                  </Item>
                </Command.Group>

                <Command.Group heading="Agregar nodo" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-4 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 mt-2">
                  {PALETTE_TYPES.map((t) => {
                    const entry = NODE_REGISTRY[t];
                    const Icon = ICON_MAP[t];
                    return (
                      <Item
                        key={t}
                        onSelect={() =>
                          run(() => {
                            const id = addNode(t, { x: 300, y: 200 });
                            selectNode(id);
                          })
                        }
                        icon={<Icon className="h-3.5 w-3.5" />}
                      >
                        <span className="font-medium">{entry.title}</span>
                        <span className="text-fg-4 text-[11px] ml-2 truncate">
                          {entry.description}
                        </span>
                      </Item>
                    );
                  })}
                </Command.Group>

                {search && (
                  <Command.Group
                    heading="Ir a nodo"
                    className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-fg-4 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 mt-2"
                  >
                    {nodes
                      .filter((n) =>
                        (n.title + " " + n.summary).toLowerCase().includes(search.toLowerCase()),
                      )
                      .slice(0, 5)
                      .map((n) => (
                        <Item
                          key={n.id}
                          onSelect={() => run(() => selectNode(n.id))}
                          icon={<MessageCircle className="h-3.5 w-3.5" />}
                        >
                          {n.title}
                          <span className="text-fg-4 text-[10px] font-mono ml-auto">{n.type}</span>
                        </Item>
                      ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Item({
  children,
  icon,
  onSelect,
  disabled,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      disabled={disabled}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-bg-2 data-[selected=true]:text-fg text-fg-2 data-[disabled=true]:opacity-40 data-[disabled=true]:pointer-events-none"
    >
      {icon && <span className="text-fg-3">{icon}</span>}
      <span className="flex-1 flex items-center gap-1.5 min-w-0 truncate">{children}</span>
    </Command.Item>
  );
}

function Shortcut({ children }: { children: React.ReactNode }) {
  return <kbd className="ml-auto text-[10px]">{children}</kbd>;
}
