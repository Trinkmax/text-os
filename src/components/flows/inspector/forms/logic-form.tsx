"use client";

import { cn } from "@/lib/utils";
import { useFlowStore } from "../../state/use-flow-store";
import type { FlowNode, Semaphore } from "../../types/flow";
import { FormStack, FieldLabel, Hint } from "./content-form";

// Tab "Lógica": configuración transversal a cualquier tipo.
// - Semáforo máximo: qué tanto puede auto-responder este paso.
// - Disabled: flag para saltarlo sin borrarlo.

const SEMAPHORE_META: Record<Semaphore, { label: string; description: string }> = {
  green: { label: "Auto", description: "La IA puede auto-responder si está segura." },
  amber: { label: "Sugerir", description: "La IA propone y vos aprobás." },
  red: { label: "Humano", description: "Siempre responde un humano." },
};

export function NodeLogicForm({ node }: { node: FlowNode }) {
  const updateNode = useFlowStore((s) => s.updateNode);

  return (
    <FormStack>
      <FieldLabel>Semáforo máximo</FieldLabel>
      <div className="flex flex-col gap-1.5">
        {(["green", "amber", "red"] as const).map((s) => {
          const meta = SEMAPHORE_META[s];
          const active = node.semaphore === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => updateNode(node.id, { semaphore: s })}
              className={cn(
                "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                active
                  ? "border-[color:var(--border-strong)] bg-bg-2"
                  : "border-[color:var(--border)] bg-bg-1 hover:bg-bg-2",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", `dot-${s}`)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-fg">{meta.label}</div>
                <div className="text-[11px] text-fg-3 leading-snug">{meta.description}</div>
              </div>
              {active && (
                <span className="text-[10px] font-medium text-brand-2 bg-brand/15 border border-brand/25 rounded-full px-2 py-0.5">
                  Seleccionado
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-[color:var(--border)]">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={node.disabled === true}
            onChange={(e) => updateNode(node.id, { disabled: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-[color:var(--border)] bg-bg-2 accent-brand-2"
          />
          <div>
            <div className="text-sm font-medium text-fg">Desactivar este nodo</div>
            <div className="text-[11px] text-fg-3 leading-snug">
              El flujo lo salta y avanza al siguiente. Útil para probar sin borrar.
            </div>
          </div>
        </label>
      </div>

      <Hint>
        El semáforo del nodo limita cuánto puede la IA actuar por su cuenta. Los umbrales generales
        se ajustan en Ajustes → IA.
      </Hint>
    </FormStack>
  );
}
