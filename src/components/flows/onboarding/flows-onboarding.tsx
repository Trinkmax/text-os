"use client";

// Onboarding coach marks para nuevos usuarios del módulo Flujos.
// Paso a paso con TexTip, persistido en localStorage para no reaparecer.

import { TexTip } from "@/components/tex";
import { useFlowStore } from "../state/use-flow-store";

export function FlowsOnboarding() {
  const nodes = useFlowStore((s) => s.nodes);
  const dirty = useFlowStore((s) => s.dirty);

  // Paso 1: al abrir el editor por primera vez.
  if (nodes.length <= 1) {
    return (
      <div className="hidden md:block absolute top-4 left-[260px] z-20 max-w-xs pointer-events-none">
        <div className="pointer-events-auto">
          <TexTip
            id="flows-editor-intro"
            variant="default"
            tone="info"
            message={
              <span className="text-[12px] leading-snug">
                Arrastrá un nodo desde la izquierda al canvas. Los nodos se conectan uniendo los
                puntitos de los costados.
              </span>
            }
          />
        </div>
      </div>
    );
  }

  // Paso 2: cuando hay nodos pero ningún edge.
  if (nodes.length >= 2 && useFlowStore.getState().edges.length === 0) {
    return (
      <div className="hidden md:block absolute top-4 left-[260px] z-20 max-w-xs">
        <TexTip
          id="flows-editor-connect"
          variant="default"
          tone="info"
          message={
            <span className="text-[12px] leading-snug">
              Genial, ya tenés nodos. Ahora uní los puntitos: hacé drag desde el circulito derecho
              de un nodo al circulito izquierdo de otro.
            </span>
          }
        />
      </div>
    );
  }

  // Paso 3: cuando ya hay flujo construido pero no probó.
  if (nodes.length >= 3 && dirty) {
    return (
      <div className="hidden md:block absolute bottom-20 right-[380px] z-20 max-w-xs">
        <TexTip
          id="flows-editor-test"
          variant="default"
          tone="celebrate"
          message={
            <span className="text-[12px] leading-snug">
              Bueno, está tomando forma. Probá cómo responde abriendo el simulador (botón ▶).
            </span>
          }
        />
      </div>
    );
  }

  return null;
}
