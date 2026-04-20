// Tipos y Zod schemas del módulo Flujos.
// Son la única fuente de verdad que comparten Server Actions, cliente,
// y el motor de ejecución (src/lib/flows/engine.ts).

import { z } from "zod";

// =========================================================================
// NODOS — discriminated union por type
// =========================================================================

export const SEMAPHORES = ["green", "amber", "red"] as const;
export type Semaphore = (typeof SEMAPHORES)[number];

export const NODE_TYPES = [
  "start",
  "saludo",
  "calif",
  "faq",
  "datos",
  "agendar",
  "pagar",
  "derivar",
  "cerrar",
  "condition",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

// --- Config por tipo de nodo ----------------------------------------------

export const StartConfigSchema = z.object({
  trigger: z.enum(["message", "keyword", "new_contact"]).default("message"),
  keywords: z.array(z.string()).default([]),
});

export const SaludoConfigSchema = z.object({
  message: z.string().min(1, "El saludo no puede estar vacío"),
  delayMs: z.number().int().min(0).max(10_000).default(0),
});

export const CalifConfigSchema = z.object({
  questions: z.array(z.string().min(1)).min(1, "Agregá al menos una pregunta"),
  writeToVariable: z.string().min(1).default("calificacion"),
});

export const FaqConfigSchema = z.object({
  kbScope: z.array(z.string()).default([]),
  maxAnswers: z.number().int().min(1).max(5).default(1),
  fallbackMessage: z.string().default("Dejame revisar y te respondo en un toque."),
});

export const DatosConfigSchema = z.object({
  variable: z.string().min(1, "Nombre de variable requerido"),
  prompt: z.string().min(1, "¿Qué le preguntás al cliente?"),
  validation: z.enum(["none", "email", "phone", "number"]).default("none"),
  retries: z.number().int().min(0).max(3).default(1),
});

export const AgendarConfigSchema = z.object({
  calendarIntegration: z.enum(["none", "calendly", "custom_link"]).default("none"),
  link: z.string().url().optional().or(z.literal("")),
  fallbackMessage: z.string().default("Te paso un link para que elijas el horario."),
});

export const PagarConfigSchema = z.object({
  amount: z.union([z.number().positive(), z.literal("variable")]).default("variable"),
  amountVariable: z.string().default("monto_a_pagar"),
  currency: z.enum(["ARS", "USD", "BRL", "MXN"]).default("ARS"),
  method: z.enum(["none", "link_mp", "link_stripe", "custom"]).default("none"),
  link: z.string().url().optional().or(z.literal("")),
});

export const DerivarConfigSchema = z.object({
  message: z.string().default("Ya te conecto con una persona del equipo."),
  assignTo: z.string().optional(),
  setAiMode: z.enum(["off", "suggest"]).default("off"),
  setSemaphore: z.enum(["amber", "red"]).default("red"),
});

export const CerrarConfigSchema = z.object({
  farewell: z.string().default("¡Gracias por escribirnos! Estamos para lo que necesites."),
  setStage: z.string().optional(),
});

export const ConditionBranchSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  // Predicate mini-DSL: "intent == 'comprar'", "variable.nombre exists", etc.
  predicate: z.string().default(""),
});
export const ConditionConfigSchema = z.object({
  branches: z.array(ConditionBranchSchema).min(2, "Agregá al menos 2 ramas"),
});

export type StartConfig = z.infer<typeof StartConfigSchema>;
export type SaludoConfig = z.infer<typeof SaludoConfigSchema>;
export type CalifConfig = z.infer<typeof CalifConfigSchema>;
export type FaqConfig = z.infer<typeof FaqConfigSchema>;
export type DatosConfig = z.infer<typeof DatosConfigSchema>;
export type AgendarConfig = z.infer<typeof AgendarConfigSchema>;
export type PagarConfig = z.infer<typeof PagarConfigSchema>;
export type DerivarConfig = z.infer<typeof DerivarConfigSchema>;
export type CerrarConfig = z.infer<typeof CerrarConfigSchema>;
export type ConditionConfig = z.infer<typeof ConditionConfigSchema>;

