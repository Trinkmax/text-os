// Validadores puros del grafo. Lo mismo que en actions/flows.ts#validateGraph
// pero expuesto client-side para feedback en tiempo real.

import type { FlowEdge, FlowNode } from "../types/flow";

export type ValidationIssue = {
  severity: "error" | "warn";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export type ValidationReport = {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
};

export function validateGraph(params: {
  nodes: FlowNode[];
  edges: FlowEdge[];
}): ValidationReport {
  const { nodes, edges } = params;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const starts = nodes.filter((n) => n.type === "start");
  if (starts.length === 0) {
    errors.push({ severity: "error", code: "no_start", message: "Falta el nodo de Inicio" });
  } else if (starts.length > 1) {
    errors.push({
      severity: "error",
      code: "multi_start",
      message: "Hay más de un nodo de Inicio",
      nodeId: starts[1].id,
    });
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  // Edges huérfanos
  for (const e of edges) {
    if (!nodeIds.has(e.from)) {
      errors.push({
        severity: "error",
        code: "edge_from_missing",
        edgeId: e.id,
        message: "Un enlace apunta a un nodo que no existe",
      });
    }
    if (!nodeIds.has(e.to)) {
      errors.push({
        severity: "error",
        code: "edge_to_missing",
        edgeId: e.id,
        message: "Un enlace tiene destino inválido",
      });
    }
  }

  // Count ins/outs
  const outBy = new Map<string, number>();
  const inBy = new Map<string, number>();
  for (const e of edges) {
    outBy.set(e.from, (outBy.get(e.from) ?? 0) + 1);
    inBy.set(e.to, (inBy.get(e.to) ?? 0) + 1);
  }

  for (const n of nodes) {
    if (n.type === "start") continue;
    if ((inBy.get(n.id) ?? 0) === 0) {
      warnings.push({
        severity: "warn",
        code: "orphan",
        nodeId: n.id,
        message: `"${n.title}" no recibe conexión`,
      });
    }
    if (n.type !== "cerrar" && n.type !== "derivar" && (outBy.get(n.id) ?? 0) === 0) {
      warnings.push({
        severity: "warn",
        code: "no_out",
        nodeId: n.id,
        message: `"${n.title}" no tiene salida`,
      });
    }
    // Condition: todas las ramas deberían tener edge.
    if (n.type === "condition") {
      for (const b of n.config.branches) {
        const hasEdge = edges.some((e) => e.from === n.id && e.sourceHandle === b.id);
        if (!hasEdge) {
          warnings.push({
            severity: "warn",
            code: "branch_unconnected",
            nodeId: n.id,
            message: `La rama "${b.label}" de "${n.title}" no está conectada`,
          });
        }
      }
    }
  }

  // Ciclos (DFS).
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const list = adj.get(e.from) ?? [];
    list.push(e.to);
    adj.set(e.from, list);
  }
  const color = new Map<string, 0 | 1 | 2>();
  let cycleNode: string | null = null;
  function dfs(nid: string): boolean {
    color.set(nid, 1);
    for (const next of adj.get(nid) ?? []) {
      if (color.get(next) === 1) {
        cycleNode = next;
        return true;
      }
      if (color.get(next) !== 2 && dfs(next)) return true;
    }
    color.set(nid, 2);
    return false;
  }
  for (const n of nodes) {
    if (!color.has(n.id) && dfs(n.id)) break;
  }
  if (cycleNode) {
    warnings.push({
      severity: "warn",
      code: "cycle",
      nodeId: cycleNode,
      message: "Hay un ciclo que incluye este nodo",
    });
  }

  return { errors, warnings };
}
