"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  InstagramIcon,
  MessengerIcon,
  WhatsAppIcon,
  GlobeIcon,
  MailIcon,
} from "@/components/ui/brand-icons";
import {
  getVerifyToken,
  saveEmail,
  saveMetaPage,
  saveWebchat,
  saveWhatsApp,
  type ChannelType,
  type SafeChannel,
} from "@/app/actions/channels";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: SafeChannel | null;
};

const META: Record<
  ChannelType,
  {
    label: string;
    color: string;
    Icon: (p: { size?: number }) => React.JSX.Element;
    docsHref: string;
    summary: string;
  }
> = {
  whatsapp: {
    label: "WhatsApp",
    color: "#25D366",
    Icon: (p) => <WhatsAppIcon size={p.size ?? 18} />,
    docsHref: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    summary:
      "Usá tu número de WhatsApp Business a través de la Cloud API de Meta. Tarda 5 minutos si ya tenés la app creada.",
  },
  instagram: {
    label: "Instagram",
    color: "#E4405F",
    Icon: (p) => <InstagramIcon size={p.size ?? 18} />,
    docsHref: "https://developers.facebook.com/docs/messenger-platform/instagram",
    summary: "Conectá los DMs de tu cuenta profesional vinculada a una página de Facebook.",
  },
  messenger: {
    label: "Messenger",
    color: "#1877F2",
    Icon: (p) => <MessengerIcon size={p.size ?? 18} />,
    docsHref: "https://developers.facebook.com/docs/messenger-platform",
    summary: "Recibí los mensajes de tu página de Facebook directamente en TextOS.",
  },
  webchat: {
    label: "Webchat",
    color: "#8B5CF6",
    Icon: (p) => <GlobeIcon size={p.size ?? 18} />,
    docsHref: "",
    summary: "Pegá el snippet en tu sitio y tu IA empieza a atender en el momento.",
  },
  email: {
    label: "Email",
    color: "#64748B",
    Icon: (p) => <MailIcon size={p.size ?? 18} />,
    docsHref: "",
    summary: "Convertí una casilla en un canal: cada email entrante se vuelve una conversación.",
  },
};

