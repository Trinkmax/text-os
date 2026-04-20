"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FlowCanvas } from "./canvas/flow-canvas";
import { FlowHeader } from "./toolbar/flow-header";
import { NodePalette } from "./palette/node-palette";
import { NodeInspector } from "./inspector/node-inspector";
import { FlowSimulator } from "./simulator/flow-simulator";
import { FlowsOnboarding } from "./onboarding/flows-onboarding";
import { FlowsCommandPalette } from "./command-palette-flows";
import { useFlowStore } from "./state/use-flow-store";
import { useAutosave } from "./state/use-autosave";
import { useFlowKeyboard } from "./state/use-keyboard";
import { useIsTablet } from "@/lib/use-media";
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

export function FlowEditor(props: FlowEditorProps) {
  return <FlowEditorInner {...props} />;
}

function FlowEditorInner({ flow, versions, allFlows }: FlowEditorProps) {
  const init = useFlowStore((s) => s.init);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const simulatorOpen = useFlowStore((s) => s.simulatorOpen);
  const openSimulator = useFlowStore((s) => s.openSimulator);
  const addNode = useFlowStore((s) => s.addNode);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  // Breakpoint guard: los Sheets de mobile sólo se abren cuando realmente
  // estamos en viewport tablet/mobile. En desktop el inspector flotante y el
  // simulador flotante hacen su trabajo — evitamos que el overlay del Sheet
  // (bg-black/70) oscurezca toda la pantalla en desktop.
  const isTablet = useIsTablet();

  // Hidratamos el store con los datos cargados del Server Component.
  // ÚNICAMENTE cuando cambia el flowId. Si las demás props cambian (ej: el
  // Server Component re-rendea tras un revalidatePath), no queremos resetear
  // el store y perder cambios en vuelo — el cliente ya tiene la verdad
  // a través del autosave y el markSaved(updatedAt).
  const currentFlowId = useFlowStore((s) => s.flowId);
  useEffect(() => {
    if (currentFlowId === flow.id) return;
    init({
      flowId: flow.id,
      flowName: flow.name,
      flowVersion: flow.version,
      publishedVersionId: flow.publishedVersionId,
      baseUpdatedAt: flow.updatedAt,
      graph: flow.graph,
    });
  }, [flow.id, flow.name, flow.version, flow.publishedVersionId, flow.updatedAt, flow.graph, init, currentFlowId]);

  useAutosave();
  useFlowKeyboard();

  // Abre el dialog/sheet del inspector cuando cambia la selección.
  useEffect(() => {
    if (selectedNodeId) setInspectorOpen(true);
    else setInspectorOpen(false);
  }, [selectedNodeId]);

  function onPaletteTap(type: NodeType) {
    addNode(type, { x: 300, y: 220 });
    setPaletteOpen(false);
  }

  const showInspectorDialog = !!selectedNodeId && inspectorOpen && !simulatorOpen && !isTablet;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <FlowHeader
        active={flow.active}
        published={!!flow.publishedVersionId}
        allFlows={allFlows}
        versions={versions}
        publishedVersionId={flow.publishedVersionId}
      />

      {/* Main body: palette rail (desktop) | canvas full width | overlays */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Palette rail: desktop inline colapsable */}
        <div className="hidden md:flex">
          <NodePalette onTap={onPaletteTap} />
        </div>

        {/* Canvas ocupa TODO el resto. z-0 para que quede debajo del toggle
            flotante de la paleta que sobresale por el borde. */}
        <div className="flex-1 min-w-0 relative z-0">
          <FlowCanvas />
          <FlowsOnboarding />
          <FlowsCommandPalette />

          {/* Mobile: FAB para abrir palette */}
          <Button
            variant="primary"
            size="icon"
            className="md:hidden absolute bottom-4 right-4 z-10 rounded-full h-12 w-12 shadow-[var(--shadow-hover)]"
            onClick={() => setPaletteOpen(true)}
            aria-label="Agregar nodo"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Simulator overlay flotante a la derecha — desktop */}
        <AnimatePresence>
          {simulatorOpen && !isTablet && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="absolute top-3 right-3 bottom-3 w-[380px] z-30 rounded-2xl border border-[color:var(--border)] bg-bg-1/95 backdrop-blur-md shadow-[var(--shadow-hover)] overflow-hidden flex"
            >
              <FlowSimulator onClose={() => openSimulator(false)} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Inspector como Dialog modal centrado (desktop). Se cierra con ESC,
          click afuera, o el botón X. Al cerrar, deseleccionamos el nodo. */}
      <Dialog
        open={showInspectorDialog}
        onOpenChange={(v) => {
          if (!v) {
            setInspectorOpen(false);
            useFlowStore.getState().selectNode(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] sm:w-[92vw] sm:max-h-[82dvh] p-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">Configurar nodo</DialogTitle>
          <NodeInspector mode="dialog" />
        </DialogContent>
      </Dialog>

      {/* Mobile sheets — solo se montan realmente en viewport tablet/mobile.
          En desktop el overlay flotante hace su trabajo y NO queremos que el
          overlay del Sheet (bg-black/70) oscurezca la pantalla. */}
      {isTablet && (
        <>
          <Sheet open={paletteOpen} onOpenChange={setPaletteOpen}>
            <SheetContent side="bottom" className="p-0 max-h-[70dvh]">
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
              if (!v) useFlowStore.getState().selectNode(null);
            }}
          >
            <SheetContent side="bottom" className="p-0 max-h-[85dvh] flex flex-col">
              <SheetHeader className="sr-only">
                <SheetTitle>Configurar nodo</SheetTitle>
              </SheetHeader>
              <NodeInspector mode="sheet" />
            </SheetContent>
          </Sheet>

          <Sheet open={simulatorOpen} onOpenChange={openSimulator}>
            <SheetContent side="bottom" className="p-0 h-[85dvh]">
              <SheetHeader className="sr-only">
                <SheetTitle>Simulador</SheetTitle>
              </SheetHeader>
              <FlowSimulator onClose={() => openSimulator(false)} noHeader />
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
