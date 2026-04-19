"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Clock,
  MoreHorizontal,
  Plug,
  Plus,
  Power,
  Settings2,
  Trash2,
} from "lucide-react";
import {
  InstagramIcon,
  MessengerIcon,
  WhatsAppIcon,
  GlobeIcon,
  MailIcon,
} from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { TexTip } from "@/components/tex";
import {
  deleteChannel,
  disconnectChannel,
  startConnection,
  type ChannelType,
  type SafeChannel,
} from "@/app/actions/channels";
import { ChannelConnectDialog } from "./channel-connect-dialog";
import { cn } from "@/lib/utils";

type ProviderMeta = {
  id: ChannelType;
  label: string;
  color: string;
  Icon: (p: { size?: number }) => React.JSX.Element;
  tagline: string;
  supportsMultiple: boolean;
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    Icon: (p) => <WhatsAppIcon size={p.size ?? 18} />,
    tagline: "Cloud API · por número",
    supportsMultiple: true,
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "#E4405F",
    Icon: (p) => <InstagramIcon size={p.size ?? 18} />,
    tagline: "DMs de cuenta profesional",
    supportsMultiple: true,
  },
  {
    id: "messenger",
    label: "Messenger",
    color: "#1877F2",
    Icon: (p) => <MessengerIcon size={p.size ?? 18} />,
    tagline: "Mensajes de página de Facebook",
    supportsMultiple: true,
  },
  {
    id: "webchat",
    label: "Webchat",
    color: "#8B5CF6",
    Icon: (p) => <GlobeIcon size={p.size ?? 18} />,
    tagline: "Widget para tu sitio",
    supportsMultiple: true,
  },
  {
    id: "email",
    label: "Email",
    color: "#64748B",
    Icon: (p) => <MailIcon size={p.size ?? 18} />,
    tagline: "Reenvío desde una casilla",
    supportsMultiple: true,
  },
];

