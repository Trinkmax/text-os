// Genera el "preview" textual que se muestra debajo del título dentro
// del nodo en el canvas. Acepta la variante del union y resuelve de forma
// tipada.

import type { FlowNode } from "../types/flow";

export function getNodePreview(node: FlowNode): string {
  switch (node.type) {
    case "start":
      return node.config.trigger === "keyword" && node.config.keywords.length
        ? `Dispara con: ${node.config.keywords.slice(0, 3).join(", ")}`
        : "Dispara con el primer mensaje";
    case "saludo":
      return truncate(node.config.message, 90);
    case "calif": {
      const first = node.config.questions[0] ?? "Sin preguntas";
      const n = node.config.questions.length;
      return `${truncate(first, 70)}${n > 1 ? ` · +${n - 1} más` : ""}`;
    }
    case "faq":
      return node.config.kbScope.length
        ? `Alcance: ${node.config.kbScope.slice(0, 2).join(", ")}`
        : "Responde desde todo el Conocimiento";
    case "datos":
      return `${truncate(node.config.prompt, 70)} → ${node.config.variable}`;
    case "agendar":
      return node.config.link
        ? `Link: ${truncate(node.config.link, 50)}`
        : "Sin link configurado";
    case "pagar": {
      const amt = node.config.amount === "variable" ? `{{${node.config.amountVariable}}}` : node.config.amount;
      return `${amt} ${node.config.currency} · ${methodLabel(node.config.method)}`;
    }
    case "derivar":
      return truncate(node.config.message, 90);
    case "cerrar":
      return truncate(node.config.farewell, 90);
    case "condition":
      return node.config.branches.map((b) => b.label).join(" / ");
  }
}

function methodLabel(m: "none" | "link_mp" | "link_stripe" | "custom") {
  return { none: "sin método", link_mp: "Mercado Pago", link_stripe: "Stripe", custom: "custom" }[m];
}

function truncate(s: string, n: number): string {
  if (!s) return "Sin contenido";
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
