"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, Sparkles } from "lucide-react";
import { TexMascot } from "./tex-mascot";
import { TexSpeechBubble } from "./tex-speech-bubble";
import { TEX_COPY } from "./tex-copy";
import { cn } from "@/lib/utils";
import { useFocus } from "@/components/shell/focus-context";

const DISMISS_KEY = "tex:floating:dismissed-session";
const TIP_ROTATION = [
  TEX_COPY.support.hi,
  TEX_COPY.support.palette,
  TEX_COPY.tips.focusMode,
  TEX_COPY.tips.knowledge,
];

export function TexFloating() {
  const { focus } = useFocus();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [tipIdx, setTipIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      setDismissed(true);
      return;
    }
    // Peek bubble after 6s on first load
    const t = setTimeout(() => setOpen(true), 6000);
    // Auto-hide the peek after 8s unless hovered
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setOpen(false), 8000);
    return () => clearTimeout(t);
  }, [open, tipIdx]);

  const rotate = useCallback(() => {
    setTipIdx((i) => (i + 1) % TIP_ROTATION.length);
  }, []);

  function dismiss() {
    setDismissed(true);
    setOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "1");
    }
  }

  if (!mounted || dismissed || focus) return null;

  return (
    <div className={cn("fixed bottom-5 right-5 z-30 flex items-end gap-2 pointer-events-none")}>
      <AnimatePresence>
        {open && (
          <motion.div
            key={`tex-tip-${tipIdx}`}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="pointer-events-auto relative"
          >
            <TexSpeechBubble tail="bottom-right" tone="info" maxWidth={260}>
              <div className="pr-4 text-[13px] leading-snug">{TIP_ROTATION[tipIdx]}</div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={rotate}
                  className="pixel-button text-[10px] px-2 py-1"
                >
                  <Sparkles className="h-3 w-3" />
                  Otro
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-[10px] font-semibold uppercase tracking-wider text-[var(--tex-bubble-border)] hover:opacity-70"
                >
                  Entendido
                </button>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar tip"
                className="absolute top-1 right-1 h-5 w-5 flex items-center justify-center text-[var(--tex-bubble-ink)] hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </TexSpeechBubble>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
        }}
        onMouseEnter={() => setOpen(true)}
        aria-label="Tex, tu asistente"
        className={cn(
          "pointer-events-auto rounded-full outline-none",
          "focus-visible:ring-2 focus-visible:ring-[var(--tex-blue-2)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-0)]"
        )}
      >
        <TexMascot variant="support" size="md" popIn idle />
      </button>
    </div>
  );
}
