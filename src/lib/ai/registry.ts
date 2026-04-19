// Catálogo de proveedores y modelos soportados.
// Mantener acá el source-of-truth para que la UI y la capa de inferencia
// compartan la misma lista. Agregar un modelo nuevo = agregarlo acá.

export type ProviderId =
  | "vercel_gateway"
  | "openai"
  | "anthropic"
  | "google"
  | "groq"
  | "mistral"
  | "ollama"
  | "custom";

export type Role = "generation" | "classification" | "embedding";

export type ModelDef = {
  id: string; // id usado por el SDK del proveedor (o string "provider/model" para gateway)
  label: string; // nombre humano
  roles: Role[]; // qué tareas soporta
  context?: number; // tokens
  inputPer1M?: number; // USD por 1M tokens input
  outputPer1M?: number; // USD por 1M tokens output
  recommended?: boolean;
  notes?: string;
};

export type ProviderDef = {
  id: ProviderId;
  label: string;
  tagline: string;
  /** Color hex para las tarjetas de UI. */
  color: string;
  /** Clave de API requerida (nombre de campo en `secrets`). null = no requiere. */
  apiKeyField: string | null;
  /** Si soporta pasar `base_url` personalizada (self-hosted, proxies, etc.). */
  supportsBaseUrl: boolean;
  /** Etiqueta de "seguridad": cuánta retención de datos tiene por default. */
  dataRetention: "zero" | "low" | "standard" | "self_hosted";
  docsUrl: string;
  models: ModelDef[];
};

