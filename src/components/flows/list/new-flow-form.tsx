"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "motion/react";
import { ArrowLeft, FileText, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createFlow } from "@/app/actions/flows";

type TemplateKey = "blank" | "saludo_basico" | "ventas_simple" | "soporte";

const TEMPLATES: Array<{
  key: TemplateKey;
  title: string;
  description: string;
  icon: typeof FileText;
  nodeCount: number;
}> = [
  {
    key: "blank",
    title: "En blanco",
    description: "Un canvas vacío. Arrancás de cero.",
    icon: FileText,
    nodeCount: 1,
  },
  {
    key: "saludo_basico",
    title: "Saludo básico",
    description: "Bienvenida y cierre. Ideal para probar rápido.",
    icon: MessageCircle,
    nodeCount: 3,
  },
  {
    key: "ventas_simple",
    title: "Ventas simple",
    description: "Saludo → Calificación → Pagar → Cierre.",
    icon: ShoppingBag,
    nodeCount: 5,
  },
  {
    key: "soporte",
    title: "Soporte inteligente",
    description: "Decide si responder con FAQ o derivar a humano.",
    icon: Sparkles,
    nodeCount: 7,
  },
];

export function NewFlowForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<TemplateKey>("saludo_basico");

  function onCreate() {
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Ponele un nombre al flujo");
      return;
    }
    startTransition(async () => {
      const res = await createFlow({ name: cleanName, template });
      if (res.ok) {
        router.push(`/flujos/${res.id}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 md:px-6 py-3 md:py-4 border-b border-[color:var(--border)] flex items-center gap-3">
        <Link href="/flujos" className="text-fg-3 hover:text-fg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Nuevo flujo</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          <div>
            <label className="text-xs text-fg-3 font-medium mb-1.5 block uppercase tracking-wider">
              Nombre
            </label>
            <Input
              autoFocus
              placeholder="Bot de atención"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onCreate()}
              maxLength={80}
            />
          </div>

          <div>
            <label className="text-xs text-fg-3 font-medium mb-2 block uppercase tracking-wider">
              Plantilla
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = template === t.key;
                return (
                  <motion.button
                    key={t.key}
                    type="button"
                    onClick={() => setTemplate(t.key)}
                    whileTap={{ scale: 0.985 }}
                    className={cn(
                      "text-left rounded-2xl border p-4 transition-all",
                      active
                        ? "border-brand-2 bg-brand/10 shadow-[0_0_24px_rgba(139,92,246,0.15)]"
                        : "border-[color:var(--border)] bg-bg-1 hover:bg-bg-2 hover:border-[color:var(--border-strong)]",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                          active ? "bg-brand/20 text-brand-2" : "bg-bg-2 text-fg-2",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-sm">{t.title}</div>
                          <span className="text-[10px] font-mono text-fg-4 tabular-nums">
                            {t.nodeCount} nodos
                          </span>
                        </div>
                        <p className="text-xs text-fg-3 mt-0.5">{t.description}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link href="/flujos">
              <Button variant="ghost">Cancelar</Button>
            </Link>
            <Button onClick={onCreate} disabled={isPending || !name.trim()}>
              {isPending ? "Creando…" : "Crear flujo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
