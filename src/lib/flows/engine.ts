// Motor de ejecución de flujos.
//
// Función pura `advanceFlow` que dado un graph, un nodo actual, variables y
// un mensaje del usuario, decide:
//   - qué responder (si corresponde),
//   - cuál es el próximo nodo,
//   - qué variables escribir,
//   - qué semáforo aplicar a esa respuesta.
//
// Consumido por:
//   - el simulador (actions/flows.ts → sendSimMessage)
//   - eventualmente la pipeline de producción (src/lib/ai/pipeline.ts)
//
// Diseño: el motor no tira errores. Si algo está mal configurado, responde
// con un fallback razonable. La validación del graph vive en actions/flows.ts.

import type { FlowEdge, FlowGraph, FlowNode, Semaphore } from "@/components/flows/types/flow";

export type EngineVariables = Record<string, unknown>;

export type EngineInput = {
  graph: FlowGraph;
  orgId: string;
  currentNodeId: string | null;
  variables: EngineVariables;
  userMessage: string;
  // Intent opcional (se completa en la pipeline real, no en el simulador).
  intent?: { label?: string; confidence?: number } | null;
};

export type EngineResult = {
  reply: string | null;
  currentNodeId: string | null;
  variables: EngineVariables;
  semaphore: Semaphore;
  note: string | null;
  // Para la pipeline real: instrucción extra para inyectar al system prompt.
  promptAppend?: string | null;
  // Si true, la conversación debe pasar a humano (ai_mode = off).
  handoffToHuman?: boolean;
  // Si true, se termina el flujo: current_flow_node → null.
  finished?: boolean;
};

// -------------------------------------------------------------------------
// Entry point
// -------------------------------------------------------------------------

export async function advanceFlow(input: EngineInput): Promise<EngineResult> {
  const { graph } = input;
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  // Si no tenemos nodo actual, empezamos en el primer `start`.
  let current = input.currentNodeId ? nodeById.get(input.currentNodeId) : undefined;
  if (!current) {
    const start = graph.nodes.find((n) => n.type === "start") ?? graph.nodes[0];
    if (!start) {
      return {
        reply: null,
        currentNodeId: null,
        variables: input.variables,
        semaphore: "amber",
        note: "El flujo no tiene nodos configurados.",
      };
    }
    current = start;
  }

  // Si el nodo actual es `start`, avanzamos al siguiente inmediatamente antes
  // de procesar — start es un placeholder sin contenido.
  if (current.type === "start") {
    const next = pickNextNode(graph, current, input);
    if (!next) {
      return finishWithNote(input.variables, "El nodo de inicio no tiene salida.");
    }
    current = next;
  }

  // Procesar el nodo actual.
  return await processNode(current, input, graph);
}

// -------------------------------------------------------------------------
// Por tipo de nodo
// -------------------------------------------------------------------------

