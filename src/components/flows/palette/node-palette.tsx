"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NODE_REGISTRY, PALETTE_GROUPS } from "../types/registry";
import type { NodeType } from "../types/flow";

// Panel lateral compacto con los nodos disponibles.
// - Desktop: rail de íconos (56px) con tooltip + expandible a panel 220px.
// - Mobile: grid completo dentro de un Sheet.
// Cada item es arrastrable (HTML5 drag) y también clickeable.

export function NodePalette({
  onTap,
  variant = "sidebar",
  defaultExpanded = false,
}: {
  onTap: (type: NodeType) => void;
  variant?: "sidebar" | "sheet";
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (variant === "sheet") {
    return (
      <div className="p-4 flex flex-col gap-4 overflow-y-auto max-h-[70dvh]">
        {PALETTE_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-[10px] uppercase tracking-wider text-fg-4 font-medium px-1 mb-1.5">
              {group.label}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.types.map((t) => (
                <PaletteItem key={t} type={t} onTap={onTap} expanded />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: expanded ? 228 : 72 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      // overflow-visible para que el toggle que sobresale por el borde
      // derecho no se corte. z-30 para quedar encima del canvas.
      className={cn(
        "relative border-r border-[color:var(--border)] bg-bg-1/80 backdrop-blur-sm flex flex-col flex-shrink-0 overflow-visible z-30",
      )}
    >
      {/* Toggle flotante centrado sobre el borde derecho del aside.
          El chevron de lucide es asimétrico (apex desplazado), así que
          compensamos con un translate de 1px para que el ícono se vea
          centrado dentro del círculo. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="absolute top-1/2 right-0 z-40 h-7 w-7 -translate-y-1/2 translate-x-1/2 rounded-full bg-bg-2 border border-[color:var(--border-strong)] flex items-center justify-center text-fg-3 hover:text-fg hover:bg-bg-3 hover:border-brand-2/40 transition-all shadow-[var(--shadow-card)]"
        aria-label={expanded ? "Colapsar paleta" : "Expandir paleta"}
        title={expanded ? "Colapsar" : "Expandir paleta"}
      >
        {expanded ? (
          <ChevronLeft className="h-4 w-4 -translate-x-px" strokeWidth={2.5} />
        ) : (
          <ChevronRight className="h-4 w-4 translate-x-px" strokeWidth={2.5} />
        )}
      </button>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-3">
        {PALETTE_GROUPS.map((group, gi) => (
          <div key={group.label} className={cn(gi > 0 && "mt-3")}>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[10px] uppercase tracking-wider text-fg-4 font-medium px-3 mb-1.5 overflow-hidden"
                >
                  {group.label}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-col gap-1 px-2">
              {group.types.map((t) => (
                <PaletteItem key={t} type={t} onTap={onTap} expanded={expanded} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.aside>
  );
}

function PaletteItem({
  type,
  onTap,
  expanded,
}: {
  type: NodeType;
  onTap: (t: NodeType) => void;
  expanded: boolean;
}) {
  const entry = NODE_REGISTRY[type];
  const Icon = entry.icon;
  const accentVar = {
    brand: "var(--brand)",
    green: "var(--accent-green)",
    amber: "var(--accent-amber)",
    red: "var(--accent-red)",
    blue: "var(--accent-blue)",
  }[entry.accent];

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("application/x-flow-node", type);
    e.dataTransfer.effectAllowed = "move";
    // Drag ghost custom para feedback visual durante el arrastre.
    const ghost = document.createElement("div");
    ghost.style.position = "absolute";
    ghost.style.top = "-1000px";
    ghost.style.width = "220px";
    ghost.style.height = "70px";
    ghost.style.background = "rgba(139, 92, 246, 0.18)";
    ghost.style.border = "2px dashed var(--brand-2)";
    ghost.style.borderRadius = "16px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 110, 35);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={() => onTap(type)}
      title={expanded ? undefined : `${entry.title} — ${entry.description}`}
      className={cn(
        "flow-palette-rail-item group flex items-center gap-2.5 rounded-xl bg-bg-2 border border-[color:var(--border)] text-sm text-left cursor-grab active:cursor-grabbing",
        "hover:border-[color:var(--border-strong)] hover:bg-bg-3",
        expanded ? "px-2.5 py-2" : "px-2 py-2 justify-center",
      )}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: `${accentVar}18`,
          color: accentVar,
          border: `1px solid ${accentVar}35`,
        }}
      >
        <Icon className="h-4 w-4" />
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.12 }}
            className="flex-1 truncate text-fg text-[13px] whitespace-nowrap overflow-hidden"
          >
            {entry.title}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
