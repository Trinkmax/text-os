"use server";

// Server Actions del módulo Flujos.
// Responsabilidades:
//   - CRUD de flows (listar/crear/renombrar/duplicar/archivar/activar).
//   - updateFlowGraph con optimistic concurrency (baseUpdatedAt).
//   - Versioning (publishFlow, rollbackFlow, listVersions).
//   - Simulador persistido (startSim / sendSim / endSim).
// Todas las actions llaman requireOrgId() + filtran por org_id en cada query.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrgId } from "@/lib/org";
import { createSbServer } from "@/lib/supabase/server";
import { createSbService } from "@/lib/channels/service";
import type { Json } from "@/lib/supabase/types";
import {
  GraphSchema,
  NodeSchema,
  EdgeSchema,
  ViewportSchema,
  parseGraph,
  type FlowGraph,
} from "@/components/flows/types/flow";
import { makeNode } from "@/components/flows/types/registry";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string; conflict?: boolean };
type Result<T> = Ok<T> | Err;

// =========================================================================
// CRUD de flujos
// =========================================================================

export async function listFlows(): Promise<
  Result<{
    flows: Array<{
      id: string;
      name: string;
      description: string | null;
      active: boolean;
      published: boolean;
      version: number;
      nodeCount: number;
      edgeCount: number;
      updatedAt: string;
    }>;
  }>
> {
  try {
    const orgId = await requireOrgId();
    const sb = await createSbServer();
    const { data, error } = await sb
      .from("textos_flows")
      .select("id,name,description,active,version,published_version_id,nodes,edges,updated_at")
      .eq("org_id", orgId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false });
    if (error) return { ok: false, error: error.message };
    const flows = (data ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      active: f.active ?? false,
      published: !!f.published_version_id,
      version: f.version,
      nodeCount: Array.isArray(f.nodes) ? f.nodes.length : 0,
      edgeCount: Array.isArray(f.edges) ? f.edges.length : 0,
      updatedAt: f.updated_at ?? new Date().toISOString(),
    }));
    return { ok: true, flows };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

export async function getFlow(flowId: string): Promise<
  Result<{
    flow: {
      id: string;
      name: string;
      description: string | null;
      active: boolean;
      version: number;
      publishedVersionId: string | null;
      updatedAt: string;
      graph: FlowGraph;
    };
    versions: Array<{ id: string; version: number; note: string | null; publishedAt: string }>;
  }>
> {
  try {
    const orgId = await requireOrgId();
    const sb = await createSbServer();
    const { data: flow, error } = await sb
      .from("textos_flows")
      .select("*")
      .eq("id", flowId)
      .eq("org_id", orgId)
      .is("archived_at", null)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!flow) return { ok: false, error: "Flujo no encontrado" };

    const { data: vers } = await sb
      .from("textos_flow_versions")
      .select("id,version,note,published_at")
      .eq("flow_id", flowId)
      .eq("org_id", orgId)
      .order("version", { ascending: false });

    return {
      ok: true,
      flow: {
        id: flow.id,
        name: flow.name,
        description: flow.description,
        active: flow.active ?? false,
        version: flow.version,
        publishedVersionId: flow.published_version_id,
        updatedAt: flow.updated_at ?? new Date().toISOString(),
        graph: parseGraph({
          nodes: flow.nodes,
          edges: flow.edges,
          viewport: flow.viewport,
        }),
      },
      versions: (vers ?? []).map((v) => ({
        id: v.id,
        version: v.version,
        note: v.note,
        publishedAt: v.published_at ?? new Date().toISOString(),
      })),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

const CreateFlowSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(80),
  template: z.enum(["blank", "saludo_basico", "ventas_simple", "soporte"]).optional(),
});

