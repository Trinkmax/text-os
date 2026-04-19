"use client";

import { cn } from "@/lib/utils";
import { TexMascot, type TexMascotProps, type TexVariant, type TexSize } from "./tex-mascot";
import { TexSpeechBubble, type TexBubbleTone } from "./tex-speech-bubble";

export interface TexSaysProps {
  variant?: TexVariant;
  message: React.ReactNode;
  position?: "left" | "right";
  size?: TexSize;
  tone?: TexBubbleTone;
  layout?: "row" | "stack";
  cta?: React.ReactNode;
  maxBubbleWidth?: number;
  className?: string;
  mascotProps?: Partial<TexMascotProps>;
  ariaLive?: "off" | "polite" | "assertive";
}

export function TexSays({
  variant = "default",
  message,
  position = "left",
  size = "md",
  tone = "neutral",
  layout = "row",
  cta,
  maxBubbleWidth = 320,
  className,
  mascotProps,
  ariaLive = "polite",
}: TexSaysProps) {
  const mascot = (
    <TexMascot
      variant={variant}
      size={size}
      {...mascotProps}
      className={cn("shrink-0", mascotProps?.className)}
    />
  );
  const bubble = (
    <TexSpeechBubble
      tail={
        layout === "stack"
          ? position === "left"
            ? "bottom-left"
            : "bottom-right"
          : position === "left"
            ? "bottom-left"
            : "bottom-right"
      }
      tone={tone}
      maxWidth={maxBubbleWidth}
      aria-live={ariaLive}
    >
      <div>{message}</div>
      {cta && <div className="mt-3">{cta}</div>}
    </TexSpeechBubble>
  );

  if (layout === "stack") {
    return (
      <div className={cn("flex flex-col items-start gap-2", position === "right" && "items-end", className)}>
        {bubble}
        {mascot}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-end gap-3",
        position === "right" && "flex-row-reverse",
        className
      )}
    >
      {mascot}
      {bubble}
    </div>
  );
}
