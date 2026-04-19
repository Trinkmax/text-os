"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
  useAnimation,
} from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Pencil,
  Send,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";
import { InstagramIcon, MessengerIcon, WhatsAppIcon, GlobeIcon, MailIcon } from "@/components/ui/brand-icons";
import { cn, formatRelative, initials, avatarGradient } from "@/lib/utils";
import { SEMAPHORE_META, type Semaphore } from "@/lib/semaphore";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Kbd } from "@/components/ui/kbd";

export type Card = {
  id: string;
  proposedText: string;
  confidence: number;
  semaphore: Semaphore;
  reason: string | null;
  createdAt: string;
  conversationId: string;
  channel: string;
  contactName: string;
  contactAvatar: string | null;
  inboundMessage: string;
};

export function SwipeCard({
  card,
  index,
  isTop,
  editing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onResolve,
}: {
  card: Card;
  index: number;
  isTop: boolean;
  editing: boolean;
  editText: string;
  onEditTextChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onResolve: (action: "send" | "dismiss" | "escalate" | "snooze", editedText?: string, learn?: boolean) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-18, 0, 18]);
  const controls = useAnimation();
  const [exitDir, setExitDir] = useState<"left" | "right" | "up" | "down" | null>(null);
  const [scopeLearn, setScopeLearn] = useState(true);
  const [replyText, setReplyText] = useState("");

  // Tint derived from drag distance
  const tintR = useTransform(x, [-200, 0, 200], [0.25, 0, 0]);
  const tintG = useTransform(x, [-200, 0, 200], [0, 0, 0.2]);
  const tintUp = useTransform(y, [-200, 0, 0], [0.2, 0, 0]);
  const tintDown = useTransform(y, [0, 0, 200], [0, 0, 0.15]);

  const m = SEMAPHORE_META[card.semaphore];
  const isRed = card.semaphore === "red";

  async function fly(dir: "left" | "right" | "up" | "down", onEnd: () => void) {
    setExitDir(dir);
    const target = { left: { x: -900, y: 40 }, right: { x: 900, y: 40 }, up: { x: 0, y: -900 }, down: { x: 0, y: 900 } }[dir];
    await controls.start({
      x: target.x,
      y: target.y,
      rotate: dir === "left" ? -30 : dir === "right" ? 30 : 0,
      opacity: 0,
      transition: { type: "spring", stiffness: 220, damping: 22, velocity: 4 },
    });
    onEnd();
  }

  function onDragEnd(_: PointerEvent, info: PanInfo) {
    if (!isTop) return;
    const { offset, velocity } = info;
    const swipe = 180;
    const vel = 500;
    if (offset.x > swipe || velocity.x > vel) {
      if (isRed) {
        handleScopeSubmit();
        return;
      }
      fly("right", () => onResolve("send"));
      return;
    }
    if (offset.x < -swipe || velocity.x < -vel) {
      fly("left", () => onResolve("dismiss"));
      return;
    }
    if (offset.y < -swipe || velocity.y < -vel) {
      fly("up", () => onResolve("escalate"));
      return;
    }
    if (offset.y > swipe || velocity.y > vel) {
      fly("down", () => onResolve("snooze"));
      return;
    }
    controls.start({ x: 0, y: 0, rotate: 0, transition: { type: "spring", stiffness: 500, damping: 40 } });
  }

  function handleScopeSubmit() {
    if (!replyText.trim()) {
      controls.start({ x: 0, y: 0, transition: { type: "spring", stiffness: 500, damping: 40 } });
      return;
    }
    fly("right", () => onResolve("send", replyText, scopeLearn));
  }

  // Only the TOP card is draggable; others show as stacked background
  const depth = Math.min(index, 2);
  const scaleOffset = depth * 0.04;
  const yOffset = depth * 10;

  if (!isTop) {
    return (
      <motion.div
        key={card.id}
        initial={{ scale: 1 - scaleOffset, y: yOffset, opacity: 0 }}
        animate={{ scale: 1 - scaleOffset, y: yOffset, opacity: 1 - depth * 0.15 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
        className="absolute inset-0"
        style={{ zIndex: 10 - depth }}
      >
        <CardFace card={card} dimmed />
      </motion.div>
    );
  }

  return (
    <motion.div
      key={card.id}
      className="absolute inset-0 no-select"
      style={{ x, y, rotate, zIndex: 20, touchAction: "none" }}
      drag={!editing}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      whileTap={{ scale: 0.985 }}
      initial={{ scale: 0.94, opacity: 0, y: 30 }}
      animate={controls}
      exit={{ opacity: 0 }}
      onDragEnd={onDragEnd}
    >
      {/* Tint overlays */}
      <motion.div
        className="absolute inset-0 rounded-[28px] pointer-events-none"
        style={{
          backgroundColor: "rgba(16,185,129,1)",
          opacity: tintG,
        }}
      />
      <motion.div
        className="absolute inset-0 rounded-[28px] pointer-events-none"
        style={{ backgroundColor: "rgba(239,68,68,1)", opacity: tintR }}
      />
      <motion.div
        className="absolute inset-0 rounded-[28px] pointer-events-none"
        style={{ backgroundColor: "rgba(245,158,11,1)", opacity: tintUp }}
      />
      <motion.div
        className="absolute inset-0 rounded-[28px] pointer-events-none"
        style={{ backgroundColor: "rgba(59,130,246,1)", opacity: tintDown }}
      />
      <CardFace
        card={card}
        editing={editing}
        editText={editText}
        onEditTextChange={onEditTextChange}
        onSaveEdit={onSaveEdit}
        onCancelEdit={onCancelEdit}
        onStartEdit={onStartEdit}
        onResolveEdited={(text) => fly("right", () => onResolve("send", text))}
        scopeReplyText={replyText}
        onScopeReplyChange={setReplyText}
        scopeLearn={scopeLearn}
        onToggleLearn={setScopeLearn}
        onScopeSubmit={handleScopeSubmit}
        onScopeSubmitWithoutLearn={() => {
          if (!replyText.trim()) return;
          fly("right", () => onResolve("send", replyText, false));
        }}
      />
      {/* Direction indicators */}
      <DirectionHints x={x} y={y} />
    </motion.div>
  );
}

function DirectionHints({ x, y }: { x: ReturnType<typeof useMotionValue>; y: ReturnType<typeof useMotionValue> }) {
  const opRight = useTransform(x, [20, 120], [0, 1]);
  const opLeft = useTransform(x, [-120, -20], [1, 0]);
  const opUp = useTransform(y, [-120, -20], [1, 0]);
  const opDown = useTransform(y, [20, 120], [0, 1]);
  return (
    <>
      <motion.div
        style={{ opacity: opRight }}
        className="absolute top-8 right-8 pointer-events-none flex items-center gap-2 bg-[color:var(--accent-green)] text-white px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg"
      >
        <Send className="h-3 w-3" /> Enviar
      </motion.div>
      <motion.div
        style={{ opacity: opLeft }}
        className="absolute top-8 left-8 pointer-events-none flex items-center gap-2 bg-[color:var(--accent-red)] text-white px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg"
      >
        <X className="h-3 w-3" /> Descartar
      </motion.div>
      <motion.div
        style={{ opacity: opUp }}
        className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-2 bg-[color:var(--accent-amber)] text-white px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg"
      >
        <ArrowUp className="h-3 w-3" /> Escalar
      </motion.div>
      <motion.div
        style={{ opacity: opDown }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none flex items-center gap-2 bg-[#3B82F6] text-white px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider shadow-lg"
      >
        <ArrowDown className="h-3 w-3" /> Posponer
      </motion.div>
    </>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  switch (channel) {
    case "whatsapp":
      return <WhatsAppIcon size={14} />;
    case "instagram":
      return <InstagramIcon size={14} />;
    case "messenger":
      return <MessengerIcon size={14} />;
    case "email":
      return <MailIcon size={14} />;
    default:
      return <GlobeIcon size={14} />;
  }
}

function CardFace({
  card,
  editing,
  editText,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onResolveEdited,
  scopeReplyText,
  onScopeReplyChange,
  scopeLearn,
  onToggleLearn,
  onScopeSubmit,
  onScopeSubmitWithoutLearn,
  dimmed,
}: {
  card: Card;
  editing?: boolean;
  editText?: string;
  onEditTextChange?: (v: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  onStartEdit?: () => void;
  onResolveEdited?: (text: string) => void;
  scopeReplyText?: string;
  onScopeReplyChange?: (v: string) => void;
  scopeLearn?: boolean;
  onToggleLearn?: (v: boolean) => void;
  onScopeSubmit?: () => void;
  onScopeSubmitWithoutLearn?: () => void;
  dimmed?: boolean;
}) {
  const m = SEMAPHORE_META[card.semaphore];
  const isRed = card.semaphore === "red";
  const pct = Math.round(card.confidence * 100);
  return (
    <div
      className={cn(
        "relative h-full rounded-[28px] border bg-bg-1 flex flex-col overflow-hidden shadow-[var(--shadow-card)]",
        isRed ? "border-[color:var(--accent-red)]/30" : "border-[color:var(--border-strong)]",
        dimmed && "pointer-events-none"
      )}
    >
      {/* Top: contact strip */}
      <div className="shrink-0 flex items-center gap-3 px-5 pt-5 pb-3 border-b border-[color:var(--border)]">
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
          style={{ backgroundImage: avatarGradient(card.contactName) }}
        >
          {initials(card.contactName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate flex items-center gap-2">
            {card.contactName}
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-bg-2 text-fg-3 text-[10px] font-normal">
              <ChannelIcon channel={card.channel} />
              {card.channel}
            </span>
          </div>
          <div className="text-[11px] text-fg-4">{formatRelative(card.createdAt)}</div>
        </div>
      </div>

      {/* Red scope-gap banner */}
      {isRed && (
        <div className="shrink-0 bg-[rgba(239,68,68,0.08)] border-b border-[rgba(239,68,68,0.2)] px-5 py-2.5 flex items-center gap-2 text-sm text-[color:var(--accent-red-2)]">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Esta pregunta está fuera de tu alcance actual.
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 no-scrollbar">
        {/* Inbound bubble */}
        <div className="flex gap-2 items-start">
          <div className="shrink-0 h-7 w-7 rounded-full bg-bg-3 flex items-center justify-center text-[10px] text-fg-3 font-medium mt-1">
            {initials(card.contactName) || "·"}
          </div>
          <div className="max-w-[88%] rounded-2xl rounded-tl-md px-4 py-2.5 bg-bg-2 border border-[color:var(--border)] text-fg text-[15px] leading-relaxed">
            {card.inboundMessage || "(sin mensaje)"}
          </div>
        </div>

        {/* AI suggestion bubble OR scope-gap input */}
        {!isRed ? (
          editing ? (
            <div className="ml-auto w-full max-w-[88%]">
              <Textarea
                autoFocus
                value={editText}
                onChange={(e) => onEditTextChange?.(e.target.value)}
                className={cn("rounded-2xl rounded-tr-md text-[15px] p-4 amber-pulse-border bg-[rgba(245,158,11,0.03)]")}
                rows={Math.max(3, (editText?.split("\n").length || 2) + 1)}
              />
              <div className="flex items-center gap-2 mt-2 justify-end">
                <Button size="sm" variant="ghost" onClick={onCancelEdit}>
                  Cancelar
                </Button>
                <Button size="sm" variant="secondary" onClick={onSaveEdit}>
                  Guardar cambios
                </Button>
                <Button
                  size="sm"
                  onClick={() => onResolveEdited?.(editText || "")}
                  className="gap-1.5"
                  disabled={!editText?.trim()}
                >
                  <Send className="h-3.5 w-3.5" /> Enviar editado
                </Button>
              </div>
            </div>
          ) : (
            <div className="ml-auto w-full max-w-[88%] flex flex-col items-end gap-2">
              <button
                onClick={onStartEdit}
                className={cn(
                  "group rounded-2xl rounded-tr-md px-4 py-3 text-[15px] leading-relaxed text-left w-full bg-[rgba(245,158,11,0.04)] hover:bg-[rgba(245,158,11,0.07)] transition-colors amber-pulse-border relative"
                )}
              >
                {card.proposedText || <span className="text-fg-4 italic">Sin sugerencia</span>}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-fg-3">
                  <Kbd>E</Kbd>
                  <span>editar</span>
                </div>
              </button>
              <div
                className="inline-flex items-center gap-2 px-2.5 h-7 rounded-full text-xs font-medium"
                style={{
                  color: m.hex,
                  background: m.bg,
                  border: `1px solid ${m.ring}`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.hex, boxShadow: `0 0 8px ${m.hex}` }} />
                {m.label} · <span className="font-mono tabular-nums">{pct}%</span>
              </div>
              {card.reason && <div className="text-xs text-fg-3 leading-relaxed">{card.reason}</div>}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <Textarea
              autoFocus
              placeholder="Escribí tu respuesta al cliente…"
              value={scopeReplyText}
              onChange={(e) => onScopeReplyChange?.(e.target.value)}
              className="bg-bg-0 min-h-[120px]"
              rows={4}
            />
            <label className="flex items-start gap-3 p-3 rounded-xl border border-[color:var(--border)] bg-bg-2 cursor-pointer">
              <Switch
                checked={scopeLearn ?? true}
                onCheckedChange={(v) => onToggleLearn?.(v)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">Guardar como respuesta estándar</div>
                <div className="text-xs text-fg-3 mt-0.5">
                  La IA va a aprender y responder parecido la próxima vez que alguien pregunte algo similar.
                </div>
              </div>
            </label>
            <div className="flex justify-end items-center gap-2">
              <Button variant="ghost" onClick={onScopeSubmitWithoutLearn} disabled={!scopeReplyText?.trim()}>
                Enviar sin guardar
              </Button>
              <Button className="gap-2" onClick={onScopeSubmit} disabled={!scopeReplyText?.trim()}>
                <Check className="h-4 w-4" /> Enviar + aprender
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
