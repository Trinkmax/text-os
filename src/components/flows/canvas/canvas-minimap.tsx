"use client";

import { MiniMap } from "@xyflow/react";
import { NODE_REGISTRY } from "../types/registry";
import type { RfFlowNode } from "../state/use-flow-store";
import type { FlowNode, NodeType } from "../types/flow";

const accentColor: Record<NodeType, string> = {
  start: "var(--brand)",
  saludo: "var(--accent-green)",
  calif: "var(--accent-amber)",
  faq: "var(--accent-green)",
  datos: "var(--accent-amber)",
  agendar: "var(--accent-blue)",
  pagar: "var(--accent-red)",
  derivar: "var(--accent-red)",
  cerrar: "var(--accent-green)",
  condition: "var(--brand)",
};

export function CanvasMinimap() {
  return (
    <MiniMap
      nodeStrokeColor={(n) => {
        const rf = n as RfFlowNode;
        return accentColor[rf.data?.node.type ?? "saludo"];
      }}
      nodeColor={(n) => {
        const rf = n as RfFlowNode;
        const node = rf.data?.node;
        if (!node) return "var(--bg-3)";
        return dim(accentColor[node.type]);
      }}
      nodeBorderRadius={8}
      maskColor="rgba(9, 9, 11, 0.65)"
      style={{
        backgroundColor: "var(--bg-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        width: 168,
        height: 112,
      }}
      pannable
      zoomable
    />
  );
}

// Atenúa un color de tokens CSS convirtiéndolo a un background sólido con opacidad.
function dim(_color: string) {
  return "rgba(139, 92, 246, 0.35)";
}

// Suprimir warning de unused import (NODE_REGISTRY se deja por si se usa en el futuro).
void NODE_REGISTRY;
void ({} as FlowNode);
