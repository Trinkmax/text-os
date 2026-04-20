"use client";

// Zustand store para el editor de flujos.
// Se encarga de: nodes/edges/viewport, selección, historial (undo/redo),
// y flags de sync con el servidor. El canvas de xyflow se sincroniza con
// este store usando las callbacks applyNodeChanges/applyEdgeChanges.

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  Connection,
  EdgeChange,
  NodeChange,
  Viewport as XyViewport,
} from "@xyflow/react";
import { applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { FlowEdge, FlowGraph, FlowNode, NodeConfigMap, NodeType } from "../types/flow";
import { makeNode } from "../types/registry";

// -------------------------------------------------------------------------
// xyflow-adaptado: los "nodes" y "edges" que xyflow necesita para renderizar.
// Wrappeamos nuestros FlowNode dentro de un RF node con `data` custom.
// -------------------------------------------------------------------------

import type { Node as RfNode, Edge as RfEdge } from "@xyflow/react";

export type RfFlowNode = RfNode<{ node: FlowNode }, NodeType>;
export type RfFlowEdge = RfEdge<{ edge: FlowEdge }>;

function toRfNode(n: FlowNode): RfFlowNode {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.x, y: n.y },
    data: { node: n },
    selected: false,
    // Permitir dragging sobre todo el contenido del nodo excepto inputs.
    dragHandle: ".flow-node-drag-handle",
  };
}

function toRfEdge(e: FlowEdge): RfFlowEdge {
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    sourceHandle: e.sourceHandle ?? undefined,
    type: e.condition ? "condition" : "default",
    label: e.label,
    data: { edge: e },
  };
}

function fromRfNode(rf: RfFlowNode, prev: FlowNode): FlowNode {
  return {
    ...prev,
    x: rf.position.x,
    y: rf.position.y,
  };
}

// -------------------------------------------------------------------------
// Historial para undo/redo. Guardamos snapshots discretos del graph.
// -------------------------------------------------------------------------

type Snapshot = { nodes: FlowNode[]; edges: FlowEdge[] };

// -------------------------------------------------------------------------
// Sync status — qué estamos mostrando en el SaveIndicator.
// -------------------------------------------------------------------------

export type SyncStatus =
  | { kind: "idle"; lastSavedAt: number | null }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string }
  | { kind: "conflict" };

// -------------------------------------------------------------------------
// Store shape
// -------------------------------------------------------------------------

export type FlowStore = {
  // Meta del flujo cargado.
  flowId: string;
  flowName: string;
  flowVersion: number;
  publishedVersionId: string | null;
  baseUpdatedAt: string | null; // para optimistic concurrency

  // Graph state.
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: { x: number; y: number; zoom: number };

  // Selección.
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  simulatorOpen: boolean;

  // Dirty flag: true cuando hay cambios no guardados.
  dirty: boolean;
  sync: SyncStatus;

  // Historial.
  past: Snapshot[];
  future: Snapshot[];

  // Views xyflow-adaptadas (computadas al aplicar cambios).
  rfNodes: RfFlowNode[];
  rfEdges: RfFlowEdge[];

  // -------- ACTIONS ------------------------------------------------------

  init: (params: {
    flowId: string;
    flowName: string;
    flowVersion: number;
    publishedVersionId: string | null;
    baseUpdatedAt: string | null;
    graph: FlowGraph;
  }) => void;

  // Reconciliación con xyflow (drag, select, connect).
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onViewportChange: (vp: XyViewport) => void;

  // Mutaciones de alto nivel.
  addNode: (type: NodeType, at: { x: number; y: number }) => string;
  updateNode: (id: string, patch: Partial<Omit<FlowNode, "type">>) => void;
  updateNodeConfig: <T extends NodeType>(
    id: string,
    patch: Partial<NodeConfigMap[T]>,
  ) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;

  addEdge: (edge: FlowEdge) => void;
  updateEdge: (id: string, patch: Partial<FlowEdge>) => void;
  deleteEdge: (id: string) => void;

  replaceGraph: (graph: FlowGraph) => void;

  // Selección.
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  openSimulator: (open: boolean) => void;

  // Historial.
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Sync.
  markSaving: () => void;
  markSaved: (updatedAt: string) => void;
  markError: (message: string) => void;
  markConflict: () => void;

  // Serialización para autosave.
  serialize: () => FlowGraph;
};

const HISTORY_LIMIT = 50;

// Clonamos profundamente para snapshots del historial. Los configs son
// objetos simples (sin funciones), así que structuredClone funciona.
function deepClone<T>(v: T): T {
  return typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v));
}