export type NodeConfigMap = {
  start: StartConfig;
  saludo: SaludoConfig;
  calif: CalifConfig;
  faq: FaqConfig;
  datos: DatosConfig;
  agendar: AgendarConfig;
  pagar: PagarConfig;
  derivar: DerivarConfig;
  cerrar: CerrarConfig;
  condition: ConditionConfig;
};

// --- Nodo (row del graph) -------------------------------------------------

// Cada variante del union: mismos campos comunes + `type` y `config` discriminados.
type NodeBase = {
  id: string;
  x: number;
  y: number;
  title: string;
  summary: string;
  semaphore: Semaphore;
  disabled?: boolean;
  notes?: string;
};

export type FlowNode = NodeBase &
  {
    [K in NodeType]: { type: K; config: NodeConfigMap[K] };
  }[NodeType];

export const NodeSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string(),
    type: z.literal("start"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: StartConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("saludo"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: SaludoConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("calif"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: CalifConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("faq"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: FaqConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("datos"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: DatosConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("agendar"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: AgendarConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("pagar"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: PagarConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("derivar"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: DerivarConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("cerrar"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: CerrarConfigSchema,
  }),
  z.object({
    id: z.string(),
    type: z.literal("condition"),
    x: z.number(),
    y: z.number(),
    title: z.string(),
    summary: z.string(),
    semaphore: z.enum(SEMAPHORES),
    disabled: z.boolean().optional(),
    notes: z.string().optional(),
    config: ConditionConfigSchema,
  }),
]);

// =========================================================================
// EDGES
// =========================================================================

export type FlowEdge = {
  id: string;
  from: string;
  to: string;
  // Handle id del source (para nodos con múltiples salidas, ej. condition).
  sourceHandle?: string | null;
  label?: string;
  // Predicate opcional independiente del sourceHandle, por si queremos
  // condicionar un edge sin ser una condition node.
  condition?: string;
};

export const EdgeSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  sourceHandle: z.string().nullable().optional(),
  label: z.string().optional(),
  condition: z.string().optional(),
});

// =========================================================================
// VIEWPORT
// =========================================================================

export const ViewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().min(0.1).max(4),
});
export type Viewport = z.infer<typeof ViewportSchema>;

// =========================================================================
// GRAPH (lo que se guarda en JSONB)
// =========================================================================

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
};

export const GraphSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  viewport: ViewportSchema,
});

// =========================================================================
// Helpers de guardado/carga (cast Json → FlowGraph con defaults)
// =========================================================================

export function parseGraph(raw: {
  nodes?: unknown;
  edges?: unknown;
  viewport?: unknown;
}): FlowGraph {
  const parsed = GraphSchema.safeParse({
    nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
    edges: Array.isArray(raw.edges) ? raw.edges : [],
    viewport: raw.viewport ?? { x: 0, y: 0, zoom: 1 },
  });
  if (parsed.success) return parsed.data;
  // Fallback defensivo: si hay un nodo viejo sin `config`, lo normalizamos.
  const nodes = Array.isArray(raw.nodes)
    ? (raw.nodes as unknown[]).map((n) => normalizeLegacyNode(n)).filter(Boolean) as FlowNode[]
    : [];
  const edges = Array.isArray(raw.edges)
    ? (raw.edges as unknown[]).map((e) => normalizeLegacyEdge(e)).filter(Boolean) as FlowEdge[]
    : [];
  const viewport = (raw.viewport as Viewport) ?? { x: 0, y: 0, zoom: 1 };
  return { nodes, edges, viewport };
}

