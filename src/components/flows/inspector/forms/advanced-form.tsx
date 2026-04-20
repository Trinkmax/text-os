"use client";

import { Textarea } from "@/components/ui/textarea";
import { useFlowStore } from "../../state/use-flow-store";
import type { FlowNode } from "../../types/flow";
import { FieldLabel, FormStack, Hint } from "./content-form";

// Tab "Avanzado": notas internas, ID copiable.

export function NodeAdvancedForm({ node }: { node: FlowNode }) {
  const updateNode = useFlowStore((s) => s.updateNode);

  return (
    <FormStack>
      <FieldLabel>Notas internas</FieldLabel>
      <Textarea
        value={node.notes ?? ""}
        onChange={(e) => updateNode(node.id, { notes: e.target.value })}
        rows={5}
        className="p-3 text-sm"
        placeholder="Documentá por qué existe este nodo, cambios pendientes, etc. No se ve en las respuestas."
      />

      <div className="mt-4 rounded-xl bg-bg-2/50 border border-[color:var(--border)] p-3 flex flex-col gap-2">
        <div className="text-[11px] text-fg-4 uppercase tracking-wider font-medium">ID</div>
        <code className="text-xs font-mono text-fg-2 break-all">{node.id}</code>
        <div className="text-[11px] text-fg-4 uppercase tracking-wider font-medium mt-1">Tipo</div>
        <code className="text-xs font-mono text-fg-2">{node.type}</code>
        <div className="text-[11px] text-fg-4 uppercase tracking-wider font-medium mt-1">Posición</div>
        <code className="text-xs font-mono text-fg-2">
          ({Math.round(node.x)}, {Math.round(node.y)})
        </code>
      </div>

      <Hint>Este panel es solo para referencia — lo técnico vive acá para no ensuciar la edición.</Hint>
    </FormStack>
  );
}
