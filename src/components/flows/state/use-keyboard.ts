"use client";

// Atajos de teclado del editor. Se registran a nivel document pero sólo
// si el target no es un input/textarea/contenteditable.

import { useEffect } from "react";
import { useFlowStore } from "./use-flow-store";

export function useFlowKeyboard() {
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const deleteEdge = useFlowStore((s) => s.deleteEdge);
  const duplicateNode = useFlowStore((s) => s.duplicateNode);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const selectedEdgeId = useFlowStore((s) => s.selectedEdgeId);
  const openSimulator = useFlowStore((s) => s.openSimulator);
  const simulatorOpen = useFlowStore((s) => s.simulatorOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isEditable(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;

      // Undo / Redo
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Duplicate
      if (mod && e.key.toLowerCase() === "d") {
        if (selectedNodeId) {
          e.preventDefault();
          duplicateNode(selectedNodeId);
        }
        return;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNodeId) {
          e.preventDefault();
          deleteNode(selectedNodeId);
          return;
        }
        if (selectedEdgeId) {
          e.preventDefault();
          deleteEdge(selectedEdgeId);
          return;
        }
      }

      // Toggle simulator: ⌘ Enter
      if (mod && e.key === "Enter") {
        e.preventDefault();
        openSimulator(!simulatorOpen);
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    undo,
    redo,
    deleteNode,
    deleteEdge,
    duplicateNode,
    selectedNodeId,
    selectedEdgeId,
    openSimulator,
    simulatorOpen,
  ]);
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}
