"use client";

import { Info, Settings2, Trash2, Copy as CopyIcon, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFlowStore } from "../state/use-flow-store";
import { NODE_REGISTRY } from "../types/registry";
import type { FlowNode } from "../types/flow";
import { NodeContentForm } from "./forms/content-form";
import { NodeLogicForm } from "./forms/logic-form";
import { NodeDataForm } from "./forms/data-form";
import { NodeAdvancedForm } from "./forms/advanced-form";

export function NodeInspector({ mode = "sidebar" }: { mode?: "sidebar" | "sheet" | "overlay" }) {
  const node = useFlowStore((s) => {
    const id = s.selectedNodeId;
    return id ? s.nodes.find((n) => n.id === id) ?? null : null;
  });
  const updateNode = useFlowStore((s) => s.updateNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const duplicateNode = useFlowStore((s) => s.duplicateNode);
  const selectNode = useFlowStore((s) => s.selectNode);

  if (!node) {
    return (
      <div
        className={cn(
          "flex flex-col h-full overflow-hidden",
          mode === "sidebar" && "w-[340px] border-l border-[color:var(--border)] bg-bg-1",
          mode === "overlay" && "w-full",
        )}
      >
        <EmptyInspector />
      </div>
    );
  }

  const entry = NODE_REGISTRY[node.type];
  const Icon = entry.icon;

  return (
    <div
      className={cn(
        "flex flex-col h-full overflow-hidden",
        mode === "sidebar" && "w-[340px] border-l border-[color:var(--border)] bg-bg-1",
        mode === "overlay" && "w-full",
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-lg bg-bg-2 border border-[color:var(--border)] flex items-center justify-center text-fg-2">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-fg-4 font-medium">
            {entry.shortLabel}
          </div>
          <span className={cn("h-1.5 w-1.5 rounded-full", `dot-${node.semaphore}`)} />
          {mode === "overlay" && (
            <button
              type="button"
              onClick={() => selectNode(null)}
              className="ml-auto h-7 w-7 flex items-center justify-center rounded-lg text-fg-4 hover:text-fg hover:bg-bg-2 transition-colors"
              aria-label="Cerrar inspector"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Input
          value={node.title}
          onChange={(e) => updateNode(node.id, { title: e.target.value })}
          className="h-9 px-2.5 text-sm font-semibold bg-transparent border-transparent hover:bg-bg-2 focus:bg-bg-2 focus:border-brand-2"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-3">
          <TabsList className="w-full grid grid-cols-4 h-8">
            <TabsTrigger value="content" className="text-[11px] px-2">
              Contenido
            </TabsTrigger>
            <TabsTrigger value="logic" className="text-[11px] px-2">
              Lógica
            </TabsTrigger>
            <TabsTrigger value="data" className="text-[11px] px-2">
              Datos
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-[11px] px-2">
              Avanzado
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 mt-3">
          <TabsContent value="content" className="mt-0 pt-0">
            <NodeContentForm node={node} />
          </TabsContent>
          <TabsContent value="logic" className="mt-0 pt-0">
            <NodeLogicForm node={node} />
          </TabsContent>
          <TabsContent value="data" className="mt-0 pt-0">
            <NodeDataForm node={node} />
          </TabsContent>
          <TabsContent value="advanced" className="mt-0 pt-0">
            <NodeAdvancedForm node={node} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[color:var(--border)] flex items-center gap-2">
        <div className="text-[10px] text-fg-4 font-mono uppercase tracking-wider flex-1 truncate">
          {node.id}
        </div>
        {node.type !== "start" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => duplicateNode(node.id)}
            title="Duplicar nodo"
          >
            <CopyIcon className="h-3.5 w-3.5" />
          </Button>
        )}
        {node.type !== "start" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (confirm(`¿Borrar "${node.title}"?`)) deleteNode(node.id);
            }}
            className="text-red-2 hover:text-red"
            title="Borrar nodo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
      <div className="h-12 w-12 rounded-2xl bg-bg-2 border border-[color:var(--border)] flex items-center justify-center text-fg-3">
        <Settings2 className="h-5 w-5" />
      </div>
      <div className="text-sm font-medium text-fg-2">Seleccioná un nodo</div>
      <div className="text-xs text-fg-4 max-w-[220px]">
        Hacé click en un nodo del canvas para editar su configuración, o arrastrá uno nuevo desde la paleta.
      </div>
      <div className="mt-2 flex flex-wrap gap-1 justify-center">
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium bg-bg-2 text-fg-3 border border-[color:var(--border)]">
          <kbd>⌘</kbd> <kbd>Z</kbd> deshacer
        </span>
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium bg-bg-2 text-fg-3 border border-[color:var(--border)]">
          <kbd>Del</kbd> borrar
        </span>
      </div>
      <div className="mt-3 flex items-start gap-2 text-[11px] text-fg-4 bg-bg-2/50 rounded-lg p-2.5 max-w-[260px]">
        <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Arrastrá de puerto a puerto para conectar nodos. Click en el enlace + <kbd>Del</kbd> para borrar.
        </span>
      </div>
    </div>
  );
}

// Marcamos el FlowNode unused export para evitar warning.
void ({} as FlowNode);