// -----------------------------------------------------------------------------
// Nota sobre Vercel AI Gateway
// -----------------------------------------------------------------------------
// Es la vía recomendada: un solo API key, rutea a múltiples proveedores,
// failover automático, observabilidad y zero-data-retention por default.
// Los ids de modelo siguen el formato "provider/model" (ej "openai/gpt-4o-mini").
export const PROVIDERS: ProviderDef[] = [
  {
    id: "vercel_gateway",
    label: "Vercel AI Gateway",
    tagline: "Un key para todos los modelos. Recomendado.",
    color: "#000000",
    apiKeyField: "api_key",
    supportsBaseUrl: false,
    dataRetention: "zero",
    docsUrl: "https://vercel.com/docs/ai-gateway",
    models: [
      {
        id: "anthropic/claude-sonnet-4-5",
        label: "Claude Sonnet 4.5",
        roles: ["generation", "classification"],
        context: 200_000,
        inputPer1M: 3,
        outputPer1M: 15,
        recommended: true,
        notes: "Mejor calidad en castellano rioplatense.",
      },
      {
        id: "anthropic/claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        roles: ["generation", "classification"],
        context: 200_000,
        inputPer1M: 1,
        outputPer1M: 5,
        notes: "Rápido y barato para triage.",
      },
      {
        id: "openai/gpt-4o-mini",
        label: "GPT-4o mini",
        roles: ["generation", "classification"],
        context: 128_000,
        inputPer1M: 0.15,
        outputPer1M: 0.6,
        notes: "Muy barato para clasificación masiva.",
      },
      {
        id: "openai/gpt-4.1",
        label: "GPT-4.1",
        roles: ["generation"],
        context: 1_000_000,
        inputPer1M: 2,
        outputPer1M: 8,
      },
      {
        id: "google/gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        roles: ["generation"],
        context: 2_000_000,
        inputPer1M: 1.25,
        outputPer1M: 10,
      },
      {
        id: "google/gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        roles: ["generation", "classification"],
        context: 1_000_000,
        inputPer1M: 0.3,
        outputPer1M: 2.5,
      },
      {
        id: "openai/text-embedding-3-small",
        label: "Embedding 3 small",
        roles: ["embedding"],
        inputPer1M: 0.02,
        recommended: true,
      },
      {
        id: "openai/text-embedding-3-large",
        label: "Embedding 3 large",
        roles: ["embedding"],
        inputPer1M: 0.13,
      },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic",
    tagline: "Claude directo (tu propia cuenta).",
    color: "#D4A27F",
    apiKeyField: "api_key",
    supportsBaseUrl: false,
    dataRetention: "zero",
    docsUrl: "https://docs.anthropic.com",
    models: [
      {
        id: "claude-sonnet-4-5",
        label: "Claude Sonnet 4.5",
        roles: ["generation", "classification"],
        context: 200_000,
        inputPer1M: 3,
        outputPer1M: 15,
        recommended: true,
      },
      {
        id: "claude-haiku-4-5",
        label: "Claude Haiku 4.5",
        roles: ["generation", "classification"],
        context: 200_000,
        inputPer1M: 1,
        outputPer1M: 5,
      },
      {
        id: "claude-opus-4-5",
        label: "Claude Opus 4.5",
        roles: ["generation"],
        context: 200_000,
        inputPer1M: 15,
        outputPer1M: 75,
        notes: "Máxima calidad, caro.",
      },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    tagline: "GPT directo desde tu cuenta OpenAI.",
    color: "#10A37F",
    apiKeyField: "api_key",
    supportsBaseUrl: true,
    dataRetention: "standard",
    docsUrl: "https://platform.openai.com/docs",
    models: [
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        roles: ["generation", "classification"],
        context: 128_000,
        inputPer1M: 0.15,
        outputPer1M: 0.6,
        recommended: true,
      },
      {
        id: "gpt-4.1",
        label: "GPT-4.1",
        roles: ["generation"],
        context: 1_000_000,
        inputPer1M: 2,
        outputPer1M: 8,
      },
      {
        id: "gpt-4.1-mini",
        label: "GPT-4.1 mini",
        roles: ["generation", "classification"],
        context: 1_000_000,
        inputPer1M: 0.4,
        outputPer1M: 1.6,
      },
      {
        id: "text-embedding-3-small",
        label: "Embedding 3 small",
        roles: ["embedding"],
        inputPer1M: 0.02,
        recommended: true,
      },
      {
        id: "text-embedding-3-large",
        label: "Embedding 3 large",
        roles: ["embedding"],
        inputPer1M: 0.13,
      },
    ],
  },
  {
    id: "google",
    label: "Google Gemini",
    tagline: "Gemini directo con tu key de AI Studio.",
    color: "#4285F4",
    apiKeyField: "api_key",
    supportsBaseUrl: false,
    dataRetention: "standard",
    docsUrl: "https://ai.google.dev",
    models: [
      {
        id: "gemini-2.5-pro",
        label: "Gemini 2.5 Pro",
        roles: ["generation"],
        context: 2_000_000,
        inputPer1M: 1.25,
        outputPer1M: 10,
      },
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash",
        roles: ["generation", "classification"],
        context: 1_000_000,
        inputPer1M: 0.3,
        outputPer1M: 2.5,
        recommended: true,
      },
      {
        id: "text-embedding-004",
        label: "Text Embedding 004",
        roles: ["embedding"],
        inputPer1M: 0,
        notes: "Gratuito dentro del free tier.",
      },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    tagline: "Latencia sub-segundo para clasificación.",
    color: "#F55036",
    apiKeyField: "api_key",
    supportsBaseUrl: false,
    dataRetention: "low",
    docsUrl: "https://console.groq.com/docs",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B",
        roles: ["generation", "classification"],
        context: 131_072,
        inputPer1M: 0.59,
        outputPer1M: 0.79,
      },
    ],
  },
  {
    id: "mistral",
    label: "Mistral",
    tagline: "Modelos europeos, buen castellano.",
    color: "#FA500F",
    apiKeyField: "api_key",
    supportsBaseUrl: false,
    dataRetention: "low",
    docsUrl: "https://docs.mistral.ai",
    models: [
      {
        id: "mistral-large-latest",
        label: "Mistral Large",
        roles: ["generation"],
        context: 128_000,
        inputPer1M: 2,
        outputPer1M: 6,
      },
      {
        id: "mistral-embed",
        label: "Mistral Embed",
        roles: ["embedding"],
        inputPer1M: 0.1,
      },
    ],
  },
  {
    id: "ollama",
    label: "Ollama (self-hosted)",
    tagline: "Corre un modelo en tu servidor.",
    color: "#475569",
    apiKeyField: null,
    supportsBaseUrl: true,
    dataRetention: "self_hosted",
    docsUrl: "https://ollama.com",
    models: [
      { id: "llama3.1:8b", label: "Llama 3.1 8B", roles: ["generation", "classification"] },
      { id: "qwen2.5:14b", label: "Qwen 2.5 14B", roles: ["generation"] },
      { id: "nomic-embed-text", label: "Nomic Embed", roles: ["embedding"] },
    ],
  },
  {
    id: "custom",
    label: "OpenAI-compatible",
    tagline: "Cualquier endpoint compatible con OpenAI.",
    color: "#64748B",
    apiKeyField: "api_key",
    supportsBaseUrl: true,
    dataRetention: "standard",
    docsUrl: "",
    models: [
      { id: "custom-model", label: "Modelo personalizado", roles: ["generation", "classification"] },
    ],
  },
];

export const PROVIDER_BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function findModel(providerId: ProviderId, modelId: string): ModelDef | null {
  const provider = PROVIDER_BY_ID.get(providerId);
  if (!provider) return null;
  return provider.models.find((m) => m.id === modelId) ?? null;
}

export function modelsForRole(providerId: ProviderId, role: Role): ModelDef[] {
  const provider = PROVIDER_BY_ID.get(providerId);
  if (!provider) return [];
  return provider.models.filter((m) => m.roles.includes(role));
}

export const ROLE_META: Record<Role, { label: string; description: string; hint: string }> = {
  generation: {
    label: "Generación",
    description: "Redacta respuestas al cliente.",
    hint: "El más importante. Elegí calidad antes que precio.",
  },
  classification: {
    label: "Clasificación",
    description: "Entiende intención y extrae datos.",
    hint: "Se llama en cada mensaje. Priorizá latencia y costo.",
  },
  embedding: {
    label: "Búsqueda semántica",
    description: "Indexa tu conocimiento para RAG.",
    hint: "Se llama una vez por tarjeta. No necesita ser el más grande.",
  },
};
