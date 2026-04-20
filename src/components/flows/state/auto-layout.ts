// Autolayout con dagre: toma los nodos y edges actuales, calcula posiciones
// en grafo dirigido (izquierda → derecha) y devuelve nodos con x/y actualizados.

import dagre from "@dagrejs/dagre";
import type { FlowEdge, FlowNode } from "../types/flow";

const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;

export function autoLayout(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 90, nodesep: 56, edgesep: 16 });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to);
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const laid = g.node(n.id);
    if (!laid) return n;
    return {
      ...n,
      x: Math.round(laid.x - NODE_WIDTH / 2),
      y: Math.round(laid.y - NODE_HEIGHT / 2),
    };
  });
}
