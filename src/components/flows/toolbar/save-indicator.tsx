"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Check, Loader2, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SyncStatus } from "../state/use-flow-store";

export function SaveIndicator({ status, dirty }: { status: SyncStatus; dirty: boolean }) {
  // Tick por segundo para re-renderizar el "hace Xs".
  const [, tick] = useState(0);
  useEffect(() => {
    if (status.kind !== "saved") return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [status.kind]);

  const display = pickDisplay(status, dirty);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2 py-1 min-w-[88px] justify-center",
        "transition-colors border",
        display.className,
      )}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={display.key}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 3 }}
          transition={{ duration: 0.15 }}
          className="inline-flex items-center gap-1.5"
        >
          {display.icon}
          <span>{display.text}</span>
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function pickDisplay(status: SyncStatus, dirty: boolean) {
  if (status.kind === "saving") {
    return {
      key: "saving",
      text: "Guardando…",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      className: "bg-bg-2 text-fg-2 border-[color:var(--border)]",
    };
  }
  if (status.kind === "error") {
    return {
      key: "error",
      text: "Error al guardar",
      icon: <AlertTriangle className="h-3 w-3" />,
      className: "bg-red/10 text-red-2 border-red/30",
    };
  }
  if (status.kind === "conflict") {
    return {
      key: "conflict",
      text: "Recargá — cambió en otra pestaña",
      icon: <CloudOff className="h-3 w-3" />,
      className: "bg-amber/10 text-amber-2 border-amber/30",
    };
  }
  if (status.kind === "saved") {
    const secs = Math.max(0, Math.round((Date.now() - status.at) / 1000));
    const txt = secs < 3 ? "Guardado" : secs < 60 ? `Guardado hace ${secs}s` : `Guardado hace ${Math.round(secs / 60)}m`;
    return {
      key: "saved",
      text: txt,
      icon: <Check className="h-3 w-3" />,
      className: "bg-bg-2 text-fg-3 border-[color:var(--border)]",
    };
  }
  // idle
  if (dirty) {
    return {
      key: "dirty",
      text: "Cambios sin guardar",
      icon: <span className="h-1.5 w-1.5 rounded-full bg-amber animate-pulse" />,
      className: "bg-amber/10 text-amber-2 border-amber/20",
    };
  }
  return {
    key: "idle",
    text: "Al día",
    icon: <span className="h-1.5 w-1.5 rounded-full bg-fg-4" />,
    className: "bg-bg-2 text-fg-3 border-[color:var(--border)]",
  };
}
