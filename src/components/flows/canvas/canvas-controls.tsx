"use client";

import { useReactFlow, useStore as useRfStore } from "@xyflow/react";
import {
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlowStore } from "../state/use-flow-store";
import { autoLayout } from "../state/auto-layout";

export function CanvasControls() {
  const rf = useReactFlow();
  const zoom = useRfStore((s) => s.transform[2]);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const canUndo = useFlowStore((s) => s.past.length > 0);
  const canRedo = useFlowStore((s) => s.future.length > 0);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const replaceGraph = useFlowStore((s) => s.replaceGraph);
  const viewport = useFlowStore((s) => s.viewport);

  function onOrganize() {
    if (nodes.length < 2) return;
    const laidOut = autoLayout(nodes, edges);
    replaceGraph({ nodes: laidOut, edges, viewport });
    setTimeout(() => rf.fitView({ padding: 0.2, duration: 400 }), 50);
  }

  return (
    <div className="flex items-stretch gap-1 rounded-xl border border-[color:var(--border)] bg-bg-1/90 backdrop-blur p-1 shadow-[var(--shadow-card)]">
      <ControlButton
        onClick={() => rf.zoomOut({ duration: 150 })}
        aria-label="Alejar"
      >
        <Minus className="h-3.5 w-3.5" />
      </ControlButton>
      <span className="text-[11px] font-mono tabular-nums text-fg-3 px-1.5 self-center min-w-[36px] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <ControlButton
        onClick={() => rf.zoomIn({ duration: 150 })}
        aria-label="Acercar"
      >
        <Plus className="h-3.5 w-3.5" />
      </ControlButton>
      <Divider />
      <ControlButton
        onClick={() => rf.fitView({ padding: 0.2, duration: 300 })}
        aria-label="Ajustar a pantalla"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </ControlButton>
      <Divider />
      <ControlButton
        onClick={undo}
        disabled={!canUndo}
        aria-label="Deshacer"
        title="⌘Z"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </ControlButton>
      <ControlButton
        onClick={redo}
        disabled={!canRedo}
        aria-label="Rehacer"
        title="⌘⇧Z"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </ControlButton>
      <Divider />
      <ControlButton onClick={onOrganize} aria-label="Organizar" title="Acomoda los nodos automáticamente">
        <Sparkles className="h-3.5 w-3.5" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-lg text-fg-3 hover:text-fg hover:bg-bg-2 transition-colors disabled:opacity-40 disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px bg-[color:var(--border)] mx-0.5" />;
}
