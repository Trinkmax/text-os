"use client";

import { useEffect, useState } from "react";
import { Plus, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FlowCanvas } from "./canvas/flow-canvas";
import { FlowHeader } from "./toolbar/flow-header";
import { PublishButton } from "./toolbar/publish-button";
import { SaveIndicator } from "./toolbar/save-indicator";
import { NodePalette } from "./palette/node-palette";
import { NodeInspector } from "./inspector/node-inspector";
import { FlowSimulator } from "./simulator/flow-simulator";
import { ValidationBadge } from "./validation/validation-badge";
import { FlowsOnboarding } from "./onboarding/flows-onboarding";
import { FlowsCommandPalette } from "./command-palette-flows";
import { useFlowStore } from "./state/use-flow-store";
import { useAutosave } from "./state/use-autosave";
import { useFlowKeyboard } from "./state/use-keyboard";
import type { FlowGraph, NodeType } from "./types/flow";
import type { FlowVersion } from "./toolbar/publish-button";

type FlowEditorProps = {
  flow: {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    version: number;
    publishedVersionId: string | null;
    updatedAt: string;
    graph: FlowGraph;
  };
  versions: FlowVersion[];
  allFlows: Array<{ id: string; name: string; active: boolean }>;
};

export function FlowEditor({ flow, versions, allFlows }: FlowEditorProps) {
  return (
    <FlowEditorInner flow={flow} versions={versions} allFlows={allFlows} />
  );
}

function FlowEditorInner({ flow, versions, allFlows }: FlowEditorProps) {
  const init = useFlowStore((s) => s.init);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const simulatorOpen = useFlowStore((s) => s.simulatorOpen);
  const openSimulator = useFlowStore((s) => s.openSimulator);
  const addNode = useFlowStore((s) => s.addNode);
  const sync = useFlowStore((s) => s.sync);
  const dirty = useFlowStore((s) => s.dirty);
  const nodes = useFlowStore((s) => s.nodes);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Hidratamos el store con los datos cargados en Server Component.
  // Re-init cuando cambia el flowId (switchear entre flujos sin refresh).
  useEffect(() => {
    init({
      flowId: flow.id,
      flowName: flow.name,
      flowVersion: flow.version,
      publishedVersionId: flow.publishedVersionId,
      baseUpdatedAt: flow.updatedAt,
      graph: flow.graph,
    });
  }, [flow.id, flow.name, flow.version, flow.publishedVersionId, flow.updatedAt, flow.graph, init]);

  // Engancha autosave + atajos.
  useAutosave();
  useFlowKeyboard();

  // Abrir sheet inspector automáticamente en mobile cuando se selecciona un nodo.
  useEffect(() => {
    if (selectedNodeId) setInspectorOpen(true);
  }, [selectedNodeId]);

  function onPaletteTap(type: NodeType) {
    // Agrega el nodo en el centro del canvas (coordenadas lógicas aproximadas).
    addNode(type, { x: 240, y: 180 });
    setPaletteOpen(false);
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-[calc(100dvh-0px)] overflow-hidden">
      <FlowHeader
        active={flow.active}
        published={!!flow.publishedVersionId}
        allFlows={allFlows}
      />

      {/* Sub-toolbar con validación + acciones rápidas */}
      <div className="px-3 md:px-6 py-2 border-b border-[color:var(--border)] flex items-center gap-2 bg-bg-0 flex-shrink-0 overflow-x-auto">
        <ValidationBadge />
        <div className="md:hidden">
          <SaveIndicator status={sync} dirty={dirty} />
        </div>
        <div className="flex-1" />
        <Button
          variant="secondary"
          size="sm"
          className="md:hidden gap-1.5"
          onClick={() => setPaletteOpen(true)}
          aria-label="Agregar nodo"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Nodo</span>
        </Button>
        <Button
          variant={simulatorOpen ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => openSimulator(!simulatorOpen)}
          disabled={nodes.length === 0}
        >
          <Play className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{simulatorOpen ? "Cerrar" : "Probar"}</span>
        </Button>
        <PublishButton versions={versions} publishedVersionId={flow.publishedVersionId} />
      </div>

      {/* Main body: palette | canvas | (inspector o simulator) */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Palette: desktop inline */}
        <div className="hidden md:block">
          <NodePalette onTap={onPaletteTap} />
        </div>

        {/* Canvas + overlays contextuales */}
        <FlowCanvas />
        <FlowsOnboarding />
        <FlowsCommandPalette />

        {/* Right rail: inspector (default) o simulator */}
        <div className="hidden lg:block">
          {simulatorOpen ? (
            <aside className="w-[360px] border-l border-[color:var(--border)]">
              <FlowSimulator onClose={() => openSimulator(false)} />
            </aside>
          ) : (
            <NodeInspector mode="sidebar" />
          )}
        </div>
      </div>

      {/* Mobile sheets */}
      <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
        <SheetContent side="bottom" className="md:hidden p-0 max-h-[70dvh]">
          <SheetHeader>
            <SheetTitle>Agregar nodo</SheetTitle>
          </SheetHeader>
          <NodePalette onTap={onPaletteTap} variant="sheet" />
        </SheetContent>
      </Sheet>

      <Sheet
        open={inspectorOpen && !!selectedNodeId}
        onOpenChange={(v) => {
          setInspectorOpen(v);
          if (!v) {
            // deselect al cerrar para que no reabra al pisar otro nodo.
            useFlowStore.getState().selectNode(null);
          }
        }}
      >
        <SheetContent side="bottom" className="lg:hidden p-0 max-h-[85dvh] flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Configurar nodo</SheetTitle>
          </SheetHeader>
          <NodeInspector mode="sheet" />
        </SheetContent>
      </Sheet>

      <Sheet open={simulatorOpen} onOpenChange={openSimulator}>
        <SheetContent side="bottom" className="lg:hidden p-0 h-[85dvh]">
          <SheetHeader className="sr-only">
            <SheetTitle>Simulador</SheetTitle>
          </SheetHeader>
          <FlowSimulator onClose={() => openSimulator(false)} noHeader />
        </SheetContent>
      </Sheet>
    </div>
  );
}
