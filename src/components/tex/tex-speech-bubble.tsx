"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type TexBubbleTail =
  | "bottom-left"
  | "bottom-right"
  | "top-left"
  | "top-right"
  | "none";

export type TexBubbleTone = "neutral" | "celebrate" | "info" | "warn";

export interface TexSpeechBubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tail?: TexBubbleTail;
  tone?: TexBubbleTone;
  maxWidth?: number;
  /** Deprecated — caret is now inline inside children. */
  typing?: boolean;
}

export const TexSpeechBubble = forwardRef<HTMLDivElement, TexSpeechBubbleProps>(
  function TexSpeechBubble(
    { children, tail = "bottom-left", tone = "neutral", maxWidth = 320, typing: _typing, className, ...rest },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={cn("pixel-bubble text-[13px] leading-snug", className)}
        data-tail={tail === "none" ? undefined : tail}
        data-tone={tone === "neutral" ? undefined : tone}
        style={{ maxWidth }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);
