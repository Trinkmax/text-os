"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TexMascot, type TexVariant } from "./tex-mascot";
import { TexSpeechBubble, type TexBubbleTone } from "./tex-speech-bubble";

export interface TexTipProps {
  id: string;
  message: React.ReactNode;
  variant?: TexVariant;
  tone?: TexBubbleTone;
  placement?: "inline" | "bottom-right" | "bottom-left";
  delayMs?: number;
  persistDismissal?: boolean;
  cta?: React.ReactNode;
  className?: string;
}

export function TexTip({
  id,
  message,
  variant = "support",
  tone = "info",
  placement = "inline",
  delayMs = 0,
  persistDismissal = true,
  cta,
  className,
}: TexTipProps) {
  const storageKey = `tex:tip:${id}`;
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (persistDismissal && typeof window !== "undefined") {
      if (window.localStorage.getItem(storageKey) === "dismissed") return;
    }
    const t = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(t);
  }, [delayMs, persistDismissal, storageKey]);

  function dismiss() {
    setVisible(false);
    if (persistDismissal && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "dismissed");
    }
  }

  if (!mounted) return null;

  const wrapperClass =
    placement === "bottom-right"
      ? "fixed bottom-5 right-5 z-30"
      : placement === "bottom-left"
        ? "fixed bottom-5 left-5 z-30"
        : "relative";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`tip-${id}`}
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className={cn(wrapperClass, className)}
        >
          <div className="flex items-end gap-2">
            <TexMascot variant={variant} size="sm" decorative />
            <div className="relative">
              <TexSpeechBubble tail="bottom-left" tone={tone} maxWidth={280}>
                <div className="pr-5">{message}</div>
                {cta && <div className="mt-2">{cta}</div>}
              </TexSpeechBubble>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Cerrar tip de Tex"
                className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center text-[var(--tex-bubble-ink)] hover:opacity-70"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
