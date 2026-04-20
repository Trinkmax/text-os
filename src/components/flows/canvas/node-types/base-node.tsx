"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { FlowNode } from "../../types/flow";
import { NODE_REGISTRY } from "../../types/registry";
import { getNodePreview } from "../node-previews";

// Props reales que xyflow pasa a cada custom node. Tipamos a mano para evitar
// el generic verboso y los recursive types de xyflow v12.
type RfNodeProps = {
  id: string;
  data: { node: FlowNode };
  selected?: boolean;
};

// Wrapper común a todos los tipos.
export const BaseNodeComponent = memo(function BaseNode(
  // xyflow pasa más props que no nos interesan.
  props: Record<string, unknown>,
) {
  const { data, selected } = props as unknown as RfNodeProps;
  const node = data.node;
  const entry = NODE_REGISTRY[node.type];
  const Icon = entry.icon;
  const preview = getNodePreview(node);

  const accentVar = {
    brand: "var(--brand)",
    green: "var(--accent-green)",
    amber: "var(--accent-amber)",
    red: "var(--accent-red)",
    blue: "var(--accent-blue)",
  }[entry.accent];

  const isStart = node.type === "start";
  const isTerminal = node.type === "cerrar" || node.type === "derivar";
  const isCondition = node.type === "condition";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: node.disabled ? 0.55 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "relative w-[260px] rounded-2xl border-2 bg-bg-1 select-none shadow-[var(--shadow-card)] overflow-hidden",
        selected
          ? "border-transparent ring-2 ring-brand-2 shadow-[0_0_40px_rgba(167,139,250,0.35)]"
          : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]",
      )}
      style={{
        // Accent stripe en el borde izquierdo.
        background: `linear-gradient(90deg, ${accentVar}18 0%, var(--bg-1) 30%)`,
      }}
    >
      {/* Header area: drag handle class so xyflow knows where to grab */}
      <div className="flow-node-drag-handle px-3 pt-3 pb-2 cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accentVar}30 0%, ${accentVar}15 100%)`,
              color: accentVar,
              border: `1px solid ${accentVar}40`,
            }}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-fg-4 font-medium leading-none mb-0.5">
              {entry.shortLabel}
            </div>
            <div className="font-semibold text-sm text-fg truncate leading-tight">
              {node.title}
            </div>
          </div>
          <span
            className={cn("h-2 w-2 rounded-full flex-shrink-0", `dot-${node.semaphore}`)}
            aria-label={`Semáforo: ${node.semaphore}`}
          />
        </div>
      </div>

      {/* Preview body */}
      <div className="px-3 pb-3">
        <div
          className={cn(
            "text-xs leading-snug rounded-lg bg-bg-2/60 border border-[color:var(--border)] px-2.5 py-2",
            node.type === "saludo" || node.type === "derivar" || node.type === "cerrar"
              ? "text-fg-2 italic"
              : "text-fg-3",
          )}
        >
          {preview}
        </div>
      </div>

      {/* Handles */}
      {!isStart && (
        <Handle
          id="in"
          type="target"
          position={Position.Left}
          className="flow-node-handle"
          style={handleStyle(accentVar)}
        />
      )}
      {!isTerminal && !isCondition && (
        <Handle
          id="out"
          type="source"
          position={Position.Right}
          className="flow-node-handle"
          style={handleStyle(accentVar)}
        />
      )}
      {isCondition &&
        node.config.branches.map((b, idx) => {
          const count = node.config.branches.length;
          const spacing = 100 / (count + 1);
          const top = spacing * (idx + 1);
          return (
            <Handle
              key={b.id}
              id={b.id}
              type="source"
              position={Position.Right}
              className="flow-node-handle"
              style={{
                ...handleStyle(accentVar),
                top: `${top}%`,
              }}
            >
              <span
                className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[10px] font-medium whitespace-nowrap bg-bg-1 border border-[color:var(--border)] rounded-full px-1.5 py-0.5 text-fg-3 pointer-events-none"
                style={{ color: accentVar }}
              >
                {b.label}
              </span>
            </Handle>
          );
        })}
    </motion.div>
  );
});

function handleStyle(accent: string): React.CSSProperties {
  return {
    width: 12,
    height: 12,
    background: "var(--bg-1)",
    border: `2px solid ${accent}`,
    boxShadow: `0 0 0 3px ${accent}18`,
  };
}
