// Registry config-driven para la paleta de nodos y sus metadatos visuales.
// Todas las decisiones estéticas de un tipo de nodo viven acá (icono, color,
// semáforo por defecto, y label). Agregar un tipo nuevo = agregar una entrada.

import {
  MessageCircle,
  UserCheck,
  Clipboard,
  CalendarClock,
  CreditCard,
  ArrowRightFromLine,
  Power,
  Sparkles,
  PlayCircle,
  GitBranch,
  type LucideIcon,
} from "lucide-react";
import type { NodeType, Semaphore } from "./flow";
import { defaultConfigFor } from "./flow";

export type NodeRegistryEntry = {
  type: NodeType;
  title: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  semaphore: Semaphore;
  // ¿Cuántas salidas tiene por defecto? condition nodos generan handles
  // dinámicos según branches.length.
  outputs: "single" | "dynamic";
  // Accent color para el header del nodo en canvas. Usa tokens CSS.
  accent: "brand" | "green" | "amber" | "red" | "blue";
};

export const NODE_REGISTRY: Record<NodeType, NodeRegistryEntry> = {
  start: {
    type: "start",
    title: "Inicio",
    shortLabel: "Inicio",
    description: "Punto de entrada del flujo. Se dispara con el primer mensaje del contacto.",
    icon: PlayCircle,
    semaphore: "green",
    outputs: "single",
    accent: "brand",
  },
  saludo: {
    type: "saludo",
    title: "Saludo",
    shortLabel: "Saludo",
    description: "Mensaje de bienvenida. Suele ser el primer paso después de Inicio.",
    icon: MessageCircle,
    semaphore: "green",
    outputs: "single",
    accent: "green",
  },
  calif: {
    type: "calif",
    title: "Calificación",
    shortLabel: "Calificar",
    description: "Recolecta info clave del lead: presupuesto, timing, interés.",
    icon: UserCheck,
    semaphore: "amber",
    outputs: "single",
    accent: "amber",
  },
  faq: {
    type: "faq",
    title: "FAQ",
    shortLabel: "FAQ",
    description: "Responde usando el Conocimiento. La IA elige la mejor card y la redacta.",
    icon: Sparkles,
    semaphore: "green",
    outputs: "single",
    accent: "green",
  },
  datos: {
    type: "datos",
    title: "Recolectar dato",
    shortLabel: "Dato",
    description: "Pide un dato puntual (email, teléfono, cantidad) y lo guarda en el contacto.",
    icon: Clipboard,
    semaphore: "amber",
    outputs: "single",
    accent: "amber",
  },
  agendar: {
    type: "agendar",
    title: "Agendar",
    shortLabel: "Agendar",
    description: "Comparte un link de calendario o agenda directamente una cita.",
    icon: CalendarClock,
    semaphore: "amber",
    outputs: "single",
    accent: "blue",
  },
  pagar: {
    type: "pagar",
    title: "Pagar",
    shortLabel: "Cobrar",
    description: "Genera un link de pago (Mercado Pago, Stripe) y lo manda.",
    icon: CreditCard,
    semaphore: "red",
    outputs: "single",
    accent: "red",
  },
  derivar: {
    type: "derivar",
    title: "Derivar",
    shortLabel: "Humano",
    description: "Pasa la conversación a un humano. La IA deja de responder sola.",
    icon: ArrowRightFromLine,
    semaphore: "red",
    outputs: "single",
    accent: "red",
  },
  cerrar: {
    type: "cerrar",
    title: "Cerrar",
    shortLabel: "Cerrar",
    description: "Termina el flujo con un mensaje de despedida y actualiza el stage del contacto.",
    icon: Power,
    semaphore: "green",
    outputs: "single",
    accent: "green",
  },
  condition: {
    type: "condition",
    title: "Condición",
    shortLabel: "If/Else",
    description: "Ramifica el flujo según la intención detectada o una variable del contacto.",
    icon: GitBranch,
    semaphore: "amber",
    outputs: "dynamic",
    accent: "brand",
  },
};

// Tipos visibles en la paleta (excluímos `start` porque se crea automáticamente).
export const PALETTE_TYPES: NodeType[] = [
  "saludo",
  "faq",
  "calif",
  "datos",
  "agendar",
  "pagar",
  "condition",
  "derivar",
  "cerrar",
];

export const PALETTE_GROUPS: Array<{ label: string; types: NodeType[] }> = [
  { label: "Básicos", types: ["saludo", "faq", "cerrar"] },
  { label: "Recolección", types: ["calif", "datos", "agendar"] },
  { label: "Comercial", types: ["pagar"] },
  { label: "Lógica", types: ["condition", "derivar"] },
];

// Helper para crear un nodo nuevo con defaults del registry + config defaults.
export function makeNode(params: {
  type: Exclude<NodeType, "start"> | "start";
  x: number;
  y: number;
  id?: string;
}) {
  const entry = NODE_REGISTRY[params.type];
  const id = params.id ?? `n_${Math.random().toString(36).slice(2, 10)}`;
  return {
    id,
    type: params.type,
    x: params.x,
    y: params.y,
    title: entry.title,
    summary: entry.description,
    semaphore: entry.semaphore,
    config: defaultConfigFor(params.type),
  } as const;
}
