"use client";

// Hook de autosave: observa cambios relevantes en el store y dispara
// updateFlowGraph con debounce. Se encarga de:
//   - saltar el primer render (para no guardar el estado inicial).
//   - debounce 800ms.
//   - no ejecutar si ya está guardando (otro save en curso).
//   - manejar conflict / error → actualizar sync status.

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFlowStore } from "./use-flow-store";
import { updateFlowGraph } from "@/app/actions/flows";

const DEBOUNCE_MS = 800;

export function useAutosave() {
  const flowId = useFlowStore((s) => s.flowId);
  const dirty = useFlowStore((s) => s.dirty);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const viewport = useFlowStore((s) => s.viewport);
  const baseUpdatedAt = useFlowStore((s) => s.baseUpdatedAt);
  const markSaving = useFlowStore((s) => s.markSaving);
  const markSaved = useFlowStore((s) => s.markSaved);
  const markError = useFlowStore((s) => s.markError);
  const markConflict = useFlowStore((s) => s.markConflict);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingWhileFlightRef = useRef(false);

  useEffect(() => {
    if (!dirty || !flowId) return;

    // Limpia cualquier save programado.
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      void doSave();
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, nodes, edges, viewport, flowId]);

  async function doSave() {
    if (inFlightRef.current) {
      // Si ya hay un save en curso, marcamos que hay que re-save cuando termine.
      pendingWhileFlightRef.current = true;
      return;
    }
    inFlightRef.current = true;
    markSaving();
    try {
      const res = await updateFlowGraph({
        flowId,
        nodes,
        edges,
        viewport,
        baseUpdatedAt: baseUpdatedAt ?? undefined,
      });
      if (res.ok) {
        markSaved(res.updatedAt);
      } else if (res.conflict) {
        markConflict();
        toast.error("El flujo cambió en otra pestaña. Recargá la página para no perder datos.");
      } else {
        markError(res.error);
        toast.error(`No se pudo guardar: ${res.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de red";
      markError(msg);
    } finally {
      inFlightRef.current = false;
      if (pendingWhileFlightRef.current) {
        pendingWhileFlightRef.current = false;
        // Re-intento con el último estado (sin debounce adicional).
        await doSave();
      }
    }
  }
}