export const useFlowStore = create<FlowStore>()(
  subscribeWithSelector((set, get) => ({
    flowId: "",
    flowName: "",
    flowVersion: 1,
    publishedVersionId: null,
    baseUpdatedAt: null,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodeId: null,
    selectedEdgeId: null,
    simulatorOpen: false,
    dirty: false,
    sync: { kind: "idle", lastSavedAt: null },
    past: [],
    future: [],
    rfNodes: [],
    rfEdges: [],

    init: ({ flowId, flowName, flowVersion, publishedVersionId, baseUpdatedAt, graph }) => {
      set({
        flowId,
        flowName,
        flowVersion,
        publishedVersionId,
        baseUpdatedAt,
        nodes: graph.nodes,
        edges: graph.edges,
        viewport: graph.viewport,
        selectedNodeId: null,
        selectedEdgeId: null,
        simulatorOpen: false,
        dirty: false,
        sync: { kind: "idle", lastSavedAt: null },
        past: [],
        future: [],
        rfNodes: graph.nodes.map(toRfNode),
        rfEdges: graph.edges.map(toRfEdge),
      });
    },

    onNodesChange: (changes) => {
      const prevRf = get().rfNodes;
      const nextRf = applyNodeChanges(changes, prevRf);

      // Sólo marcamos dirty cuando hay un cambio REAL: posición final
      // (dragging=false y posición distinta), o remove. Select / dimensions
      // no deben disparar autosave.
      const positionsChanged = changes.some(
        (c) => c.type === "position" && c.dragging === false && (c.position?.x !== undefined || c.position?.y !== undefined),
      );
      const removed = changes.some((c) => c.type === "remove");

      // Ignoramos la auto-selección de xyflow (que dispara al hacer mousedown
      // sobre el nodo, incluyendo al empezar a arrastrar). La selección la
      // maneja exclusivamente onNodeClick vía selectNode(). Forzamos el flag
      // `selected` en rfNodes para que coincida con nuestro selectedNodeId.
      const selId = get().selectedNodeId;
      const syncedRf = nextRf.map((n) => (n.selected === (n.id === selId) ? n : { ...n, selected: n.id === selId }));

      const next = { rfNodes: syncedRf } as Partial<FlowStore>;

      if (positionsChanged || removed) {
        // Guardamos snapshot ANTES del cambio para poder hacer undo.
        pushHistory(set, get);
      }

      // Sincronizamos posiciones actuales al modelo SOLO si hubo cambio
      // real de posición — sino mantenemos los nodos del modelo intactos
      // para no disparar re-renders innecesarios y evitar dirty fantasma.
      if (positionsChanged || removed) {
        const nodeById = new Map(get().nodes.map((n) => [n.id, n]));
        const updatedNodes: FlowNode[] = [];
        for (const rf of syncedRf as RfFlowNode[]) {
          const prev = nodeById.get(rf.id);
          if (!prev) continue;
          updatedNodes.push(fromRfNode(rf, prev));
        }
        next.nodes = updatedNodes;
      }

      if (removed) {
        const keptIds = new Set(syncedRf.map((r) => r.id));
        next.edges = get().edges.filter((e) => keptIds.has(e.from) && keptIds.has(e.to));
        next.rfEdges = next.edges.map(toRfEdge);
        // Si el nodo seleccionado fue borrado, limpiamos la selección.
        if (selId && !keptIds.has(selId)) next.selectedNodeId = null;
      }

      if (positionsChanged || removed) next.dirty = true;

      set(next);
    },

    onEdgesChange: (changes) => {
      const prevRf = get().rfEdges;
      const nextRf = applyEdgeChanges(changes, prevRf);

      const next = { rfEdges: nextRf } as Partial<FlowStore>;
      const removed = changes.some((c) => c.type === "remove");
      const selectionChanged = changes.some((c) => c.type === "select");

      if (removed) {
        pushHistory(set, get);
        const keptIds = new Set(nextRf.map((r) => r.id));
        next.edges = get().edges.filter((e) => keptIds.has(e.id));
        next.dirty = true;
      }

      if (selectionChanged) {
        const selected = nextRf.find((r) => r.selected);
        next.selectedEdgeId = selected?.id ?? null;
        if (selected) next.selectedNodeId = null;
      }

      set(next);
    },

    onConnect: (connection) => {
      if (!connection.source || !connection.target) return;
      pushHistory(set, get);
      const id = `e_${Math.random().toString(36).slice(2, 10)}`;
      const edge: FlowEdge = {
        id,
        from: connection.source,
        to: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
      };
      const edges = [...get().edges, edge];
      set({
        edges,
        rfEdges: edges.map(toRfEdge),
        dirty: true,
      });
    },

    onViewportChange: (vp) => {
      // El viewport se guarda sin marcar dirty: no queremos autosave por
      // solo panear o hacer zoom. Se persistirá en el próximo save que
      // dispare un cambio real (mover nodo, editar config, etc.).
      set({ viewport: vp });
    },

    addNode: (type, at) => {
      pushHistory(set, get);
      const node = makeNode({ type, x: at.x, y: at.y }) as FlowNode;
      const nodes = [...get().nodes, node];
      set({
        nodes,
        rfNodes: nodes.map((n) => ({ ...toRfNode(n), selected: n.id === node.id })),
        selectedNodeId: node.id,
        selectedEdgeId: null,
        dirty: true,
      });
      return node.id;
    },

    updateNode: (id, patch) => {
      pushHistory(set, get);
      const nodes = get().nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as FlowNode) : n));
      set({
        nodes,
        rfNodes: nodes.map((n) => ({
          ...toRfNode(n),
          selected: get().selectedNodeId === n.id,
        })),
        dirty: true,
      });
    },

    updateNodeConfig: (id, patch) => {
      pushHistory(set, get);
      const nodes = get().nodes.map((n) => {
        if (n.id !== id) return n;
        return { ...n, config: { ...n.config, ...patch } } as FlowNode;
      });
      set({
        nodes,
        rfNodes: nodes.map((n) => ({
          ...toRfNode(n),
          selected: get().selectedNodeId === n.id,
        })),
        dirty: true,
      });
    },

    deleteNode: (id) => {
      pushHistory(set, get);
      const nodes = get().nodes.filter((n) => n.id !== id);
      const edges = get().edges.filter((e) => e.from !== id && e.to !== id);
      set({
        nodes,
        edges,
        rfNodes: nodes.map(toRfNode),
        rfEdges: edges.map(toRfEdge),
        selectedNodeId: null,
        dirty: true,
      });
    },

    duplicateNode: (id) => {
      const source = get().nodes.find((n) => n.id === id);
      if (!source) return;
      pushHistory(set, get);
      const clone = {
        ...deepClone(source),
        id: `n_${Math.random().toString(36).slice(2, 10)}`,
        x: source.x + 40,
        y: source.y + 40,
      } as FlowNode;
      const nodes = [...get().nodes, clone];
      set({
        nodes,
        rfNodes: nodes.map((n) => ({ ...toRfNode(n), selected: n.id === clone.id })),
        selectedNodeId: clone.id,
        dirty: true,
      });
    },

    addEdge: (edge) => {
      pushHistory(set, get);
      const edges = [...get().edges, edge];
      set({
        edges,
        rfEdges: edges.map(toRfEdge),
        dirty: true,
      });
    },

    updateEdge: (id, patch) => {
      pushHistory(set, get);
      const edges = get().edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
      set({
        edges,
        rfEdges: edges.map(toRfEdge),
        dirty: true,
      });
    },

    deleteEdge: (id) => {
      pushHistory(set, get);
      const edges = get().edges.filter((e) => e.id !== id);
      set({
        edges,
        rfEdges: edges.map(toRfEdge),
        selectedEdgeId: null,
        dirty: true,
      });
    },

    replaceGraph: (graph) => {
      pushHistory(set, get);
      set({
        nodes: graph.nodes,
        edges: graph.edges,
        viewport: graph.viewport,
        rfNodes: graph.nodes.map(toRfNode),
        rfEdges: graph.edges.map(toRfEdge),
        dirty: true,
      });
    },

    selectNode: (id) => {
      set({
        selectedNodeId: id,
        selectedEdgeId: null,
        rfNodes: get().nodes.map((n) => ({ ...toRfNode(n), selected: n.id === id })),
      });
    },

    selectEdge: (id) => {
      set({
        selectedEdgeId: id,
        selectedNodeId: null,
        rfEdges: get().edges.map((e) => ({ ...toRfEdge(e), selected: e.id === id })),
      });
    },

    openSimulator: (open) => set({ simulatorOpen: open }),

    undo: () => {
      const { past, nodes, edges } = get();
      if (past.length === 0) return;
      const prev = past[past.length - 1];
      const newPast = past.slice(0, -1);
      const currentSnapshot: Snapshot = { nodes: deepClone(nodes), edges: deepClone(edges) };
      set({
        past: newPast,
        future: [currentSnapshot, ...get().future].slice(0, HISTORY_LIMIT),
        nodes: prev.nodes,
        edges: prev.edges,
        rfNodes: prev.nodes.map(toRfNode),
        rfEdges: prev.edges.map(toRfEdge),
        dirty: true,
      });
    },

    redo: () => {
      const { future, nodes, edges } = get();
      if (future.length === 0) return;
      const next = future[0];
      const newFuture = future.slice(1);
      const currentSnapshot: Snapshot = { nodes: deepClone(nodes), edges: deepClone(edges) };
      set({
        future: newFuture,
        past: [...get().past, currentSnapshot].slice(-HISTORY_LIMIT),
        nodes: next.nodes,
        edges: next.edges,
        rfNodes: next.nodes.map(toRfNode),
        rfEdges: next.edges.map(toRfEdge),
        dirty: true,
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    markSaving: () => set({ sync: { kind: "saving" } }),
    markSaved: (updatedAt) =>
      set({
        sync: { kind: "saved", at: Date.now() },
        baseUpdatedAt: updatedAt,
        dirty: false,
      }),
    markError: (message) => set({ sync: { kind: "error", message } }),
    markConflict: () => set({ sync: { kind: "conflict" } }),

    serialize: () => ({
      nodes: get().nodes,
      edges: get().edges,
      viewport: get().viewport,
    }),
  })),
);

// -------------------------------------------------------------------------
// Helpers de historial
// -------------------------------------------------------------------------

function pushHistory(
  set: (partial: Partial<FlowStore>) => void,
  get: () => FlowStore,
) {
  const { nodes, edges, past } = get();
  const snap: Snapshot = { nodes: deepClone(nodes), edges: deepClone(edges) };
  const next = [...past, snap].slice(-HISTORY_LIMIT);
  set({ past: next, future: [] });
}
