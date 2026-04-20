"use client";

import { useFlowStore } from "../../state/use-flow-store";
import type { FlowNode } from "../../types/flow";
import { FieldLabel, FormStack, Hint } from "./content-form";
import { Input } from "@/components/ui/input";

// Tab "Datos": variables que este nodo lee/escribe.
// Para la mayoría de tipos, es solo lectura (inferido). Para `datos` y `calif`,
// el usuario elige el nombre de la variable.

export function NodeDataForm({ node }: { node: FlowNode }) {
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);

  const writes: string[] = [];
  const reads: string[] = [];

  switch (node.type) {
    case "datos":
      writes.push(node.config.variable);
      break;
    case "calif":
      writes.push(node.config.writeToVariable);
      writes.push(`${node.config.writeToVariable}__answers`);
      break;
    case "pagar":
      if (node.config.amount === "variable") reads.push(node.config.amountVariable);
      break;
    case "saludo":
    case "derivar":
    case "cerrar":
    case "agendar":
      reads.push("(template usa {{variable.x}})");
      break;
    case "faq":
    case "condition":
    case "start":
      break;
  }

  return (
    <FormStack>
      <FieldLabel>Escribe</FieldLabel>
      {writes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {writes.map((v) => (
            <VarChip key={v} variable={v} />
          ))}
        </div>
      ) : (
        <Empty />
      )}

      {node.type === "calif" && (
        <>
          <FieldLabel className="mt-3">Variable donde se guarda el resumen</FieldLabel>
          <Input
            value={node.config.writeToVariable}
            onChange={(e) =>
              updateNodeConfig<"calif">(node.id, {
                writeToVariable: e.target.value.trim().replace(/\s+/g, "_") || "calificacion",
              })
            }
          />
        </>
      )}

      <FieldLabel className="mt-4">Lee</FieldLabel>
      {reads.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {reads.map((v) => (
            <VarChip key={v} variable={v} tone="read" />
          ))}
        </div>
      ) : (
        <Empty />
      )}

      <Hint>
        Las variables se guardan en <code>contacto.custom</code> — podés leerlas en cualquier otro
        nodo con <code>{"{{variable.nombre}}"}</code>.
      </Hint>
    </FormStack>
  );
}

function VarChip({ variable, tone = "write" }: { variable: string; tone?: "write" | "read" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono border ${
        tone === "write"
          ? "bg-green/10 text-green-2 border-green/25"
          : "bg-blue/10 text-[color:var(--accent-blue)] border-[rgba(59,130,246,0.3)]"
      }`}
    >
      <span className="text-[9px] font-sans not-italic uppercase tracking-wider opacity-70">
        {tone === "write" ? "escribe" : "lee"}
      </span>
      {variable}
    </span>
  );
}

function Empty() {
  return <div className="text-[11px] text-fg-4 italic">Ninguna por ahora.</div>;
}