export function ChannelConnectDialog({ open, onOpenChange, channel }: Props) {
  if (!channel) return null;
  const m = META[channel.type];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-[color:var(--border)]">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: m.color }}
          >
            <m.Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <DialogHeader className="p-0">
              <DialogTitle>Conectar {m.label}</DialogTitle>
              <DialogDescription className="text-[13px]">{m.summary}</DialogDescription>
            </DialogHeader>
          </div>
          <StatusPill status={channel.status} />
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5 max-h-[min(78dvh,640px)] overflow-y-auto">
          {channel.type === "whatsapp" && (
            <WhatsAppForm channel={channel} onDone={() => onOpenChange(false)} />
          )}
          {(channel.type === "instagram" || channel.type === "messenger") && (
            <MetaPageForm channel={channel} onDone={() => onOpenChange(false)} />
          )}
          {channel.type === "webchat" && (
            <WebchatForm channel={channel} onDone={() => onOpenChange(false)} />
          )}
          {channel.type === "email" && (
            <EmailForm channel={channel} onDone={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusPill({ status }: { status: SafeChannel["status"] }) {
  if (status === "connected") {
    return (
      <Badge variant="green">
        <Check className="h-3 w-3" /> Activo
      </Badge>
    );
  }
  if (status === "pending") return <Badge variant="amber">Pendiente</Badge>;
  return <Badge variant="ghost">No conectado</Badge>;
}

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

function FieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <label className="text-xs text-fg-2 font-medium mb-1.5 flex items-center gap-2">
      {children}
      {hint && <span className="text-[11px] text-fg-3 font-normal">— {hint}</span>}
    </label>
  );
}

function CopyRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <div className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-3 flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-fg-3 font-semibold mb-0.5">
          {label}
        </div>
        <div
          className={cn(
            "font-mono text-[12.5px] truncate",
            muted ? "text-fg-3" : "text-fg",
          )}
        >
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="h-8 w-8 rounded-lg text-fg-3 hover:text-fg hover:bg-bg-3 flex items-center justify-center transition-colors shrink-0"
        aria-label={`Copiar ${label}`}
      >
        {copied ? <Check className="h-4 w-4 text-[color:var(--accent-green)]" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SecretInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-11 font-mono text-[13px]"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md text-fg-3 hover:text-fg hover:bg-bg-3 flex items-center justify-center"
        aria-label={show ? "Ocultar" : "Mostrar"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function DocsLink({ href }: { href: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[12px] text-brand-2 hover:underline"
    >
      Ver guía oficial <ExternalLink className="h-3 w-3" />
    </a>
  );
}

// ---------------------------------------------------------------------------
// WhatsApp (Cloud API)
// ---------------------------------------------------------------------------

function WhatsAppForm({ channel, onDone }: { channel: SafeChannel; onDone: () => void }) {
  const cfg = (channel.config ?? {}) as Record<string, string>;
  const [label, setLabel] = useState(channel.label ?? "");
  const [phoneNumberId, setPhoneNumberId] = useState(cfg.phone_number_id ?? "");
  const [wabaId, setWabaId] = useState(cfg.waba_id ?? "");
  const [displayNumber, setDisplayNumber] = useState(cfg.display_number ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [isPending, start] = useTransition();

  const webhookUrl = useWebhookUrl(channel.id);
  const verifyToken = useVerifyToken(channel.id);

  const isReady = label && phoneNumberId && wabaId && displayNumber && accessToken;

  return (
    <div className="space-y-5">
      <WebhookBlock webhookUrl={webhookUrl} verifyToken={verifyToken} docs={META.whatsapp.docsHref} />

      <div className="h-px bg-[color:var(--border)]" />

      <div>
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold mb-3">
          2. Credenciales
        </div>
        <div className="grid gap-3">
          <div>
            <FieldLabel hint="cómo lo vas a ver en la bandeja">Nombre del canal</FieldLabel>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: WhatsApp Ventas"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Phone Number ID</FieldLabel>
              <Input
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                placeholder="1098XXXXXXXXXXX"
                className="font-mono text-[13px]"
              />
            </div>
            <div>
              <FieldLabel>WABA ID</FieldLabel>
              <Input
                value={wabaId}
                onChange={(e) => setWabaId(e.target.value)}
                placeholder="2345XXXXXXXXXXX"
                className="font-mono text-[13px]"
              />
            </div>
          </div>
          <div>
            <FieldLabel hint="el que ven tus clientes">Número visible</FieldLabel>
            <Input
              value={displayNumber}
              onChange={(e) => setDisplayNumber(e.target.value)}
              placeholder="+54 9 11 5555-5555"
            />
          </div>
          <div>
            <FieldLabel hint="permanente, de Meta for Developers">Access Token</FieldLabel>
            <SecretInput
              value={accessToken}
              onChange={setAccessToken}
              placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
        </div>
      </div>

      <Footer
        onCancel={onDone}
        onSubmit={() =>
          start(async () => {
            const res = await saveWhatsApp({
              channelId: channel.id,
              label,
              phoneNumberId,
              wabaId,
              displayNumber,
              accessToken,
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Guardado — esperando verificación de Meta");
            onDone();
          })
        }
        disabled={!isReady || isPending}
        loading={isPending}
        primary="Guardar y verificar"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Instagram / Messenger (shared Meta Page)
// ---------------------------------------------------------------------------

function MetaPageForm({ channel, onDone }: { channel: SafeChannel; onDone: () => void }) {
  const cfg = (channel.config ?? {}) as Record<string, string>;
  const isIg = channel.type === "instagram";
  const [label, setLabel] = useState(channel.label ?? "");
  const [pageId, setPageId] = useState(cfg.page_id ?? "");
  const [igBusinessId, setIgBusinessId] = useState(cfg.ig_business_id ?? "");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [isPending, start] = useTransition();

  const webhookUrl = useWebhookUrl(channel.id);
  const verifyToken = useVerifyToken(channel.id);
  const isReady = label && pageId && pageAccessToken && appSecret && (!isIg || igBusinessId);

  return (
    <div className="space-y-5">
      <WebhookBlock
        webhookUrl={webhookUrl}
        verifyToken={verifyToken}
        docs={isIg ? META.instagram.docsHref : META.messenger.docsHref}
      />
      <div className="h-px bg-[color:var(--border)]" />
      <div>
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold mb-3">
          2. Credenciales
        </div>
        <div className="grid gap-3">
          <div>
            <FieldLabel>Nombre del canal</FieldLabel>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={isIg ? "Ej: @minegocio" : "Ej: Página principal"}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Page ID</FieldLabel>
              <Input
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="1234567890"
                className="font-mono text-[13px]"
              />
            </div>
            {isIg && (
              <div>
                <FieldLabel>Instagram Business ID</FieldLabel>
                <Input
                  value={igBusinessId}
                  onChange={(e) => setIgBusinessId(e.target.value)}
                  placeholder="1789XXXXXX"
                  className="font-mono text-[13px]"
                />
              </div>
            )}
          </div>
          <div>
            <FieldLabel hint="token de la página — permanente">Page Access Token</FieldLabel>
            <SecretInput
              value={pageAccessToken}
              onChange={setPageAccessToken}
              placeholder="EAAxxxx"
            />
          </div>
          <div>
            <FieldLabel hint="de tu app en Meta for Developers">App Secret</FieldLabel>
            <SecretInput value={appSecret} onChange={setAppSecret} placeholder="••••••••••" />
          </div>
        </div>
      </div>
      <Footer
        onCancel={onDone}
        onSubmit={() =>
          start(async () => {
            const res = await saveMetaPage({
              channelId: channel.id,
              type: isIg ? "instagram" : "messenger",
              label,
              pageId,
              pageAccessToken,
              appSecret,
              igBusinessId: isIg ? igBusinessId : undefined,
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Guardado — esperando verificación de Meta");
            onDone();
          })
        }
        disabled={!isReady || isPending}
        loading={isPending}
        primary="Guardar y verificar"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Webchat
// ---------------------------------------------------------------------------

function WebchatForm({ channel, onDone }: { channel: SafeChannel; onDone: () => void }) {
  const cfg = (channel.config ?? {}) as {
    widget_key?: string;
    greeting?: string;
    accent_color?: string;
    allowed_domains?: string[];
  };
  const widgetKey = cfg.widget_key ?? "";
  const [label, setLabel] = useState(channel.label ?? "Webchat");
  const [greeting, setGreeting] = useState(
    cfg.greeting ?? "¡Hola! Contanos en qué te ayudamos.",
  );
  const [accent, setAccent] = useState(cfg.accent_color ?? "#8B5CF6");
  const [domainsText, setDomainsText] = useState((cfg.allowed_domains ?? []).join(", "));
  const [isPending, start] = useTransition();

  const origin = useOrigin();
  const snippet = useMemo(
    () => `<script async src="${origin}/widget/textos.js" data-widget="${widgetKey}"></script>`,
    [origin, widgetKey],
  );
  const isReady = label && greeting && /^#?[0-9a-f]{6}$/i.test(accent);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold mb-3">
          1. Instalá el widget
        </div>
        <CopyRow label="Snippet" value={snippet} />
        <div className="mt-2 text-[12px] text-fg-3">
          Pegalo antes de <code className="font-mono">&lt;/body&gt;</code> en cada página donde
          quieras que aparezca.
        </div>
      </div>

      <div className="h-px bg-[color:var(--border)]" />

      <div>
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold mb-3">
          2. Apariencia y comportamiento
        </div>
        <div className="grid gap-3">
          <div>
            <FieldLabel>Nombre del canal</FieldLabel>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <FieldLabel hint="primera línea que ve el visitante">Mensaje de bienvenida</FieldLabel>
            <Input value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={140} />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <FieldLabel hint="dominios donde podés cargarlo — separados por coma">
                Dominios permitidos
              </FieldLabel>
              <Input
                value={domainsText}
                onChange={(e) => setDomainsText(e.target.value)}
                placeholder="minegocio.com, staging.minegocio.com"
              />
            </div>
            <div>
              <FieldLabel>Color</FieldLabel>
              <div className="flex items-center gap-2 h-11">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-11 w-11 rounded-xl border border-[color:var(--border)] bg-bg-1 p-1 cursor-pointer"
                />
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-[110px] font-mono text-[13px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer
        onCancel={onDone}
        onSubmit={() =>
          start(async () => {
            const domains = domainsText
              .split(",")
              .map((d) => d.trim())
              .filter(Boolean);
            const res = await saveWebchat({
              channelId: channel.id,
              label,
              greeting,
              accentColor: accent,
              allowedDomains: domains,
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Webchat activado");
            onDone();
          })
        }
        disabled={!isReady || isPending}
        loading={isPending}
        primary="Activar webchat"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

function EmailForm({ channel, onDone }: { channel: SafeChannel; onDone: () => void }) {
  const cfg = (channel.config ?? {}) as { inbox_alias?: string; signature?: string; forward_to?: string };
  const origin = useOrigin();
  const alias = cfg.inbox_alias ?? "";
  const webhookUrl = `${origin}/api/webhooks/email/${alias}`;
  const [label, setLabel] = useState(channel.label ?? "Email");
  const [forwardTo, setForwardTo] = useState(cfg.forward_to ?? "");
  const [signature, setSignature] = useState(cfg.signature ?? "");
  const [isPending, start] = useTransition();
  const isReady = label && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forwardTo);

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold mb-3">
          1. Conectá un proveedor de email entrante
        </div>
        <div className="rounded-xl border border-brand/30 bg-[rgba(139,92,246,0.06)] p-3 mb-3 text-[12px] text-fg-2 leading-relaxed">
          Creá una regla de forwarding inbound en Resend, Mailgun, Postmark o SendGrid apuntando a
          esta URL. Nosotros aceptamos los cuatro formatos.
        </div>
        <div className="space-y-2">
          <CopyRow label="Webhook URL" value={webhookUrl} />
          <CopyRow label="Alias interno" value={alias} muted />
        </div>
        <div className="mt-2 text-[12px] text-fg-3">
          Para mayor seguridad, configurá <code className="font-mono">EMAIL_WEBHOOK_SECRET</code> y
          firmá el cuerpo con HMAC-SHA256 en el header <code className="font-mono">x-textos-signature</code>.
        </div>
      </div>

      <div className="h-px bg-[color:var(--border)]" />

      <div>
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold mb-3">
          2. Configuración
        </div>
        <div className="grid gap-3">
          <div>
            <FieldLabel>Nombre del canal</FieldLabel>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <FieldLabel hint="tu casilla real — la que usan tus clientes">Email de origen</FieldLabel>
            <Input
              value={forwardTo}
              onChange={(e) => setForwardTo(e.target.value)}
              placeholder="contacto@minegocio.com"
              type="email"
            />
          </div>
          <div>
            <FieldLabel>Firma automática</FieldLabel>
            <Input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Equipo Mi Negocio · minegocio.com"
              maxLength={280}
            />
          </div>
        </div>
      </div>

      <Footer
        onCancel={onDone}
        onSubmit={() =>
          start(async () => {
            const res = await saveEmail({
              channelId: channel.id,
              label,
              forwardTo,
              signature: signature || undefined,
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Email conectado");
            onDone();
          })
        }
        disabled={!isReady || isPending}
        loading={isPending}
        primary="Conectar email"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-blocks
// ---------------------------------------------------------------------------

function WebhookBlock({
  webhookUrl,
  verifyToken,
  docs,
}: {
  webhookUrl: string;
  verifyToken: string | null;
  docs: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold">
          1. Configurá el webhook
        </div>
        <DocsLink href={docs} />
      </div>
      <div className="rounded-xl border border-brand/30 bg-[rgba(139,92,246,0.06)] p-3 mb-3 flex gap-2.5">
        <ShieldCheck className="h-4 w-4 text-brand-2 shrink-0 mt-0.5" />
        <div className="text-[12px] text-fg-2 leading-relaxed">
          En Meta for Developers, pegá estos dos valores en la sección{" "}
          <b>Webhooks</b> y apretá <b>Verify and save</b>. Nosotros detectamos el handshake en
          segundos y el canal se pone en verde.
        </div>
      </div>
      <div className="space-y-2">
        <CopyRow label="Callback URL" value={webhookUrl} />
        {verifyToken ? (
          <CopyRow label="Verify token" value={verifyToken} />
        ) : (
          <div className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-3 text-[12px] text-fg-3 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Generando token…
          </div>
        )}
      </div>
    </div>
  );
}

function Footer({
  onCancel,
  onSubmit,
  disabled,
  loading,
  primary,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
  primary: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-[color:var(--border)]">
      <Button variant="ghost" onClick={onCancel} type="button">
        Cancelar
      </Button>
      <Button onClick={onSubmit} disabled={disabled} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {primary}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const originSubscribe = () => () => {};
const originGet = () => window.location.origin;
const originGetServer = () => "https://tu-app.com";

function useOrigin() {
  return useSyncExternalStore(originSubscribe, originGet, originGetServer);
}

function useWebhookUrl(channelId: string) {
  const origin = useOrigin();
  return `${origin}/api/webhooks/channels/${channelId}`;
}

function useVerifyToken(channelId: string) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getVerifyToken(channelId).then((r) => {
      if (!cancelled) setToken(r.verifyToken);
    });
    return () => {
      cancelled = true;
    };
  }, [channelId]);
  return token;
}

