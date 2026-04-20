"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { Copy, MoreVertical, Play, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TexEmpty, TEX_COPY } from "@/components/tex";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { archiveFlow, duplicateFlow, setFlowActive } from "@/app/actions/flows";

export type FlowListItem = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  published: boolean;
  version: number;
  nodeCount: number;
  edgeCount: number;
  updatedAt: string;
};

export function FlowsList({ flows }: { flows: FlowListItem[] }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 h-full overflow-hidden">
      <header className="px-4 md:px-6 py-3 md:py-4 border-b border-[color:var(--border)] flex items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Flujos</h1>
          <p className="text-xs text-fg-3 hidden sm:block">
            Automatizá conversaciones con lógica visual. Uno solo puede estar activo por vez.
          </p>
        </div>
        <div className="flex-1" />
        <Link href="/flujos/nuevo">
          <Button className="gap-2" size="md">
            <Plus className="h-4 w-4" />
            <span>Nuevo flujo</span>
          </Button>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {flows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            {flows.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
              >
                <FlowCard flow={f} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[420px] gap-6">
      <TexEmpty
        variant="default"
        size="xl"
        message={<span>{TEX_COPY.empty.noFlows}</span>}
      />
      <Link href="/flujos/nuevo">
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Crear mi primer flujo
        </Button>
      </Link>
    </div>
  );
}

function FlowCard({ flow }: { flow: FlowListItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function onDuplicate() {
    startTransition(async () => {
      const res = await duplicateFlow(flow.id);
      if (res.ok) {
        toast.success("Flujo duplicado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onArchive() {
    if (!confirm(`¿Archivar "${flow.name}"? Podés recuperarlo después.`)) return;
    startTransition(async () => {
      const res = await archiveFlow(flow.id);
      if (res.ok) {
        toast.success("Flujo archivado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onToggleActive() {
    startTransition(async () => {
      const res = await setFlowActive({ flowId: flow.id, active: !flow.active });
      if (res.ok) {
        toast.success(flow.active ? "Flujo pausado" : "Flujo activo");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-bg-1 p-5 transition-all hover:border-[color:var(--border-strong)] hover:bg-bg-2",
        flow.active
          ? "border-[rgba(139,92,246,0.35)] shadow-[0_0_32px_rgba(139,92,246,0.15)]"
          : "border-[color:var(--border)]",
      )}
    >
      {flow.active && (
        <div className="absolute -top-px -left-px -right-px h-1 rounded-t-2xl bg-gradient-to-r from-brand to-brand-2" />
      )}

      <div className="flex items-start gap-2 mb-3">
        <Link href={`/flujos/${flow.id}`} className="flex-1 min-w-0">
          <h3 className="font-semibold text-fg truncate group-hover:text-brand-2 transition-colors">
            {flow.name}
          </h3>
          {flow.description && (
            <p className="text-xs text-fg-3 line-clamp-2 mt-0.5">{flow.description}</p>
          )}
        </Link>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 flex items-center justify-center rounded-lg text-fg-3 hover:text-fg hover:bg-bg-3 transition-colors"
              aria-label="Más opciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => router.push(`/flujos/${flow.id}`)}>
              <Play className="h-4 w-4" /> Abrir editor
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDuplicate} disabled={isPending}>
              <Copy className="h-4 w-4" /> Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggleActive} disabled={isPending || !flow.published}>
              {flow.active ? (
                <>
                  <PowerOff className="h-4 w-4" /> Pausar
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" /> Activar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onArchive} disabled={isPending} className="text-red-2">
              <Trash2 className="h-4 w-4" /> Archivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Link href={`/flujos/${flow.id}`} className="block">
        <div className="flex items-center gap-2 mb-3">
          <Badge tone={flow.active ? "brand" : flow.published ? "ok" : "neutral"}>
            {flow.active ? "Activo" : flow.published ? "Publicado" : "Borrador"}
          </Badge>
          <span className="text-[11px] font-mono tabular-nums text-fg-4">v{flow.version}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-fg-3">
          <div className="flex items-center gap-3">
            <span>
              <span className="font-mono tabular-nums text-fg-2">{flow.nodeCount}</span> nodos
            </span>
            <span>
              <span className="font-mono tabular-nums text-fg-2">{flow.edgeCount}</span> enlaces
            </span>
          </div>
          <RelativeTime iso={flow.updatedAt} />
        </div>
      </Link>
    </div>
  );
}

function Badge({ tone, children }: { tone: "brand" | "ok" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "brand" && "bg-brand/15 text-brand-2 border border-brand/25",
        tone === "ok" && "bg-green/10 text-green-2 border border-green/20",
        tone === "neutral" && "bg-bg-3 text-fg-3 border border-[color:var(--border)]",
      )}
    >
      {children}
    </span>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  const txt =
    mins < 1
      ? "ahora"
      : mins < 60
        ? `hace ${mins}m`
        : mins < 60 * 24
          ? `hace ${Math.round(mins / 60)}h`
          : `hace ${Math.round(mins / (60 * 24))}d`;
  return <span>{txt}</span>;
}
