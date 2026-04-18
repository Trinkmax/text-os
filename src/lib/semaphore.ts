export type Semaphore = "green" | "amber" | "red";

export const SEMAPHORE_META: Record<
  Semaphore,
  {
    label: string;
    short: string;
    emoji: string;
    hex: string;
    ring: string;
    bg: string;
    text: string;
  }
> = {
  green: {
    label: "IA auto-resuelve",
    short: "Auto",
    emoji: "🟢",
    hex: "#10B981",
    ring: "rgba(16,185,129,0.35)",
    bg: "rgba(16,185,129,0.12)",
    text: "text-[color:var(--accent-green)]",
  },
  amber: {
    label: "IA sugiere, vos decidís",
    short: "Sugerir",
    emoji: "🟡",
    hex: "#F59E0B",
    ring: "rgba(245,158,11,0.35)",
    bg: "rgba(245,158,11,0.12)",
    text: "text-[color:var(--accent-amber)]",
  },
  red: {
    label: "Fuera de alcance — necesita humano",
    short: "Humano",
    emoji: "🔴",
    hex: "#EF4444",
    ring: "rgba(239,68,68,0.4)",
    bg: "rgba(239,68,68,0.12)",
    text: "text-[color:var(--accent-red)]",
  },
};

export function semaphoreFromConfidence(
  confidence: number,
  thresholds: { auto: number; suggest: number }
): Semaphore {
  if (confidence >= thresholds.auto) return "green";
  if (confidence >= thresholds.suggest) return "amber";
  return "red";
}

export function humanReason(confidence: number, origin?: string, uses?: number): string {
  const pct = Math.round(confidence * 100);
  if (pct >= 85) {
    return uses && uses > 5
      ? `Ya respondí ${uses} veces preguntas parecidas — alta confianza.`
      : `Coincide ${pct}% con una respuesta aprobada.`;
  }
  if (pct >= 55) {
    return uses && uses > 0
      ? `Parecido a ${uses} respuesta${uses === 1 ? "" : "s"} tuya${uses === 1 ? "" : "s"} (${pct}% match). Revisá antes de enviar.`
      : `Tengo una idea (${pct}% confianza). Confirmá o editá.`;
  }
  return "Esta pregunta está fuera de tu alcance actual.";
}
