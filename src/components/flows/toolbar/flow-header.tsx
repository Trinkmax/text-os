"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronDown, PenLine, Play, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { renameFlow, setFlowActive } from "@/app/actions/flows";
import { useFlowStore } from "../state/use-flow-store";
import { SaveIndicator } from "./save-indicator";
import { PublishButton, type FlowVersion } from "./publish-button";
import { ValidationBadge } from "../validation/validation-badge";

export function FlowHeader({
  active,
  published,
  allFlows,
  versions,
  publishedVersionId,
}: {
  active: boolean;
  published: boolean;
  allFlows: Array<{ id: string; name: string; active: boolean }>;
  versions: FlowVersion[];
  publishedVersionId: string | null;
}) {
  const router = useRouter();
  const flowId = useFlowStore((s) => s.flowId);
  const flowName = useFlowStore((s) => s.flowName);
  const sync = useFlowStore((s) => s.sync);
  const dirty = useFlowStore((s) => s.dirty);
  const simulatorOpen = useFlowStore((s) => s.simulatorOpen);
  const openSimulator = useFlowStore((s) => s.openSimulator);
  const nodeCount = useFlowStore((s) => s.nodes.length);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(flowName);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setName(flowName);
  }, [flowName]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function saveName() {
    const cleaned = name.trim();
    if (!cleaned || cleaned === flowName) {
      setEditing(false);
      setName(flowName);
      return;
    }
    startTransition(async () => {
      const res = await renameFlow({ flowId, name: cleaned });
      if (res.ok) {
        toast.success("Nombre actualizado");
        router.refresh();
      } else {
        toast.error(res.error);
        setName(flowName);
      }
      setEditing(false);
    });
  }

  function onToggleActive() {
    startTransition(async () => {
      const res = await setFlowActive({ flowId, active: !active });
      if (res.ok) {
        toast.success(active ? "Flujo pausado" : "Flujo activo");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <header className="px-3 md:px-6 py-2.5 md:py-3 border-b border-[color:var(--border)] flex items-center gap-2 md:gap-3 bg-bg-0/60 backdrop-blur-sm z-20">
      <Link
        href="/flujos"
        className="h-9 w-9 -ml-1 flex items-center justify-center rounded-lg text-fg-3 hover:text-fg hover:bg-bg-2 transition-colors"
        aria-label="Volver a Flujos"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="flex items-center gap-1.5 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setName(flowName);
                setEditing(false);
              }
            }}
            disabled={isPending}
            className="h-8 px-2 text-sm md:text-base font-semibold bg-bg-2 rounded-lg border border-brand-2 focus:outline-none focus:ring-2 focus:ring-brand-2/30 min-w-0 max-w-[220px] md:max-w-[360px]"
            maxLength={80}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 h-8 px-2 rounded-lg text-sm md:text-base font-semibold text-fg hover:bg-bg-2 transition-colors min-w-0 group"
          >
            <span className="truncate max-w-[180px] md:max-w-[280px]">{flowName}</span>
            <PenLine className="h-3.5 w-3.5 text-fg-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}

        {allFlows.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-lg text-fg-3 hover:text-fg hover:bg-bg-2 transition-colors"
                aria-label="Cambiar de flujo"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[60vh] overflow-y-auto">
              {allFlows.map((f) => (
                <DropdownMenuItem
                  key={f.id}
                  onSelect={() => router.push(`/flujos/${f.id}`)}
                  className={cn(f.id === flowId && "bg-bg-2 text-fg")}
                >
                  {f.id === flowId ? (
                    <Check className="h-3.5 w-3.5 text-brand-2" />
                  ) : (
                    <span className="w-3.5" />
                  )}
                  <span className="truncate flex-1">{f.name}</span>
                  {f.active && <span className="h-1.5 w-1.5 rounded-full bg-brand-2" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/flujos/nuevo")}>
                <span className="w-3.5" />
                <span className="text-brand-2">+ Nuevo flujo</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="hidden md:flex items-center gap-1.5 ml-2">
        <SaveIndicator status={sync} dirty={dirty} />
        <ValidationBadge />
        {active && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-2 bg-brand/10 border border-brand/25 rounded-full px-2 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-2 shadow-[0_0_8px_var(--brand-2)] animate-pulse" />
            En vivo
          </span>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleActive}
          disabled={isPending || !published}
          title={!published ? "Publicá el flujo antes de activarlo" : undefined}
          className="hidden lg:inline-flex"
        >
          {active ? (
            <>
              <PowerOff className="h-3.5 w-3.5" /> Pausar
            </>
          ) : (
            <>
              <Power className="h-3.5 w-3.5" /> Activar
            </>
          )}
        </Button>
        <Button
          variant={simulatorOpen ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => openSimulator(!simulatorOpen)}
          disabled={nodeCount === 0}
        >
          <Play className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{simulatorOpen ? "Cerrar" : "Probar"}</span>
        </Button>
        <PublishButton versions={versions} publishedVersionId={publishedVersionId} />
      </div>
    </header>
  );
}
