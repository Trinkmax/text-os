"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { TexSpeechBubble, type TexBubbleTone } from "./tex-speech-bubble";
import { useTypewriter } from "./use-typewriter";
import { useTexFrames } from "./use-tex-frames";
import type { TexSize } from "./tex-mascot";

const FRAME_PX: Record<TexSize, number> = {
  xs: 48,
  sm: 72,
  md: 112,
  lg: 160,
  xl: 220,
};

export interface TexTalkingProps {
  messages: string[];
  onComplete?: () => void;
  onMessageChange?: (index: number) => void;
  charIntervalMs?: number;
  pauseBetweenMs?: number;
  loop?: boolean;
  size?: TexSize;
  tone?: TexBubbleTone;
  autoplay?: boolean;
  className?: string;
  bubbleMaxWidth?: number;
}

export function TexTalking({
  messages,
  onComplete,
  onMessageChange,
  charIntervalMs = 28,
  pauseBetweenMs = 1400,
  loop = false,
  size = "xl",
  tone = "neutral",
  autoplay = true,
  className,
  bubbleMaxWidth = 420,
}: TexTalkingProps) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(!autoplay);
  const current = messages[index] ?? "";

  const { text, isTyping, done } = useTypewriter({
    text: current,
    charIntervalMs,
    enabled: !reduced && !paused,
    startDelayMs: 240,
  });

  const frame = useTexFrames(isTyping && !reduced, reduced);

  // Advance between messages
  useEffect(() => {
    if (paused || !done) return;
    const isLast = index >= messages.length - 1;
    if (isLast) {
      if (loop) {
        const t = setTimeout(() => setIndex(0), pauseBetweenMs);
        return () => clearTimeout(t);
      }
      onComplete?.();
      return;
    }
    const t = setTimeout(() => {
      setIndex((i) => i + 1);
      onMessageChange?.(index + 1);
    }, pauseBetweenMs);
    return () => clearTimeout(t);
  }, [done, index, messages.length, loop, pauseBetweenMs, paused, onComplete, onMessageChange]);

  const px = FRAME_PX[size];
  const displayText = reduced ? current : text;

  return (
    <div className={cn("flex flex-col items-center gap-6 relative", className)}>
      {/* Bubble above */}
      <div className="min-h-[96px] flex items-end justify-center w-full">
        <TexSpeechBubble
          key={`msg-${index}`}
          tail="bottom-left"
          tone={tone}
          maxWidth={bubbleMaxWidth}
          className="tex-pop-in text-[15px] md:text-[17px] font-medium"
          aria-live="polite"
        >
          <span
            className="whitespace-pre-wrap leading-snug"
            aria-label={current}
          >
            {displayText || "\u00a0"}
            {!reduced && isTyping && (
              <span
                className="inline-block w-[2px] h-[1em] align-[-2px] ml-[2px] bg-[var(--tex-bubble-border)]"
                style={{ animation: "caretBlink 1s step-end infinite" }}
                aria-hidden
              />
            )}
          </span>
        </TexSpeechBubble>
      </div>

      {/* Mascot — 3-frame cycling animation */}
      <div
        className="tex-talking-container relative tex-idle-float"
        style={{ width: px, height: px }}
        aria-hidden
      >
        <Image
          src="/mascot/tex-talk-1.png"
          alt=""
          width={px}
          height={px}
          data-active={frame === 1}
          className="pixelated select-none"
          draggable={false}
          priority
          unoptimized
        />
        <Image
          src="/mascot/tex-talk-2.png"
          alt=""
          width={px}
          height={px}
          data-active={frame === 2}
          className="pixelated select-none"
          draggable={false}
          unoptimized
        />
        <Image
          src="/mascot/tex-talk-3.png"
          alt=""
          width={px}
          height={px}
          data-active={frame === 3}
          className="pixelated select-none"
          draggable={false}
          unoptimized
        />
      </div>

      {/* Invisible control surface — click Tex to skip ahead */}
      {!paused && (
        <button
          type="button"
          onClick={() => {
            if (isTyping) {
              // Skip to end of current
              return;
            }
            if (index < messages.length - 1) {
              setIndex((i) => i + 1);
              onMessageChange?.(index + 1);
            } else {
              onComplete?.();
            }
          }}
          className="sr-only"
          aria-label="Avanzar al siguiente mensaje de Tex"
        />
      )}
    </div>
  );
}
