"use client";

import { cn } from "@/lib/utils";
import { NODE_REGISTRY, PALETTE_GROUPS } from "../types/registry";
import type { NodeType } from "../types/flow";

// Panel lateral con los nodos disponibles. En desktop se muestra inline,
// en mobile se monta dentro de un Sheet desde el editor.
// Cada item es arrastrable (HTML5 drag) y también clickeable (tap) para
// agregarlo al canvas en una posición default.

export function NodePalette({
  onTap,
  variant = "sidebar",
}: {
  onTap: (type: NodeType) => void;
  variant?: "sidebar" | "sheet";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 overflow-y-auto",
        variant === "sidebar"
          ? "w-60 border-r border-[color:var(--border)] bg-bg-1 p-3"
          : "p-4",
      )}
    >
      {variant === "sidebar" && (
        <div className="text-[11px] uppercase tracking-wider text-fg-3 font-medium px-1">
          Nodos
        </div>
      )}
      {PALETTE_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="text-[10px] uppercase tracking-wider text-fg-4 font-medium px-1 mb-1.5">
            {group.label}
          </div>
          <div
            className={cn(
              variant === "sheet"
                ? "grid grid-cols-2 gap-2"
                : "flex flex-col gap-1.5",
            )}
          >
            {group.types.map((t) => (
              <PaletteItem key={t} type={t} onTap={onTap} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PaletteItem({ type, onTap }: { type: NodeType; onTap: (t: NodeType) => void }) {
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
    // Crear un drag image ghost transparente para que xyflow pinte su propio preview.
    const ghost = document.createElement("div");
    ghost.style.position = "absolute";
    ghost.style.top = "-1000px";
    ghost.style.width = "260px";
    ghost.style.height = "80px";
    ghost.style.background = "rgba(139, 92, 246, 0.15)";
    ghost.style.border = "2px dashed var(--brand-2)";
    ghost.style.borderRadius = "16px";
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 130, 40);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={() => onTap(type)}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-bg-2 border border-[color:var(--border)] text-sm text-left cursor-grab active:cursor-grabbing transition-all active:scale-[0.97] group",
        "hover:border-[color:var(--border-strong)] hover:bg-bg-3",
      )}
      title={entry.description}
    >
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
        style={{
          background: `${accentVar}15`,
          color: accentVar,
          border: `1px solid ${accentVar}30`,
        }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="flex-1 truncate text-fg">{entry.title}</span>
    </button>
  );
}
