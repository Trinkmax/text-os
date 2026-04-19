"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Gauge,
  Info,
  KeyRound,
  MoreHorizontal,
  Plug,
  Plus,
  Power,
  Sparkles,
  Star,
  Trash2,
  Zap,
  Clock,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TexTip, TEX_COPY } from "@/components/tex";
import { cn, formatRelative } from "@/lib/utils";
import { PROVIDER_BY_ID, ROLE_META, type Role } from "@/lib/ai/registry";
import {
  deleteAiProvider,
  setDefaultAiProvider,
  testAiProvider,
  toggleAiProviderActive,
  type SafeAiProvider,
} from "@/app/actions/ai";
import { saveAiSettings } from "@/app/actions/settings";
import { AiProviderDialog } from "./ai-provider-dialog";

type Org = {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  timezone: string;
  tone: string;
  threshold_auto: number;
  threshold_suggest: number;
  shadow_mode: boolean;
  never_promise: string[];
  must_escalate: string[];
};

export function AiSection({
  org,
  providers,
}: {
  org: Org;
  providers: SafeAiProvider[];
}) {
  const [tab, setTab] = useState<"connections" | "behavior">("connections");

  return (
    <div>
      <header className="mb-6">
        <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-brand-2" />
          Inteligencia artificial
        </h2>
        <p className="text-fg-3 text-sm">
          Conectá los modelos que van a responder por vos y ajustá cómo de autónoma querés
          que sea la IA.
        </p>
      </header>

      <div className="mb-6 inline-flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-bg-1 p-1">
        <TabButton active={tab === "connections"} onClick={() => setTab("connections")}>
          <Plug className="h-3.5 w-3.5" /> Conexiones
          {providers.length > 0 && (
            <span className="ml-1.5 text-[10px] font-mono text-fg-4">{providers.length}</span>
          )}
        </TabButton>
        <TabButton active={tab === "behavior"} onClick={() => setTab("behavior")}>
          <Gauge className="h-3.5 w-3.5" /> Comportamiento
        </TabButton>
      </div>

      {tab === "connections" ? (
        <ConnectionsView providers={providers} />
      ) : (
        <BehaviorView org={org} />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Connections tab
// -----------------------------------------------------------------------------
function ConnectionsView({ providers }: { providers: SafeAiProvider[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SafeAiProvider | null>(null);
  const [initialRole, setInitialRole] = useState<Role>("generation");

  const byRole: Record<Role, SafeAiProvider[]> = {
    generation: providers.filter((p) => p.role === "generation"),
    classification: providers.filter((p) => p.role === "classification"),
    embedding: providers.filter((p) => p.role === "embedding"),
  };

  const totalConnected = providers.length;

  function openConnect(role: Role) {
    setEditing(null);
    setInitialRole(role);
    setDialogOpen(true);
  }

  function openEdit(p: SafeAiProvider) {
    setEditing(p);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {totalConnected === 0 ? (
        <EmptyState onConnect={() => openConnect("generation")} />
      ) : (
        <>
          <div className="mb-2">
            <TexTip
              id="ai-providers-intro"
              variant="analytics"
              tone="info"
              message={
                <span className="text-[12px]">
                  Conectá un modelo por cada tarea. Podés tener varios y elegir cuál es el
                  principal. Usamos el principal primero; si falla, probamos los demás en
                  orden.
                </span>
              }
            />
          </div>

          {(Object.keys(byRole) as Role[]).map((role) => (
            <RoleGroup
              key={role}
              role={role}
              providers={byRole[role]}
              onConnect={() => openConnect(role)}
              onEdit={openEdit}
            />
          ))}
        </>
      )}

      <AiProviderDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        editing={editing}
        initialRole={initialRole}
      />
    </div>
  );
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-[color:var(--border)] bg-bg-1 p-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.25)] flex items-center justify-center mx-auto mb-4">
        <BrainCircuit className="h-8 w-8 text-brand-2" />
      </div>
      <h3 className="text-xl font-bold mb-1">Tu IA todavía no tiene cerebro</h3>
      <p className="text-fg-3 text-sm max-w-md mx-auto mb-5">
        Conectá un modelo (Claude, GPT, Gemini…) para que pueda leer los mensajes, proponerte
        respuestas y responder sola cuando esté segura.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-sm mx-auto">
        <Button className="gap-1.5" onClick={onConnect}>
          <Plus className="h-4 w-4" /> Conectar un modelo
        </Button>
      </div>
      <div className="mt-5 inline-flex items-center gap-2 text-xs text-fg-3 rounded-full border border-[color:var(--border)] bg-bg-2 px-3 py-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand-2" />
        Recomendado: Vercel AI Gateway — un solo key, muchos modelos, zero-retention.
      </div>
    </div>
  );
}

function RoleGroup({
  role,
  providers,
  onConnect,
  onEdit,
}: {
  role: Role;
  providers: SafeAiProvider[];
  onConnect: () => void;
  onEdit: (p: SafeAiProvider) => void;
}) {
  const meta = ROLE_META[role];
  const roleIcon =
    role === "generation" ? Sparkles : role === "classification" ? Zap : Eye;
  const RoleIcon = roleIcon;
  const primary = providers.find((p) => p.is_default && p.is_active);

  return (
    <section>
      <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-bg-2 border border-[color:var(--border)] flex items-center justify-center text-fg-2">
            <RoleIcon className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="font-semibold text-sm">{meta.label}</div>
            <div className="text-[11px] text-fg-3 leading-tight">{meta.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {primary ? (
            <Badge variant="green" className="text-[11px]">
              <CheckCircle2 className="h-3 w-3" /> En uso
            </Badge>
          ) : providers.length === 0 ? (
            <Badge variant="amber" className="text-[11px]">
              <AlertTriangle className="h-3 w-3" /> Sin conectar
            </Badge>
          ) : (
            <Badge variant="ghost" className="text-[11px]">Inactivo</Badge>
          )}
          <Button size="sm" variant="secondary" onClick={onConnect} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Conectar
          </Button>
        </div>
      </div>

      {providers.length === 0 ? (
        <button
          onClick={onConnect}
          className="w-full rounded-2xl border border-dashed border-[color:var(--border)] bg-bg-1 py-6 text-sm text-fg-3 hover:text-fg hover:border-[color:var(--border-strong)] transition"
        >
          + Conectar un modelo para {meta.label.toLowerCase()}
        </button>
      ) : (
        <div className="grid gap-2">
          {providers.map((p) => (
            <ProviderRow key={p.id} p={p} onEdit={() => onEdit(p)} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProviderRow({ p, onEdit }: { p: SafeAiProvider; onEdit: () => void }) {
  const router = useRouter();
  const def = PROVIDER_BY_ID.get(p.provider);
  const [isPending, start] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const statusColor = !p.is_active
    ? "gray"
    : p.last_test_ok === false
      ? "red"
      : p.is_default
        ? "green"
        : p.last_test_ok === true
          ? "green"
          : "amber";

  const statusLabel = !p.is_active
    ? "Desactivado"
    : p.last_test_ok === false
      ? "Error"
      : p.is_default
        ? "Activo"
        : "En standby";

  async function handleTest() {
    setIsTesting(true);
    const r = await testAiProvider(p.id);
    setIsTesting(false);
    if (r.ok) {
      toast.success(`Respondió en ${r.latencyMs}ms`);
    } else {
      toast.error(r.error.length > 120 ? r.error.slice(0, 120) + "…" : r.error);
    }
    router.refresh();
  }

  return (
    <div
      className={cn(
        "rounded-2xl border bg-bg-1 p-4 flex items-start gap-3 transition",
        p.is_default && p.is_active
          ? "border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.03)]"
          : "border-[color:var(--border)]",
        !p.is_active && "opacity-60",
      )}
    >
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
        style={{ background: def?.color ?? "#64748B" }}
      >
        {def?.label.charAt(0) ?? "?"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <div className="font-semibold text-sm truncate">{p.nickname}</div>
          {p.is_default && p.is_active && (
            <Badge variant="brand" className="text-[10px]">
              <Star className="h-2.5 w-2.5" /> Principal
            </Badge>
          )}
          <StatusBadge color={statusColor} label={statusLabel} />
        </div>
        <div className="text-[11px] text-fg-3 font-mono truncate">{p.model}</div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-fg-3">
          <span className="inline-flex items-center gap-1">
            <KeyRound className="h-3 w-3" />
            {p.has_api_key ? p.api_key_preview : "sin clave"}
          </span>
          {p.last_test_ok === true && p.last_test_latency_ms != null && (
            <span className="inline-flex items-center gap-1 text-[color:var(--accent-green)]">
              <Clock className="h-3 w-3" />
              {p.last_test_latency_ms}ms
            </span>
          )}
          {p.last_tested_at && (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              {formatRelative(p.last_tested_at)}
            </span>
          )}
          {p.last_test_ok === false && p.last_test_error && (
            <span className="inline-flex items-center gap-1 text-[color:var(--accent-red-2)] truncate max-w-full">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.last_test_error}</span>
            </span>
          )}
        </div>

        {p.last_test_ok === true && p.last_test_sample && p.is_default && (
          <div className="mt-2 text-[11px] text-fg-4 italic truncate">
            Último ping: “{p.last_test_sample}”
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleTest}
          disabled={isTesting || !p.is_active}
          className="gap-1 text-xs"
          title="Probar conexión"
        >
          <Zap className={cn("h-3.5 w-3.5", isTesting && "animate-pulse")} />
          <span className="hidden sm:inline">Probar</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {!p.is_default && p.is_active && (
              <DropdownMenuItem
                disabled={isPending}
                onClick={() =>
                  start(async () => {
                    const r = await setDefaultAiProvider(p.id);
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    toast.success("Marcado como principal");
                    router.refresh();
                  })
                }
              >
                <Star className="h-4 w-4" /> Usar como principal
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEdit}>
              <Cpu className="h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isPending}
              onClick={() =>
                start(async () => {
                  const r = await toggleAiProviderActive(p.id, !p.is_active);
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success(p.is_active ? "Desactivado" : "Activado");
                  router.refresh();
                })
              }
            >
              <Power className="h-4 w-4" />
              {p.is_active ? "Desactivar" : "Activar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-[color:var(--accent-red-2)] focus:text-[color:var(--accent-red-2)]"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <DeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        provider={p}
      />
    </div>
  );
}

function StatusBadge({
  color,
  label,
}: {
  color: "green" | "amber" | "red" | "gray";
  label: string;
}) {
  const variant =
    color === "green"
      ? "green"
      : color === "amber"
        ? "amber"
        : color === "red"
          ? "red"
          : "ghost";
  const dot =
    color === "green"
      ? "#10B981"
      : color === "amber"
        ? "#F59E0B"
        : color === "red"
          ? "#EF4444"
          : "#64748B";
  return (
    <Badge variant={variant} className="text-[10px]">
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: dot, boxShadow: `0 0 6px ${dot}` }}
      />
      {label}
    </Badge>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  provider,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  provider: SafeAiProvider;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar {provider.nickname}</DialogTitle>
          <DialogDescription>
            Se borra la configuración y la clave. Si era el modelo principal de su rol, la IA
            queda sin modelo para esa tarea hasta que conectes otro.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() =>
              start(async () => {
                const r = await deleteAiProvider(provider.id);
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success("Eliminado");
                onOpenChange(false);
                router.refresh();
              })
            }
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Behavior tab (umbrales + shadow + tono) — versión mejorada de lo que había.
// -----------------------------------------------------------------------------
function BehaviorView({ org }: { org: Org }) {
  const [tAuto, setTAuto] = useState(Math.round(org.threshold_auto * 100));
  const [tSuggest, setTSuggest] = useState(Math.round(org.threshold_suggest * 100));
  const [shadow, setShadow] = useState(org.shadow_mode);
  const [tone, setTone] = useState(org.tone);
  const [isPending, start] = useTransition();
  // Confirmación una vez por org la primera vez que se desactiva shadow.
  const [confirmShadowOff, setConfirmShadowOff] = useState(false);
  const ackKey = `textos:shadow-off-confirmed:${org.id}`;

  function handleShadowChange(next: boolean) {
    if (shadow && !next) {
      // Está desactivando: pedir confirmación si nunca se mostró.
      const acked = typeof window !== "undefined" && window.localStorage.getItem(ackKey) === "1";
      if (!acked) {
        setConfirmShadowOff(true);
        return;
      }
    }
    setShadow(next);
  }

  function confirmDisableShadow() {
    try {
      window.localStorage.setItem(ackKey, "1");
    } catch {
      // localStorage puede fallar (Safari privado, etc.) — no bloquea la acción.
    }
    setShadow(false);
    setConfirmShadowOff(false);
  }

  // Guardrails de coherencia: auto ≥ suggest
  function handleAutoChange(v: number) {
    setTAuto(v);
    if (tSuggest > v - 5) setTSuggest(Math.max(0, v - 5));
  }
  function handleSuggestChange(v: number) {
    setTSuggest(Math.min(v, tAuto - 5));
  }

  return (
    <div className="space-y-4">
      <TexTip
        id="settings-ai-threshold"
        variant="analytics"
        tone="info"
        message={<span className="text-[12px]">{TEX_COPY.tips.aiThreshold}</span>}
      />

      {/* Preview visual del semáforo */}
      <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-semibold">Umbrales del semáforo</h3>
          <Badge variant="ghost" className="text-[10px]">
            <Info className="h-3 w-3" /> Se aplica a cada respuesta propuesta
          </Badge>
        </div>

        <ThresholdBar auto={tAuto} suggest={tSuggest} />

        <div className="space-y-5 mt-6">
          <ThresholdRow
            color="green"
            label="Responder sola si la confianza es"
            value={tAuto}
            onChange={handleAutoChange}
            hint="Por encima de esto, la IA manda sola."
          />
          <ThresholdRow
            color="amber"
            label="Sugerir y pedirte que apruebes si es"
            value={tSuggest}
            onChange={handleSuggestChange}
            hint="Entre este valor y el anterior, te aparece en la bandeja swipe."
          />
          <div className="rounded-xl border border-[color:var(--accent-red)]/25 bg-[rgba(239,68,68,0.04)] p-3 text-sm text-fg-2">
            <b className="text-[color:var(--accent-red-2)]">Debajo de {tSuggest}%</b>:
            siempre pasa la consulta a vos. La IA sólo transcribe el contexto.
          </div>
        </div>
      </section>

      <Dialog open={confirmShadowOff} onOpenChange={setConfirmShadowOff}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-2" />
              Apagar modo sombra
            </DialogTitle>
            <DialogDescription>
              A partir de ahora, las sugerencias con <b className="text-[color:var(--accent-green)]">semáforo verde</b> se envían solas. Las amarillas y rojas siguen pasando por vos.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-3 text-xs text-fg-2 leading-relaxed">
            Subí el umbral verde si querés que sea más estricta. Podés volver a sombra cuando quieras.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmShadowOff(false)}>
              Mejor seguir en sombra
            </Button>
            <Button onClick={confirmDisableShadow} className="gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Sí, dejar que mande sola
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
        <div className="flex items-start gap-3">
          <Switch checked={shadow} onCheckedChange={handleShadowChange} className="mt-1" />
          <div className="flex-1">
            <div className="font-semibold">Modo sombra</div>
            <div className="text-sm text-fg-3 mt-0.5">
              La IA prepara sugerencias pero <b>nunca envía sola</b>. Recomendado los
              primeros días mientras entrenás.
            </div>
            <AnimatePresence>
              {shadow && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 rounded-lg bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] px-3 py-2 text-xs text-[color:var(--accent-amber)] flex items-center gap-2"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Ojo: mientras esto esté activo, ningún mensaje sale sin que lo apruebes
                  desde la bandeja.
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
        <h3 className="font-semibold mb-3">Tono general</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "formal", label: "Formal", emoji: "🧐" },
            { id: "casual", label: "Casual", emoji: "👋" },
            { id: "amigable", label: "Amigable", emoji: "🤗" },
            { id: "neutro", label: "Neutro", emoji: "😐" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTone(t.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                tone === t.id
                  ? "border-brand-2 bg-[rgba(139,92,246,0.08)]"
                  : "border-[color:var(--border)] bg-bg-2 hover:border-[color:var(--border-strong)]",
              )}
            >
              <div className="text-lg leading-none mb-1">{t.emoji}</div>
              <div className="font-medium text-sm">{t.label}</div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end sticky bottom-0 pt-2 pb-2 bg-gradient-to-t from-bg-0 to-transparent">
        <Button
          disabled={isPending}
          onClick={() =>
            start(async () => {
              await saveAiSettings({
                threshold_auto: tAuto / 100,
                threshold_suggest: tSuggest / 100,
                shadow_mode: shadow,
                tone,
              });
              toast.success("Configuración guardada");
            })
          }
        >
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}

function ThresholdBar({ auto, suggest }: { auto: number; suggest: number }) {
  return (
    <div className="relative h-9 rounded-full overflow-hidden bg-bg-2 border border-[color:var(--border)]">
      <div
        className="absolute inset-y-0 left-0 bg-[rgba(239,68,68,0.18)]"
        style={{ width: `${suggest}%` }}
      />
      <div
        className="absolute inset-y-0 bg-[rgba(245,158,11,0.22)]"
        style={{ left: `${suggest}%`, width: `${auto - suggest}%` }}
      />
      <div
        className="absolute inset-y-0 bg-[rgba(16,185,129,0.22)]"
        style={{ left: `${auto}%`, right: 0 }}
      />
      <div className="absolute inset-0 flex items-center justify-between px-3 text-[11px] font-medium">
        <span className="text-[color:var(--accent-red-2)]">Humano</span>
        <span className="text-[color:var(--accent-amber)]">Sugerir</span>
        <span className="text-[color:var(--accent-green)]">Auto</span>
      </div>
      <div
        className="absolute top-0 bottom-0 w-px bg-fg-4"
        style={{ left: `${suggest}%` }}
      />
      <div
        className="absolute top-0 bottom-0 w-px bg-fg-4"
        style={{ left: `${auto}%` }}
      />
    </div>
  );
}

function ThresholdRow({
  color,
  label,
  value,
  onChange,
  hint,
}: {
  color: "green" | "amber";
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  const hex = color === "green" ? "#10B981" : "#F59E0B";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm">
          <span className={`h-2 w-2 rounded-full dot-${color}`} />
          {label}
        </div>
        <span className="font-mono text-sm" style={{ color: hex }}>
          {value}%
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={100}
        step={1}
      />
      <div className="text-xs text-fg-3 mt-1.5">{hint}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-sm transition-colors",
        active ? "bg-bg-3 text-fg font-medium" : "text-fg-3 hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
