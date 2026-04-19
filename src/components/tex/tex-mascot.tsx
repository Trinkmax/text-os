"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export type TexVariant = "default" | "support" | "goals" | "analytics";

const VARIANT_SRC: Record<TexVariant, string> = {
  default: "/mascot/tex.png",
  support: "/mascot/tex-support.png",
  goals: "/mascot/tex-goals.png",
  analytics: "/mascot/tex-analytics.png",
};

const VARIANT_ALT: Record<TexVariant, string> = {
  default: "Tex, la mascota de TextOS",
  support: "Tex con headset, listo para ayudarte",
  goals: "Tex sosteniendo un trofeo",
  analytics: "Tex con lentes analizando datos",
};

const SIZE_PX: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 32,
  sm: 48,
  md: 64,
  lg: 96,
  xl: 160,
};

export type TexSize = keyof typeof SIZE_PX;

export interface TexMascotProps {
  variant?: TexVariant;
  size?: TexSize;
  idle?: boolean;
  popIn?: boolean;
  className?: string;
  alt?: string;
  priority?: boolean;
  decorative?: boolean;
}

export function TexMascot({
  variant = "default",
  size = "md",
  idle = true,
  popIn = true,
  className,
  alt,
  priority = false,
  decorative = false,
}: TexMascotProps) {
  const px = SIZE_PX[size];
  const src = VARIANT_SRC[variant];
  const label = alt ?? (decorative ? "" : VARIANT_ALT[variant]);
  return (
    <span
      className={cn(
        "tex-wrap relative inline-block leading-none",
        popIn && "tex-pop-in",
        idle && "tex-idle-float",
        className
      )}
      aria-hidden={decorative || undefined}
    >
      <Image
        src={src}
        alt={label}
        width={px}
        height={px}
        className="pixelated select-none"
        draggable={false}
        priority={priority}
        unoptimized
      />
    </span>
  );
}