const PROVIDER_BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function ChannelsSection({ orgName, channels }: { orgName: string; channels: SafeChannel[] }) {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState<SafeChannel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SafeChannel | null>(null);
  const [starting, setStarting] = useTransition();

  function handleConnect(type: ChannelType) {
    setStarting(async () => {
      const res = await startConnection({ type });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setActiveChannel(res.channel);
      router.refresh();
    });
  }

  function openExisting(ch: SafeChannel) {
    setActiveChannel(ch);
  }

  const activeList = channels.filter((c) => c.status !== "disconnected");
  const disconnected = channels.filter((c) => c.status === "disconnected");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Canales</h2>
        <p className="text-fg-3 text-sm">
          Conectá los canales de <b className="text-fg-2">{orgName}</b>. Cada conversación entra por
          el canal que elijas y tu IA responde desde ahí.
        </p>
      </div>

      <div className="mb-6">
        <TexTip
          id="settings-channels-multitenant"
          variant="support"
          tone="info"
          message={
            <span className="text-[12px]">
              Cada canal pertenece a esta organización. Si administrás varios negocios, conectá los
              canales en cada uno por separado — nada se mezcla.
            </span>
          }
        />
      </div>

      {activeList.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold">
              Activos
            </div>
            <div className="text-xs text-fg-3">· {activeList.length}</div>
          </div>
          <div className="grid gap-2.5">
            {activeList.map((ch) => (
              <ConnectedChannelRow
                key={ch.id}
                channel={ch}
                onConfigure={() => openExisting(ch)}
                onDelete={() => setDeleteTarget(ch)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold">
            {activeList.length ? "Conectar otro canal" : "Elegí un canal para empezar"}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PROVIDERS.map((p) => {
            const existing = activeList.filter((c) => c.type === p.id).length;
            return (
              <button
                key={p.id}
                onClick={() => handleConnect(p.id)}
                disabled={starting}
                className={cn(
                  "group relative rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4 text-left",
                  "transition-all hover:border-[color:var(--border-strong)] hover:bg-bg-2",
                  "disabled:opacity-60 disabled:cursor-wait",
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ background: p.color }}
                  >
                    <p.Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="font-medium">{p.label}</div>
                      {existing > 0 && (
                        <Badge variant="ghost" className="text-[10px] px-1.5">
                          {existing} conectado{existing !== 1 && "s"}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-fg-3">{p.tagline}</div>
                  </div>
                  <div className="rounded-full h-8 w-8 flex items-center justify-center text-fg-3 group-hover:text-fg group-hover:bg-bg-3 transition-colors">
                    <Plus className="h-4 w-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {disconnected.length > 0 && (
        <section className="mt-8">
          <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold mb-2">
            Archivados
          </div>
          <div className="grid gap-2">
            {disconnected.map((ch) => (
              <ArchivedRow
                key={ch.id}
                channel={ch}
                onReconnect={() => openExisting(ch)}
                onDelete={() => setDeleteTarget(ch)}
              />
            ))}
          </div>
        </section>
      )}

      <ChannelConnectDialog
        open={!!activeChannel}
        onOpenChange={(open) => {
          if (!open) {
            setActiveChannel(null);
            router.refresh();
          }
        }}
        channel={activeChannel}
      />
      <DeleteChannelDialog
        channel={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />
    </div>
  );
}

function ConnectedChannelRow({
  channel,
  onConfigure,
  onDelete,
}: {
  channel: SafeChannel;
  onConfigure: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const meta = PROVIDER_BY_ID.get(channel.type)!;
  const [isPending, start] = useTransition();

  const displayName =
    channel.label || fallbackLabel(channel) || meta.label;
  const subtitle = subtitleFor(channel);

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4 flex items-center gap-3">
      <div
        className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0"
        style={{ background: meta.color }}
      >
        <meta.Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">{displayName}</div>
          <StatusBadge status={channel.status} />
        </div>
        <div className="text-xs text-fg-3 truncate">{subtitle}</div>
      </div>
      <Button variant="ghost" size="sm" onClick={onConfigure} className="gap-1.5">
        <Settings2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Configurar</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onConfigure}>
            <Settings2 className="h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending || channel.status === "disconnected"}
            onClick={() =>
              start(async () => {
                const res = await disconnectChannel(channel.id);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Canal desactivado");
                router.refresh();
              })
            }
          >
            <Power className="h-4 w-4" /> Desactivar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-[color:var(--accent-red-2)] focus:text-[color:var(--accent-red-2)]"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ArchivedRow({
  channel,
  onReconnect,
  onDelete,
}: {
  channel: SafeChannel;
  onReconnect: () => void;
  onDelete: () => void;
}) {
  const meta = PROVIDER_BY_ID.get(channel.type)!;
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--border)] bg-bg-1/50 p-3 flex items-center gap-3 opacity-80">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center text-white shrink-0 opacity-70"
        style={{ background: meta.color }}
      >
        <meta.Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">{channel.label || meta.label}</div>
        <div className="text-xs text-fg-3">Desconectado</div>
      </div>
      <Button variant="ghost" size="sm" onClick={onReconnect}>
        Reconectar
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        aria-label="Eliminar"
        className="text-fg-3 hover:text-[color:var(--accent-red-2)]"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: SafeChannel["status"] }) {
  if (status === "connected") {
    return (
      <Badge variant="green">
        <Check className="h-3 w-3" /> Activo
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge variant="amber">
        <Clock className="h-3 w-3" /> Pendiente
      </Badge>
    );
  }
  return (
    <Badge variant="ghost">
      <Plug className="h-3 w-3" /> No conectado
    </Badge>
  );
}

function fallbackLabel(c: SafeChannel) {
  const cfg = (c.config ?? {}) as Record<string, string>;
  return cfg.display_number || cfg.page_id || cfg.forward_to || c.external_id || "";
}

function subtitleFor(c: SafeChannel): string {
  const cfg = (c.config ?? {}) as Record<string, string>;
  switch (c.type) {
    case "whatsapp":
      return cfg.display_number
        ? `WhatsApp · ${cfg.display_number}`
        : "WhatsApp Cloud API";
    case "instagram":
      return cfg.ig_business_id
        ? `Instagram · ${cfg.ig_business_id}`
        : "Instagram DMs";
    case "messenger":
      return cfg.page_id ? `Messenger · página ${cfg.page_id}` : "Messenger";
    case "webchat":
      return cfg.allowed_domains && (cfg.allowed_domains as unknown as string[]).length
        ? `Webchat · ${(cfg.allowed_domains as unknown as string[]).slice(0, 2).join(", ")}`
        : "Widget embebido";
    case "email":
      return cfg.forward_to ? `Email · ${cfg.forward_to}` : "Casilla reenviada";
  }
}

function DeleteChannelDialog({
  channel,
  onOpenChange,
}: {
  channel: SafeChannel | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  return (
    <Dialog open={!!channel} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar canal</DialogTitle>
          <DialogDescription>
            Se borra la configuración y dejás de recibir conversaciones por acá. Las conversaciones
            anteriores quedan en tu historial.
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
                if (!channel) return;
                const res = await deleteChannel(channel.id);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Canal eliminado");
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