export async function createFlow(input: z.input<typeof CreateFlowSchema>): Promise<Result<{ id: string }>> {
  try {
    const orgId = await requireOrgId();
    const parsed = CreateFlowSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

    const sb = await createSbServer();
    const seed = seedGraph(parsed.data.template ?? "blank");
    const { data, error } = await sb
      .from("textos_flows")
      .insert({
        org_id: orgId,
        name: parsed.data.name,
        active: false,
        nodes: seed.nodes as unknown as Json,
        edges: seed.edges as unknown as Json,
        viewport: seed.viewport as unknown as Json,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/flujos");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

const RenameSchema = z.object({
  flowId: z.string().uuid(),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
});
export async function renameFlow(input: z.input<typeof RenameSchema>): Promise<Result<object>> {
  try {
    const orgId = await requireOrgId();
    const parsed = RenameSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
    const sb = await createSbServer();
    const { error } = await sb
      .from("textos_flows")
      .update({ name: parsed.data.name, description: parsed.data.description ?? null })
      .eq("id", parsed.data.flowId)
      .eq("org_id", orgId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/flujos");
    revalidatePath(`/flujos/${parsed.data.flowId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

export async function duplicateFlow(flowId: string): Promise<Result<{ id: string }>> {
  try {
    const orgId = await requireOrgId();
    const sb = await createSbServer();
    const { data: src } = await sb
      .from("textos_flows")
      .select("name,description,nodes,edges,viewport")
      .eq("id", flowId)
      .eq("org_id", orgId)
      .single();
    if (!src) return { ok: false, error: "Flujo no encontrado" };
    const { data, error } = await sb
      .from("textos_flows")
      .insert({
        org_id: orgId,
        name: `${src.name} (copia)`,
        description: src.description,
        active: false,
        nodes: src.nodes,
        edges: src.edges,
        viewport: src.viewport,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    revalidatePath("/flujos");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

export async function archiveFlow(flowId: string): Promise<Result<object>> {
  try {
    const orgId = await requireOrgId();
    const sb = await createSbServer();
    const { error } = await sb
      .from("textos_flows")
      .update({ archived_at: new Date().toISOString(), active: false })
      .eq("id", flowId)
      .eq("org_id", orgId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/flujos");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

const SetActiveSchema = z.object({ flowId: z.string().uuid(), active: z.boolean() });
export async function setFlowActive(input: z.input<typeof SetActiveSchema>): Promise<Result<object>> {
  try {
    const orgId = await requireOrgId();
    const parsed = SetActiveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Datos inválidos" };
    const sb = await createSbServer();
    if (parsed.data.active) {
      // Regla: sólo un flujo activo por org. Desactivamos los demás ANTES
      // de activar este. El partial unique index también lo garantiza en DB.
      const { data: target } = await sb
        .from("textos_flows")
        .select("published_version_id")
        .eq("id", parsed.data.flowId)
        .eq("org_id", orgId)
        .single();
      if (!target?.published_version_id) {
        return {
          ok: false,
          error: "Publicá el flujo antes de activarlo.",
        };
      }
      await sb
        .from("textos_flows")
        .update({ active: false })
        .eq("org_id", orgId)
        .neq("id", parsed.data.flowId);
    }
    const { error } = await sb
      .from("textos_flows")
      .update({ active: parsed.data.active })
      .eq("id", parsed.data.flowId)
      .eq("org_id", orgId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/flujos");
    revalidatePath(`/flujos/${parsed.data.flowId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

// =========================================================================
// Graph (draft) — autosave
// =========================================================================

const UpdateGraphSchema = z.object({
  flowId: z.string().uuid(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  viewport: ViewportSchema,
  // Optimistic concurrency: el cliente manda el updated_at que cargó.
  // Si no matchea, devolvemos conflict.
  baseUpdatedAt: z.string().optional(),
});

export async function updateFlowGraph(
  input: z.input<typeof UpdateGraphSchema>,
): Promise<Result<{ updatedAt: string }>> {
  try {
    const orgId = await requireOrgId();
    const parsed = UpdateGraphSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Graph inválido" };

    const sb = await createSbServer();

    if (parsed.data.baseUpdatedAt) {
      const { data: current } = await sb
        .from("textos_flows")
        .select("updated_at")
        .eq("id", parsed.data.flowId)
        .eq("org_id", orgId)
        .single();
      if (!current) return { ok: false, error: "Flujo no encontrado" };
      // Toleramos hasta 1 ms de diferencia (timestamps suelen tener microseconds).
      if (current.updated_at && current.updated_at !== parsed.data.baseUpdatedAt) {
        return { ok: false, error: "Este flujo se modificó en otro lado", conflict: true };
      }
    }

    const { data, error } = await sb
      .from("textos_flows")
      .update({
        nodes: parsed.data.nodes as unknown as Json,
        edges: parsed.data.edges as unknown as Json,
        viewport: parsed.data.viewport as unknown as Json,
      })
      .eq("id", parsed.data.flowId)
      .eq("org_id", orgId)
      .select("updated_at")
      .single();
    if (error) return { ok: false, error: error.message };

    return { ok: true, updatedAt: data.updated_at ?? new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

// =========================================================================
// Versioning — publish / rollback / list
// =========================================================================

const PublishSchema = z.object({
  flowId: z.string().uuid(),
  note: z.string().max(300).optional(),
});

export async function publishFlow(input: z.input<typeof PublishSchema>): Promise<
  Result<{ versionId: string; version: number; validation: ValidationReport }>
> {
  try {
    const orgId = await requireOrgId();
    const parsed = PublishSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Datos inválidos" };

    const sb = await createSbServer();
    const { data: flow } = await sb
      .from("textos_flows")
      .select("*")
      .eq("id", parsed.data.flowId)
      .eq("org_id", orgId)
      .single();
    if (!flow) return { ok: false, error: "Flujo no encontrado" };

    const graph = parseGraph({ nodes: flow.nodes, edges: flow.edges, viewport: flow.viewport });
    const validation = validateGraph(graph);
    if (validation.errors.length > 0) {
      return { ok: false, error: `No se puede publicar: ${validation.errors[0].message}` };
    }

    // Nueva version = max existente + 1
    const { data: maxVer } = await sb
      .from("textos_flow_versions")
      .select("version")
      .eq("flow_id", parsed.data.flowId)
      .eq("org_id", orgId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const newVersion = (maxVer?.version ?? 0) + 1;

    const { data: { user } } = await sb.auth.getUser();
    const { data: inserted, error } = await sb
      .from("textos_flow_versions")
      .insert({
        flow_id: parsed.data.flowId,
        org_id: orgId,
        version: newVersion,
        nodes: graph.nodes as unknown as Json,
        edges: graph.edges as unknown as Json,
        viewport: graph.viewport as unknown as Json,
        note: parsed.data.note ?? null,
        published_by: user?.id ?? null,
      })
      .select("id,version")
      .single();
    if (error) return { ok: false, error: error.message };

    await sb
      .from("textos_flows")
      .update({
        published_version_id: inserted.id,
        version: newVersion,
      })
      .eq("id", parsed.data.flowId)
      .eq("org_id", orgId);

    revalidatePath("/flujos");
    revalidatePath(`/flujos/${parsed.data.flowId}`);
    return { ok: true, versionId: inserted.id, version: inserted.version, validation };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

const RollbackSchema = z.object({ flowId: z.string().uuid(), toVersion: z.number().int().positive() });
export async function rollbackFlow(input: z.input<typeof RollbackSchema>): Promise<Result<object>> {
  try {
    const orgId = await requireOrgId();
    const parsed = RollbackSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Datos inválidos" };
    const sb = await createSbServer();
    const { data: ver } = await sb
      .from("textos_flow_versions")
      .select("*")
      .eq("flow_id", parsed.data.flowId)
      .eq("org_id", orgId)
      .eq("version", parsed.data.toVersion)
      .single();
    if (!ver) return { ok: false, error: "Versión no encontrada" };

    const { error } = await sb
      .from("textos_flows")
      .update({
        nodes: ver.nodes,
        edges: ver.edges,
        viewport: ver.viewport,
      })
      .eq("id", parsed.data.flowId)
      .eq("org_id", orgId);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/flujos/${parsed.data.flowId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

// =========================================================================
// Simulador
// =========================================================================

export async function startSimRun(flowId: string): Promise<Result<{ runId: string }>> {
  try {
    const orgId = await requireOrgId();
    const sb = await createSbServer();
    const { data: flow } = await sb
      .from("textos_flows")
      .select("id,version,nodes,edges,viewport,published_version_id")
      .eq("id", flowId)
      .eq("org_id", orgId)
      .single();
    if (!flow) return { ok: false, error: "Flujo no encontrado" };

    const graph = parseGraph({ nodes: flow.nodes, edges: flow.edges, viewport: flow.viewport });
    const start = graph.nodes.find((n) => n.type === "start") ?? graph.nodes[0];

    const { data, error } = await sb
      .from("textos_flow_sim_runs")
      .insert({
        org_id: orgId,
        flow_id: flowId,
        version: flow.version,
        current_node_id: start?.id ?? null,
        variables: {} as Json,
        transcript: [] as unknown as Json,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, runId: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

export async function endSimRun(runId: string): Promise<Result<object>> {
  try {
    const orgId = await requireOrgId();
    const sb = await createSbServer();
    await sb
      .from("textos_flow_sim_runs")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", runId)
      .eq("org_id", orgId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

export async function sendSimMessage(params: {
  runId: string;
  body: string;
}): Promise<
  Result<{
    reply: string | null;
    currentNodeId: string | null;
    variables: Record<string, unknown>;
    semaphore: "green" | "amber" | "red";
    note: string | null;
  }>
> {
  try {
    const orgId = await requireOrgId();
    const svc = createSbService();
    const { data: run } = await svc
      .from("textos_flow_sim_runs")
      .select("*")
      .eq("id", params.runId)
      .eq("org_id", orgId)
      .single();
    if (!run) return { ok: false, error: "Simulación no encontrada" };

    const { data: flow } = await svc
      .from("textos_flows")
      .select("id,nodes,edges,viewport")
      .eq("id", run.flow_id)
      .eq("org_id", orgId)
      .single();
    if (!flow) return { ok: false, error: "Flujo no encontrado" };
    const graph = parseGraph({ nodes: flow.nodes, edges: flow.edges, viewport: flow.viewport });

    // Motor de flujos (función pura): decide próximo nodo + posible respuesta.
    const { advanceFlow } = await import("@/lib/flows/engine");
    const result = await advanceFlow({
      graph,
      orgId,
      currentNodeId: run.current_node_id,
      variables: (run.variables as Record<string, unknown>) ?? {},
      userMessage: params.body,
    });

    const newTranscript = [
      ...((run.transcript as unknown as Array<{ from: string; text: string; at: string; nodeId?: string | null }>) ?? []),
      { from: "me", text: params.body, at: new Date().toISOString(), nodeId: run.current_node_id },
      ...(result.reply
        ? [{ from: "bot", text: result.reply, at: new Date().toISOString(), nodeId: result.currentNodeId }]
        : []),
    ];

    await svc
      .from("textos_flow_sim_runs")
      .update({
        current_node_id: result.currentNodeId,
        variables: result.variables as unknown as Json,
        transcript: newTranscript as unknown as Json,
      })
      .eq("id", params.runId)
      .eq("org_id", orgId);

    return {
      ok: true,
      reply: result.reply,
      currentNodeId: result.currentNodeId,
      variables: result.variables,
      semaphore: result.semaphore,
      note: result.note,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

// =========================================================================
// Validación del grafo (pura — reutilizable en client y server)
// =========================================================================

type ValidationIssue = {
  severity: "error" | "warn";
  nodeId?: string;
  edgeId?: string;
  message: string;
  code: string;
};
type ValidationReport = { errors: ValidationIssue[]; warnings: ValidationIssue[] };

function validateGraph(graph: FlowGraph): ValidationReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const starts = graph.nodes.filter((n) => n.type === "start");
  if (starts.length === 0) errors.push({ severity: "error", message: "Falta el nodo de Inicio", code: "no_start" });
  if (starts.length > 1) errors.push({ severity: "error", message: "Hay más de un nodo de Inicio", code: "multi_start" });

  const ids = new Set(graph.nodes.map((n) => n.id));
  for (const e of graph.edges) {
    if (!ids.has(e.from)) errors.push({ severity: "error", edgeId: e.id, message: "Edge con origen inexistente", code: "edge_from_missing" });
    if (!ids.has(e.to)) errors.push({ severity: "error", edgeId: e.id, message: "Edge con destino inexistente", code: "edge_to_missing" });
  }

  const outBy = new Map<string, number>();
  const inBy = new Map<string, number>();
  for (const e of graph.edges) {
    outBy.set(e.from, (outBy.get(e.from) ?? 0) + 1);
    inBy.set(e.to, (inBy.get(e.to) ?? 0) + 1);
  }
  for (const n of graph.nodes) {
    if (n.type === "start") continue;
    if ((inBy.get(n.id) ?? 0) === 0) warnings.push({ severity: "warn", nodeId: n.id, message: `"${n.title}" no recibe conexión de otro nodo`, code: "orphan" });
    if (n.type !== "cerrar" && n.type !== "derivar" && (outBy.get(n.id) ?? 0) === 0)
      warnings.push({ severity: "warn", nodeId: n.id, message: `"${n.title}" no tiene salida`, code: "no_out" });
  }

  // Ciclos (DFS con set de visitados/en-camino).
  const adj = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = adj.get(e.from) ?? [];
    list.push(e.to);
    adj.set(e.from, list);
  }
  const color = new Map<string, 0 | 1 | 2>();
  function dfs(nid: string): boolean {
    color.set(nid, 1);
    for (const next of adj.get(nid) ?? []) {
      if (color.get(next) === 1) return true;
      if (color.get(next) !== 2 && dfs(next)) return true;
    }
    color.set(nid, 2);
    return false;
  }
  for (const n of graph.nodes) {
    if (!color.has(n.id) && dfs(n.id)) {
      warnings.push({
        severity: "warn",
        nodeId: n.id,
        message: "Hay un ciclo que incluye este nodo",
        code: "cycle",
      });
      break;
    }
  }

  return { errors, warnings };
}

// =========================================================================
// Templates seed
// =========================================================================

function seedGraph(template: "blank" | "saludo_basico" | "ventas_simple" | "soporte"): FlowGraph {
  const viewport = { x: 0, y: 0, zoom: 1 };

  const start = makeNode({ type: "start", x: 80, y: 220 });

  if (template === "blank") {
    return {
      nodes: [start as never],
      edges: [],
      viewport,
    };
  }

  if (template === "saludo_basico") {
    const saludo = makeNode({ type: "saludo", x: 380, y: 220 });
    const cerrar = makeNode({ type: "cerrar", x: 680, y: 220 });
    const e1 = { id: `e_${Math.random().toString(36).slice(2, 10)}`, from: start.id, to: saludo.id };
    const e2 = { id: `e_${Math.random().toString(36).slice(2, 10)}`, from: saludo.id, to: cerrar.id };
    return {
      nodes: [start, saludo, cerrar] as never,
      edges: [e1, e2],
      viewport,
    };
  }

  if (template === "ventas_simple") {
    const saludo = makeNode({ type: "saludo", x: 380, y: 220 });
    const calif = makeNode({ type: "calif", x: 680, y: 220 });
    const pagar = makeNode({ type: "pagar", x: 980, y: 220 });
    const cerrar = makeNode({ type: "cerrar", x: 1280, y: 220 });
    const mk = (from: string, to: string) => ({
      id: `e_${Math.random().toString(36).slice(2, 10)}`,
      from,
      to,
    });
    return {
      nodes: [start, saludo, calif, pagar, cerrar] as never,
      edges: [mk(start.id, saludo.id), mk(saludo.id, calif.id), mk(calif.id, pagar.id), mk(pagar.id, cerrar.id)],
      viewport,
    };
  }

  // soporte
  const saludo = makeNode({ type: "saludo", x: 380, y: 180 });
  const faq = makeNode({ type: "faq", x: 680, y: 100 });
  const derivar = makeNode({ type: "derivar", x: 680, y: 300 });
  const cond = makeNode({ type: "condition", x: 980, y: 200 });
  const cerrar = makeNode({ type: "cerrar", x: 1280, y: 100 });
  const cerrar2 = makeNode({ type: "cerrar", x: 1280, y: 300 });
  const mk = (from: string, to: string, sh?: string) => ({
    id: `e_${Math.random().toString(36).slice(2, 10)}`,
    from,
    to,
    sourceHandle: sh ?? null,
  });
  return {
    nodes: [start, saludo, faq, derivar, cond, cerrar, cerrar2] as never,
    edges: [
      mk(start.id, saludo.id),
      mk(saludo.id, cond.id),
      mk(cond.id, faq.id, "branch-yes"),
      mk(cond.id, derivar.id, "branch-no"),
      mk(faq.id, cerrar.id),
      mk(derivar.id, cerrar2.id),
    ],
    viewport,
  };
}