function normalizeLegacyNode(raw: unknown): FlowNode | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const type = (r.type as NodeType) || "saludo";
  if (!NODE_TYPES.includes(type)) return null;
  const base = {
    id: String(r.id ?? crypto.randomUUID()),
    x: Number(r.x ?? 0),
    y: Number(r.y ?? 0),
    title: String(r.title ?? defaultTitle(type)),
    summary: String(r.summary ?? ""),
    semaphore: (SEMAPHORES.includes(r.semaphore as Semaphore) ? r.semaphore : "amber") as Semaphore,
    disabled: r.disabled === true,
    notes: typeof r.notes === "string" ? r.notes : undefined,
  };
  const config = (r.config && typeof r.config === "object" ? r.config : {}) as Record<string, unknown>;
  return { ...base, type, config: mergeDefaultsForType(type, config) } as FlowNode;
}

function normalizeLegacyEdge(raw: unknown): FlowEdge | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const from = String(r.from ?? r.source ?? "");
  const to = String(r.to ?? r.target ?? "");
  if (!from || !to) return null;
  return {
    id: String(r.id ?? `${from}->${to}`),
    from,
    to,
    sourceHandle: typeof r.sourceHandle === "string" ? r.sourceHandle : null,
    label: typeof r.label === "string" ? r.label : undefined,
    condition: typeof r.condition === "string" ? r.condition : undefined,
  };
}

function defaultTitle(t: NodeType): string {
  return {
    start: "Inicio",
    saludo: "Saludo",
    calif: "Calificación",
    faq: "FAQ",
    datos: "Recolectar dato",
    agendar: "Agendar",
    pagar: "Pagar",
    derivar: "Derivar",
    cerrar: "Cerrar",
    condition: "Condición",
  }[t];
}

function mergeDefaultsForType(type: NodeType, config: Record<string, unknown>): NodeConfigMap[NodeType] {
  const schemas: Record<NodeType, z.ZodTypeAny> = {
    start: StartConfigSchema,
    saludo: SaludoConfigSchema,
    calif: CalifConfigSchema,
    faq: FaqConfigSchema,
    datos: DatosConfigSchema,
    agendar: AgendarConfigSchema,
    pagar: PagarConfigSchema,
    derivar: DerivarConfigSchema,
    cerrar: CerrarConfigSchema,
    condition: ConditionConfigSchema,
  };
  const res = schemas[type].safeParse(config);
  if (res.success) return res.data as NodeConfigMap[NodeType];
  // Si falla, usamos el parse con objeto vacío — trae defaults del schema.
  return schemas[type].parse(defaultConfigFor(type)) as NodeConfigMap[NodeType];
}

export function defaultConfigFor(type: NodeType): NodeConfigMap[NodeType] {
  switch (type) {
    case "start":
      return { trigger: "message", keywords: [] };
    case "saludo":
      return { message: "¡Hola! ¿En qué te puedo ayudar?", delayMs: 0 };
    case "calif":
      return { questions: ["¿Cuál es tu nombre?"], writeToVariable: "calificacion" };
    case "faq":
      return { kbScope: [], maxAnswers: 1, fallbackMessage: "Dejame revisar y te respondo en un toque." };
    case "datos":
      return { variable: "nuevo_dato", prompt: "¿Me pasás el dato?", validation: "none", retries: 1 };
    case "agendar":
      return { calendarIntegration: "none", link: "", fallbackMessage: "Te paso un link para elegir horario." };
    case "pagar":
      return {
        amount: "variable",
        amountVariable: "monto_a_pagar",
        currency: "ARS",
        method: "none",
        link: "",
      };
    case "derivar":
      return { message: "Ya te conecto con una persona del equipo.", setAiMode: "off", setSemaphore: "red" };
    case "cerrar":
      return { farewell: "¡Gracias por escribirnos!" };
    case "condition":
      return {
        branches: [
          { id: "branch-yes", label: "Sí", predicate: "" },
          { id: "branch-no", label: "No", predicate: "" },
        ],
      };
  }
}
