"use client";

import { useMemo } from "react";
import { useFlowStore } from "../state/use-flow-store";
import { validateGraph } from "./validators";

export function useFlowValidation() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  return useMemo(() => validateGraph({ nodes, edges }), [nodes, edges]);
}
