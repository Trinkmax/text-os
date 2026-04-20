"use client";

// Form del tab "Contenido" del inspector: los campos principales del config
// específicos a cada tipo de nodo. Usa discriminated union para tipado exacto.

import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFlowStore } from "../../state/use-flow-store";
import type { FlowNode } from "../../types/flow";

export function NodeContentForm({ node }: { node: FlowNode }) {
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);

  switch (node.type) {
    case "start":
      return (
        <FormStack>
          <FieldLabel>Disparador</FieldLabel>
          <Select
            value={node.config.trigger}
            onValueChange={(v: "message" | "keyword" | "new_contact") =>
              updateNodeConfig<"start">(node.id, { trigger: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message">Primer mensaje</SelectItem>
              <SelectItem value="keyword">Palabra clave</SelectItem>
              <SelectItem value="new_contact">Contacto nuevo</SelectItem>
            </SelectContent>
          </Select>
          {node.config.trigger === "keyword" && (
            <>
              <FieldLabel className="mt-3">Palabras clave (una por línea)</FieldLabel>
              <Textarea
                value={node.config.keywords.join("\n")}
                onChange={(e) =>
                  updateNodeConfig<"start">(node.id, {
                    keywords: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
                rows={4}
                className="p-3 text-sm"
                placeholder={"hola\nsaludo\nbuenos dias"}
              />
            </>
          )}
          <Hint>El nodo de inicio se dispara con el primer mensaje del contacto y no tiene contenido propio — configura el siguiente nodo para el mensaje de bienvenida.</Hint>
        </FormStack>
      );

    case "saludo":
      return (
        <FormStack>
          <FieldLabel>Mensaje de bienvenida</FieldLabel>
          <Textarea
            value={node.config.message}
            onChange={(e) => updateNodeConfig<"saludo">(node.id, { message: e.target.value })}
            rows={4}
            className="p-3 text-sm"
            placeholder="¡Hola! ¿En qué te puedo ayudar?"
          />
          <Hint>Usá <code>{"{{variable.nombre}}"}</code> para insertar datos del contacto.</Hint>
        </FormStack>
      );

    case "calif":
      return (
        <FormStack>
          <FieldLabel>Preguntas para calificar</FieldLabel>
          <div className="flex flex-col gap-2">
            {node.config.questions.map((q, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <div className="h-9 w-9 rounded-xl bg-bg-2 border border-[color:var(--border)] flex items-center justify-center text-xs font-mono text-fg-3">
                  {idx + 1}
                </div>
                <Input
                  value={q}
                  onChange={(e) => {
                    const questions = [...node.config.questions];
                    questions[idx] = e.target.value;
                    updateNodeConfig<"calif">(node.id, { questions });
                  }}
                  placeholder={`Pregunta ${idx + 1}`}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const questions = node.config.questions.filter((_, i) => i !== idx);
                    updateNodeConfig<"calif">(node.id, {
                      questions: questions.length > 0 ? questions : [""],
                    });
                  }}
                  className="h-9 w-9 p-0 text-fg-4 hover:text-red-2"
                  aria-label="Quitar pregunta"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              updateNodeConfig<"calif">(node.id, {
                questions: [...node.config.questions, ""],
              })
            }
            className="self-start gap-1.5 text-fg-2"
          >
            <Plus className="h-3 w-3" /> Agregar pregunta
          </Button>
        </FormStack>
      );

    case "faq":
      return (
        <FormStack>
          <FieldLabel>Alcance del conocimiento (opcional)</FieldLabel>
          <Input
            value={node.config.kbScope.join(", ")}
            onChange={(e) =>
              updateNodeConfig<"faq">(node.id, {
                kbScope: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            placeholder="precios, horarios, envios"
          />
          <Hint>Dejalo vacío para usar todo el conocimiento.</Hint>
          <FieldLabel className="mt-3">Respuestas máximas por mensaje</FieldLabel>
          <Select
            value={String(node.config.maxAnswers)}
            onValueChange={(v) => updateNodeConfig<"faq">(node.id, { maxAnswers: Number(v) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 (más preciso)</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3 (más abarcativo)</SelectItem>
            </SelectContent>
          </Select>
          <FieldLabel className="mt-3">Fallback si no encuentra nada</FieldLabel>
          <Textarea
            value={node.config.fallbackMessage}
            onChange={(e) =>
              updateNodeConfig<"faq">(node.id, { fallbackMessage: e.target.value })
            }
            rows={2}
            className="p-3 text-sm"
          />
        </FormStack>
      );

    case "datos":
      return (
        <FormStack>
          <FieldLabel>¿Qué le preguntás al cliente?</FieldLabel>
          <Textarea
            value={node.config.prompt}
            onChange={(e) => updateNodeConfig<"datos">(node.id, { prompt: e.target.value })}
            rows={3}
            className="p-3 text-sm"
            placeholder="¿Cuál es tu email?"
          />
          <FieldLabel className="mt-2">Variable donde lo guardás</FieldLabel>
          <Input
            value={node.config.variable}
            onChange={(e) =>
              updateNodeConfig<"datos">(node.id, {
                variable: e.target.value.trim().replace(/\s+/g, "_"),
              })
            }
            placeholder="email_contacto"
          />
          <FieldLabel className="mt-2">Validación</FieldLabel>
          <Select
            value={node.config.validation}
            onValueChange={(v: "none" | "email" | "phone" | "number") =>
              updateNodeConfig<"datos">(node.id, { validation: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin validación</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Teléfono</SelectItem>
              <SelectItem value="number">Número</SelectItem>
            </SelectContent>
          </Select>
        </FormStack>
      );

    case "agendar":
      return (
        <FormStack>
          <FieldLabel>Integración</FieldLabel>
          <Select
            value={node.config.calendarIntegration}
            onValueChange={(v: "none" | "calendly" | "custom_link") =>
              updateNodeConfig<"agendar">(node.id, { calendarIntegration: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Ninguna</SelectItem>
              <SelectItem value="calendly">Calendly</SelectItem>
              <SelectItem value="custom_link">Link propio</SelectItem>
            </SelectContent>
          </Select>
          <FieldLabel className="mt-2">Link de calendario</FieldLabel>
          <Input
            value={node.config.link ?? ""}
            onChange={(e) => updateNodeConfig<"agendar">(node.id, { link: e.target.value })}
            placeholder="https://calendly.com/tu-usuario/30min"
            type="url"
          />
          <FieldLabel className="mt-2">Mensaje al compartir</FieldLabel>
          <Textarea
            value={node.config.fallbackMessage}
            onChange={(e) =>
              updateNodeConfig<"agendar">(node.id, { fallbackMessage: e.target.value })
            }
            rows={2}
            className="p-3 text-sm"
          />
        </FormStack>
      );

    case "pagar":
      return (
        <FormStack>
          <FieldLabel>Monto</FieldLabel>
          <div className="flex gap-2">
            <Select
              value={node.config.amount === "variable" ? "variable" : "fixed"}
              onValueChange={(v: "variable" | "fixed") =>
                updateNodeConfig<"pagar">(node.id, {
                  amount: v === "variable" ? "variable" : 0,
                })
              }
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="variable">Variable</SelectItem>
                <SelectItem value="fixed">Fijo</SelectItem>
              </SelectContent>
            </Select>
            {node.config.amount === "variable" ? (
              <Input
                value={node.config.amountVariable}
                onChange={(e) =>
                  updateNodeConfig<"pagar">(node.id, {
                    amountVariable: e.target.value.trim().replace(/\s+/g, "_"),
                  })
                }
                placeholder="monto_a_pagar"
                className="flex-1"
              />
            ) : (
              <Input
                type="number"
                inputMode="decimal"
                value={node.config.amount}
                onChange={(e) =>
                  updateNodeConfig<"pagar">(node.id, {
                    amount: Number(e.target.value) || 0,
                  })
                }
                placeholder="0"
                className="flex-1"
              />
            )}
          </div>
          <FieldLabel className="mt-2">Moneda</FieldLabel>
          <Select
            value={node.config.currency}
            onValueChange={(v: "ARS" | "USD" | "BRL" | "MXN") =>
              updateNodeConfig<"pagar">(node.id, { currency: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS">ARS (peso argentino)</SelectItem>
              <SelectItem value="USD">USD (dólar)</SelectItem>
              <SelectItem value="BRL">BRL (real)</SelectItem>
              <SelectItem value="MXN">MXN (peso mexicano)</SelectItem>
            </SelectContent>
          </Select>
          <FieldLabel className="mt-2">Método</FieldLabel>
          <Select
            value={node.config.method}
            onValueChange={(v: "none" | "link_mp" | "link_stripe" | "custom") =>
              updateNodeConfig<"pagar">(node.id, { method: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Por configurar</SelectItem>
              <SelectItem value="link_mp">Link de Mercado Pago</SelectItem>
              <SelectItem value="link_stripe">Link de Stripe</SelectItem>
              <SelectItem value="custom">Link custom</SelectItem>
            </SelectContent>
          </Select>
          {(node.config.method === "custom" || node.config.method === "link_mp" || node.config.method === "link_stripe") && (
            <>
              <FieldLabel className="mt-2">URL del link</FieldLabel>
              <Input
                value={node.config.link ?? ""}
                onChange={(e) => updateNodeConfig<"pagar">(node.id, { link: e.target.value })}
                placeholder="https://..."
                type="url"
              />
            </>
          )}
        </FormStack>
      );

    case "derivar":
      return (
        <FormStack>
          <FieldLabel>Mensaje al derivar</FieldLabel>
          <Textarea
            value={node.config.message}
            onChange={(e) => updateNodeConfig<"derivar">(node.id, { message: e.target.value })}
            rows={3}
            className="p-3 text-sm"
          />
          <FieldLabel className="mt-2">Modo de IA al derivar</FieldLabel>
          <Select
            value={node.config.setAiMode}
            onValueChange={(v: "off" | "suggest") =>
              updateNodeConfig<"derivar">(node.id, { setAiMode: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Apagar IA (solo humano)</SelectItem>
              <SelectItem value="suggest">Mantener IA como sugerencia</SelectItem>
            </SelectContent>
          </Select>
          <FieldLabel className="mt-2">Semáforo al derivar</FieldLabel>
          <Select
            value={node.config.setSemaphore}
            onValueChange={(v: "amber" | "red") =>
              updateNodeConfig<"derivar">(node.id, { setSemaphore: v })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amber">Amarillo (pedir revisión)</SelectItem>
              <SelectItem value="red">Rojo (prioridad)</SelectItem>
            </SelectContent>
          </Select>
        </FormStack>
      );

    case "cerrar":
      return (
        <FormStack>
          <FieldLabel>Mensaje de despedida</FieldLabel>
          <Textarea
            value={node.config.farewell}
            onChange={(e) => updateNodeConfig<"cerrar">(node.id, { farewell: e.target.value })}
            rows={3}
            className="p-3 text-sm"
          />
          <FieldLabel className="mt-2">Stage al cerrar (opcional)</FieldLabel>
          <Input
            value={node.config.setStage ?? ""}
            onChange={(e) => updateNodeConfig<"cerrar">(node.id, { setStage: e.target.value })}
            placeholder="Ganado / Perdido / Seguimiento"
          />
        </FormStack>
      );

    case "condition":
      return (
        <FormStack>
          <FieldLabel>Ramas de decisión</FieldLabel>
          <div className="flex flex-col gap-2">
            {node.config.branches.map((b, idx) => (
              <div
                key={b.id}
                className="rounded-xl border border-[color:var(--border)] bg-bg-2/50 p-2.5 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={b.label}
                    onChange={(e) => {
                      const branches = [...node.config.branches];
                      branches[idx] = { ...b, label: e.target.value };
                      updateNodeConfig<"condition">(node.id, { branches });
                    }}
                    placeholder="Etiqueta"
                    className="flex-1 h-9"
                  />
                  {node.config.branches.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const branches = node.config.branches.filter((_, i) => i !== idx);
                        updateNodeConfig<"condition">(node.id, { branches });
                      }}
                      className="h-9 w-9 p-0 text-fg-4 hover:text-red-2"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Input
                  value={b.predicate}
                  onChange={(e) => {
                    const branches = [...node.config.branches];
                    branches[idx] = { ...b, predicate: e.target.value };
                    updateNodeConfig<"condition">(node.id, { branches });
                  }}
                  placeholder={`message contains "x"`}
                  className="h-9 text-xs font-mono"
                />
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const newBranch = {
                id: `branch-${Math.random().toString(36).slice(2, 8)}`,
                label: `Rama ${node.config.branches.length + 1}`,
                predicate: "",
              };
              updateNodeConfig<"condition">(node.id, {
                branches: [...node.config.branches, newBranch],
              });
            }}
            className="self-start gap-1.5 text-fg-2"
          >
            <Plus className="h-3 w-3" /> Agregar rama
          </Button>
          <Hint>
            Predicados soportados:{" "}
            <code>message contains &quot;x&quot;</code>,{" "}
            <code>variable.nombre == &quot;y&quot;</code>,{" "}
            <code>intent == &quot;comprar&quot;</code>,{" "}
            <code>variable.x exists</code>. La última rama actúa como <em>else</em>.
          </Hint>
        </FormStack>
      );
  }
}

// -------- Helpers ----------------------------------------------------------

export function FormStack({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-[11px] uppercase tracking-wider text-fg-3 font-medium ${className ?? ""}`}>
      {children}
    </label>
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-fg-4 leading-relaxed mt-1">{children}</p>;
}
