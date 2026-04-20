"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./flows.css";
import { NODE_COMPONENTS } from "./node-types";
import { EDGE_COMPONENTS } from "./edge-types";
import { useFlowStore } from "../state/use-flow-store";
import type { NodeType } from "../types/flow";
import { CanvasControls } from "./canvas-controls";
import { CanvasMinimap } from "./canvas-minimap";

const nodeTypes = NODE_COMPONENTS as unknown as NodeTypes;
const edgeTypes = EDGE_COMPONENTS as unknown as EdgeTypes;

// -------------------------------------------------------------------------
// Provider wrapper — ReactFlow necesita su context para useReactFlow().
// -------------------------------------------------------------------------

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}

function FlowCanvasInner() {
  const rfNodes = useFlowStore((s) => s.rfNodes);
  const rfEdges = useFlowStore((s) => s.rfEdges);
  const viewport = useFlowStore((s) => s.viewport);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const onViewportChange = useFlowStore((s) => s.onViewportChange);
  const addNode = useFlowStore((s) => s.addNode);
  const selectNode = useFlowStore((s) => s.selectNode);
  const selectEdge = useFlowStore((s) => s.selectEdge);

  const rf = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const didFitRef = useRef(false);

  // Al montar, ajustamos la vista al contenido existente (solo la primera vez).
  useEffect(() => {
    if (didFitRef.current) return;
    if (rfNodes.length === 0) return;
    didFitRef.current = true;
    requestAnimationFrame(() => {
      rf.fitView({ padding: 0.25, duration: 0 });
    });
  }, [rf, rfNodes.length]);

  // -------- DND: soltar tipo de nodo desde la palette al canvas ----------
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/x-flow-node") as NodeType;
      if (!type) return;
      const bounds = wrapperRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = rf.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      // Ajustar para que el nodo caiga centrado en el cursor (nodo de 260×~120).
      addNode(type, { x: position.x - 130, y: position.y - 50 });
    },
    [rf, addNode],
  );

  // Validación de conexiones — evitamos self-loops.
  const isValidConnection = useCallback((c: Connection | { source: string | null; target: string | null }) => {
    if (c.source === c.target) return false;
    return true;
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="flows-canvas-wrap relative h-full w-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        colorMode="dark"
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onViewportChange={onViewportChange}
        defaultViewport={viewport}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection as never}
        connectionRadius={32}
        selectionOnDrag
        panOnDrag={[0, 1, 2]} /* left/middle/right — permite pan con left-drag */
        selectionMode={"partial" as never}
        selectionKeyCode={"Shift"}
        multiSelectionKeyCode={["Meta", "Shift"]}
        deleteKeyCode={null /* lo manejamos en use-keyboard */}
        zoomOnScroll
        zoomOnPinch
        panOnScroll={false}
        minZoom={0.25}
        maxZoom={2}
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
        className="touch-none"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.1}
          color="rgba(255,255,255,0.055)"
          bgColor="transparent"
        />
      </ReactFlow>

      {/* Overlays */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <CanvasControls />
        </div>
        <div className="absolute bottom-4 right-4 hidden md:block pointer-events-auto">
          <CanvasMinimap />
        </div>
      </div>
    </div>
  );
}
