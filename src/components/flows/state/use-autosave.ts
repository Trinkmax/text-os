"use client";

// Hook de autosave: observa `dirty` del store y dispara updateFlowGraph con
// debounce. Lee SIEMPRE el estado fresco del store dentro de doSave (no del
// closure) — clave para no mandar `baseUpdatedAt` stale después de un save
// exitoso, lo que dispararía un falso conflict en el siguiente save.

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useFlowStore } from "./use-flow-store";
import { updateFlowGraph } from "@/app/actions/flows";

const DEBOUNCE_MS = 800;

export function useAutosave() {
  const dirty = useFlowStore((s) => s.dirty);
  const flowId = useFlowStore((s) => s.flowId);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingWhileFlightRef = useRef(false);

  useEffect(() => {
    if (!dirty || !flowId) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void doSave();
    }, DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [dirty, flowId]);

  async function doSave(): Promise<void> {
    if (inFlightRef.current) {
      pendingWhileFlightRef.current = true;
      return;
    }

    // SIEMPRE leemos del store justo antes de mandar — así el baseUpdatedAt
    // y el graph son los más recientes que tenemos. Si después de un save
    // exitoso hay otro cambio, el próximo save tomará el baseUpdatedAt nuevo
    // que markSaved() escribió.
    const snapshot = useFlowStore.getState();
    if (!snapshot.dirty || !snapshot.flowId) return;

    inFlightRef.current = true;
    useFlowStore.getState().markSaving();

    try {
      const res = await updateFlowGraph({
        flowId: snapshot.flowId,
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        viewport: snapshot.viewport,
        baseUpdatedAt: snapshot.baseUpdatedAt ?? undefined,
      });
      if (res.ok) {
        useFlowStore.getState().markSaved(res.updatedAt);
      } else if (res.conflict) {
        useFlowStore.getState().markConflict();
        toast.error("El flujo cambió en otra pestaña. Recargá para no perder datos.");
      } else {
        useFlowStore.getState().markError(res.error);
        toast.error(`No se pudo guardar: ${res.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de red";
      useFlowStore.getState().markError(msg);
    } finally {
      inFlightRef.current = false;
      if (pendingWhileFlightRef.current) {
        pendingWhileFlightRef.current = false;
        await doSave();
      }
    }
  }
}
