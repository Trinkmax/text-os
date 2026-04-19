"use client";

import { cn } from "@/lib/utils";
import { TexMascot, type TexVariant, type TexSize } from "./tex-mascot";
import { TexSpeechBubble, type TexBubbleTone } from "./tex-speech-bubble";

export interface TexEmptyProps {
  variant?: TexVariant;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  message?: React.ReactNode;
  tone?: TexBubbleTone;
  size?: TexSize;
  className?: string;
}

export function TexEmpty({
  variant = "default",
  title,
  description,
  action,
  message,
  tone = "neutral",
  size = "lg",
  className,
}: TexEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
    >
      <div className="relative mb-5">
        <TexMascot variant={variant} size={size} popIn idle priority />
      </div>
      {message && (
        <div className="mb-5">
          <TexSpeechBubble tail="top-left" tone={tone} maxWidth={360}>
            {message}
          </TexSpeechBubble>
        </div>
      )}
      {title && <h3 className="text-lg font-semibold mb-2 text-fg">{title}</h3>}
      {description && (
        <p className="text-sm text-fg-3 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