async function processNode(
  node: FlowNode,
  input: EngineInput,
  graph: FlowGraph,
): Promise<EngineResult> {
  const variables = { ...input.variables };

  switch (node.type) {
    case "saludo": {
      const reply = interpolate(node.config.message, variables, input.userMessage);
      const next = pickNextNode(graph, node, input);
      return {
        reply,
        currentNodeId: next?.id ?? node.id,
        variables,
        semaphore: node.semaphore,
        note: null,
      };
    }

    case "faq": {
      const reply = interpolate(
        node.config.fallbackMessage || "Dejame revisar y te respondo en un toque.",
        variables,
        input.userMessage,
      );
      const next = pickNextNode(graph, node, input);
      return {
        reply,
        currentNodeId: next?.id ?? node.id,
        variables,
        semaphore: node.semaphore,
        note: "El nodo FAQ usa la base de conocimiento en producción.",
        promptAppend: `Respondé usando la base de conocimiento. Alcance: ${node.config.kbScope?.join(", ") || "todo"}.`,
      };
    }

    case "datos": {
      const varName = node.config.variable || "dato";
      const alreadyCollected = variables[varName];
      if (alreadyCollected) {
        // Ya lo teníamos — avanzamos.
        const next = pickNextNode(graph, node, input);
        return {
          reply: null,
          currentNodeId: next?.id ?? node.id,
          variables,
          semaphore: node.semaphore,
          note: null,
        };
      }
      const trimmed = input.userMessage.trim();
      const valid = validateDato(trimmed, node.config.validation);
      if (!valid.ok) {
        return {
          reply: valid.errorMessage,
          currentNodeId: node.id,
          variables,
          semaphore: "amber",
          note: null,
        };
      }
      variables[varName] = valid.value;
      const next = pickNextNode(graph, node, input);
      // Mandamos el prompt para la próxima iteración (o avanzamos).
      const nextPromptText = next ? "" : `Gracias, guardé ${varName}.`;
      return {
        reply: nextPromptText || null,
        currentNodeId: next?.id ?? node.id,
        variables,
        semaphore: node.semaphore,
        note: null,
      };
    }

    case "calif": {
      const answersKey = `${node.config.writeToVariable}__answers`;
      const answers = (variables[answersKey] as string[] | undefined) ?? [];
      if (answers.length < node.config.questions.length) {
        // Si ya escribió algo (no la primera vez), guardar la respuesta previa.
        if (answers.length > 0 || input.currentNodeId === node.id) {
          answers.push(input.userMessage.trim());
          variables[answersKey] = answers;
        }
        // ¿Quedan preguntas?
        if (answers.length < node.config.questions.length) {
          return {
            reply: node.config.questions[answers.length],
            currentNodeId: node.id,
            variables,
            semaphore: node.semaphore,
            note: null,
          };
        }
      }
      // Todas contestadas → guardar summary y avanzar.
      variables[node.config.writeToVariable] = answers.join(" · ");
      const next = pickNextNode(graph, node, input);
      return {
        reply: null,
        currentNodeId: next?.id ?? node.id,
        variables,
        semaphore: node.semaphore,
        note: null,
      };
    }

    case "agendar": {
      const link = node.config.link?.trim();
      const msg = link
        ? `${interpolate(node.config.fallbackMessage, variables, input.userMessage)}\n\n${link}`
        : interpolate(node.config.fallbackMessage, variables, input.userMessage);
      const next = pickNextNode(graph, node, input);
      return {
        reply: msg,
        currentNodeId: next?.id ?? node.id,
        variables,
        semaphore: node.semaphore,
        note: link ? null : "Configurá el link de calendario en el inspector.",
      };
    }

    case "pagar": {
      const amount =
        node.config.amount === "variable"
          ? variables[node.config.amountVariable] ?? "(monto a confirmar)"
          : node.config.amount;
      const link = node.config.link?.trim();
      const lines = [`Monto: ${amount} ${node.config.currency}`];
      if (link) lines.push(`Link: ${link}`);
      else lines.push("(Configurá el método de pago en el inspector)");
      const next = pickNextNode(graph, node, input);
      return {
        reply: lines.join("\n"),
        currentNodeId: next?.id ?? node.id,
        variables,
        semaphore: node.semaphore,
        note: null,
      };
    }

    case "derivar": {
      return {
        reply: interpolate(node.config.message, variables, input.userMessage),
        currentNodeId: null,
        variables,
        semaphore: node.config.setSemaphore,
        note: "Derivado a humano. El flujo termina.",
        handoffToHuman: true,
        finished: true,
      };
    }

    case "cerrar": {
      return {
        reply: interpolate(node.config.farewell, variables, input.userMessage),
        currentNodeId: null,
        variables,
        semaphore: node.semaphore,
        note: "Conversación cerrada.",
        finished: true,
      };
    }

    case "condition": {
      const branch = pickConditionBranch(node, input, variables);
      const edge = graph.edges.find(
        (e) => e.from === node.id && (e.sourceHandle === branch?.id || (!e.sourceHandle && !branch)),
      );
      if (!edge) {
        return {
          reply: null,
          currentNodeId: node.id,
          variables,
          semaphore: "amber",
          note: "La rama seleccionada no tiene edge conectado.",
        };
      }
      const nextNode = graph.nodes.find((n) => n.id === edge.to);
      if (!nextNode) return finishWithNote(variables, "El destino de la condición no existe.");
      return await processNode(nextNode, { ...input, variables, currentNodeId: nextNode.id }, graph);
    }

    case "start": {
      const next = pickNextNode(graph, node, input);
      if (!next) return finishWithNote(variables, "El nodo de inicio no tiene salida.");
      return await processNode(next, { ...input, variables, currentNodeId: next.id }, graph);
    }
  }
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function pickNextNode(graph: FlowGraph, fromNode: FlowNode, input: EngineInput): FlowNode | null {
  const outEdges = graph.edges.filter((e) => e.from === fromNode.id);
  if (outEdges.length === 0) return null;
  // Para nodos simples (no condition), usamos el primer edge sin sourceHandle específico.
  const edge = outEdges[0];
  return graph.nodes.find((n) => n.id === edge.to) ?? null;
}

function pickConditionBranch(
  node: Extract<FlowNode, { type: "condition" }>,
  input: EngineInput,
  variables: EngineVariables,
) {
  // Recorremos las branches en orden — la primera que evalúa `true` gana.
  for (const b of node.config.branches) {
    if (!b.predicate) continue; // predicate vacío → skip, va al fallback final
    if (evaluatePredicate(b.predicate, { variables, message: input.userMessage, intent: input.intent })) {
      return b;
    }
  }
  // Fallback: la última branch (se asume "else" implícito).
  return node.config.branches[node.config.branches.length - 1];
}

// Mini-DSL: soportamos
//   message contains "palabra"
//   message == "exactamente así"
//   variable.nombre exists
//   variable.nombre == "valor"
//   variable.nombre contains "parte"
//   intent == "comprar"
function evaluatePredicate(
  expr: string,
  ctx: { variables: EngineVariables; message: string; intent?: { label?: string } | null },
): boolean {
  try {
    const src = expr.trim();
    if (!src) return false;

    // intent == "x"
    const mIntent = src.match(/^intent\s*==\s*["'](.+?)["']$/);
    if (mIntent) return ctx.intent?.label === mIntent[1];

    // message contains "x"
    const mMsgC = src.match(/^message\s+contains\s+["'](.+?)["']$/i);
    if (mMsgC) return ctx.message.toLowerCase().includes(mMsgC[1].toLowerCase());

    // message == "x"
    const mMsgE = src.match(/^message\s*==\s*["'](.+?)["']$/);
    if (mMsgE) return ctx.message.trim() === mMsgE[1];

    // variable.x exists
    const mExists = src.match(/^variable\.([\w-]+)\s+exists$/i);
    if (mExists) return ctx.variables[mExists[1]] !== undefined && ctx.variables[mExists[1]] !== "";

    // variable.x == "y"
    const mVarE = src.match(/^variable\.([\w-]+)\s*==\s*["'](.+?)["']$/);
    if (mVarE) return String(ctx.variables[mVarE[1]] ?? "") === mVarE[2];

    // variable.x contains "y"
    const mVarC = src.match(/^variable\.([\w-]+)\s+contains\s+["'](.+?)["']$/i);
    if (mVarC) return String(ctx.variables[mVarC[1]] ?? "").toLowerCase().includes(mVarC[2].toLowerCase());

    return false;
  } catch {
    return false;
  }
}

function validateDato(
  value: string,
  validation: "none" | "email" | "phone" | "number",
): { ok: true; value: string | number } | { ok: false; errorMessage: string } {
  if (!value) return { ok: false, errorMessage: "¿Podés repetirlo?" };
  if (validation === "email") {
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!ok) return { ok: false, errorMessage: "No parece un email válido. ¿Me lo repetís?" };
  }
  if (validation === "phone") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 7) return { ok: false, errorMessage: "Necesito un teléfono completo." };
    return { ok: true, value: digits };
  }
  if (validation === "number") {
    const n = Number(value.replace(",", "."));
    if (Number.isNaN(n)) return { ok: false, errorMessage: "Necesito un número." };
    return { ok: true, value: n };
  }
  return { ok: true, value };
}

function interpolate(template: string, variables: EngineVariables, message: string): string {
  return template
    .replace(/\{\{\s*message\s*\}\}/g, message)
    .replace(/\{\{\s*variable\.(\w+)\s*\}\}/g, (_, k: string) => String(variables[k] ?? ""));
}

function finishWithNote(variables: EngineVariables, note: string): EngineResult {
  return {
    reply: null,
    currentNodeId: null,
    variables,
    semaphore: "amber",
    note,
    finished: true,
  };
}

// Export aparte por si consumidores quieren usar solo la validación/interpolación.
export { validateDato, interpolate, evaluatePredicate };

// Helper para la pipeline de producción: obtiene el flujo activo+publicado
// de una org, parseado. Usar con createSbService().
export async function loadActiveFlowGraph(params: {
  sb: ReturnType<typeof import("@/lib/channels/service").createSbService>;
  orgId: string;
}): Promise<{ flowId: string; version: number; graph: FlowGraph } | null> {
  const { parseGraph } = await import("@/components/flows/types/flow");
  const { data: flow } = await params.sb
    .from("textos_flows")
    .select("id,published_version_id")
    .eq("org_id", params.orgId)
    .eq("active", true)
    .is("archived_at", null)
    .not("published_version_id", "is", null)
    .maybeSingle();
  if (!flow?.published_version_id) return null;

  const { data: ver } = await params.sb
    .from("textos_flow_versions")
    .select("nodes,edges,viewport,version")
    .eq("id", flow.published_version_id)
    .eq("org_id", params.orgId)
    .maybeSingle();
  if (!ver) return null;

  return {
    flowId: flow.id,
    version: ver.version,
    graph: parseGraph({ nodes: ver.nodes, edges: ver.edges, viewport: ver.viewport }),
  };
}
