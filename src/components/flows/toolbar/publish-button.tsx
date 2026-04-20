"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Rocket, History, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { publishFlow, rollbackFlow } from "@/app/actions/flows";
import { useFlowStore } from "../state/use-flow-store";

export type FlowVersion = {
  id: string;
  version: number;
  note: string | null;
  publishedAt: string;
};

export function PublishButton({
  versions,
  publishedVersionId,
}: {
  versions: FlowVersion[];
  publishedVersionId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const flowId = useFlowStore((s) => s.flowId);
  const dirty = useFlowStore((s) => s.dirty);
  const sync = useFlowStore((s) => s.sync);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  const latestVer = versions[0] ?? null;
  const publishedDiff = useMemo(() => {
    if (!latestVer) return { added: nodes.length, removed: 0, modified: 0 };
    // El cliente no tiene el contenido de la versión — para simplicidad
    // mostramos conteo actual y, si hay publicación previa, un resumen.
    return { added: nodes.length, removed: 0, modified: 0 };
  }, [latestVer, nodes.length]);

  function onPublish() {
    if (sync.kind === "saving") {
      toast.info("Esperá que termine de guardar…");
      return;
    }
    startTransition(async () => {
      const res = await publishFlow({ flowId, note: note.trim() || undefined });
      if (res.ok) {
        toast.success(`Publicado como v${res.version}`);
        setOpen(false);
        setNote("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function onRollback(toVersion: number) {
    if (!confirm(`¿Volver a la versión v${toVersion}? Los cambios no publicados se pierden.`)) return;
    startTransition(async () => {
      const res = await rollbackFlow({ flowId, toVersion });
      if (res.ok) {
        toast.success(`Restaurado a v${toVersion}`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="inline-flex items-stretch">
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending || nodes.length === 0}
        className="gap-1.5 rounded-r-none"
      >
        <Rocket className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Publicar</span>
        {dirty && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="rounded-l-none border-l border-white/20 px-2"
            aria-label="Historial de versiones"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[260px] max-h-[400px] overflow-y-auto">
          <div className="px-2.5 py-1.5 text-xs text-fg-3 font-medium uppercase tracking-wider">
            Versiones
          </div>
          {versions.length === 0 ? (
            <div className="px-2.5 py-3 text-xs text-fg-4 italic">
              Todavía no publicaste este flujo.
            </div>
          ) : (
            versions.map((v) => {
              const isCurrent = v.id === publishedVersionId;
              return (
                <DropdownMenuItem
                  key={v.id}
                  disabled={isCurrent || isPending}
                  onSelect={() => !isCurrent && onRollback(v.version)}
                  className={cn("items-start gap-2", isCurrent && "bg-bg-2")}
                >
                  <span className="font-mono tabular-nums text-[11px] text-fg-3 mt-0.5">
                    v{v.version}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">
                      {v.note || "Sin nota"}
                    </div>
                    <div className="text-[10px] text-fg-4">
                      {new Date(v.publishedAt).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-brand-2 bg-brand/10 rounded-full px-1.5 py-0.5">
                      En vivo
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="h-4 w-4 text-brand-2" />
              Publicar flujo
            </DialogTitle>
            <DialogDescription>
              {latestVer
                ? `Vas a crear la v${latestVer.version + 1}. Los mensajes entrantes de tu bot empezarán a usar esta versión apenas publiques.`
                : "Esta es la primera publicación del flujo. Después podés activarlo para que la IA lo use en producción."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-3 bg-bg-2 rounded-xl p-3 border border-[color:var(--border)]">
              <DiffStat icon={<ArrowUp className="h-3 w-3" />} count={publishedDiff.added} label="nodos" tone="green" />
              <DiffStat icon={<Minus className="h-3 w-3" />} count={edges.length} label="enlaces" tone="neutral" />
              {publishedDiff.modified > 0 && (
                <DiffStat
                  icon={<ArrowDown className="h-3 w-3" />}
                  count={publishedDiff.modified}
                  label="modificados"
                  tone="amber"
                />
              )}
            </div>

            <label className="text-xs text-fg-3 font-medium">
              Nota de versión <span className="text-fg-4">(opcional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Agregué el flujo de pago para ventas."
              rows={3}
              maxLength={300}
              className="w-full rounded-xl bg-bg-2 border border-[color:var(--border)] p-3 text-sm text-fg focus:outline-none focus:border-brand-2 resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={onPublish} disabled={isPending} className="gap-1.5">
              <Rocket className="h-3.5 w-3.5" />
              {isPending ? "Publicando…" : latestVer ? `Publicar v${latestVer.version + 1}` : "Publicar v1"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DiffStat({
  icon,
  count,
  label,
  tone,
}: {
  icon: React.ReactNode;
  count: number;
  label: string;
  tone: "green" | "amber" | "neutral";
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          "h-5 w-5 rounded-md flex items-center justify-center",
          tone === "green" && "bg-green/15 text-green-2",
          tone === "amber" && "bg-amber/15 text-amber-2",
          tone === "neutral" && "bg-bg-3 text-fg-2",
        )}
      >
        {icon}
      </span>
      <span className="font-mono tabular-nums font-semibold">{count}</span>
      <span className="text-fg-3">{label}</span>
    </div>
  );
}
