"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence, type HTMLMotionProps } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Send,
  Sparkles,
  X,
  Upload,
  ArrowRight,
  PartyPopper,
  type LucideIcon,
} from "lucide-react";
import { InstagramIcon, MessengerIcon, WhatsAppIcon, GlobeIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chip } from "@/components/ui/chip";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { completeOnboarding, seedDemo } from "@/app/actions/orgs";
import { toast } from "sonner";

const INDUSTRIES = [
  { id: "servicios", label: "Servicios", emoji: "🧰" },
  { id: "ecommerce", label: "Ecommerce", emoji: "🛍️" },
  { id: "salud", label: "Salud", emoji: "🩺" },
  { id: "inmobiliaria", label: "Inmobiliaria", emoji: "🏠" },
  { id: "educacion", label: "Educación", emoji: "📚" },
  { id: "gastronomia", label: "Gastronomía", emoji: "🍽️" },
  { id: "belleza", label: "Belleza", emoji: "✂️" },
  { id: "otro", label: "Otro", emoji: "✨" },
];

const ESCALATION_CHIPS = [
  "Pago",
  "Queja",
  "Cancelación",
  "Agendar cita",
  "Reclamo",
  "Devolución",
  "Cambio de contrato",
];

const LANGUAGE_CHIPS = ["Español", "Inglés", "Portugués", "Italiano", "Francés"];

const CHANNEL_META: { id: string; label: string; color: string; icon: (props: { size?: number }) => React.JSX.Element; desc: string }[] = [
  { id: "whatsapp", label: "WhatsApp", color: "#25D366", icon: (p) => <WhatsAppIcon size={p.size ?? 20} />, desc: "Cloud API o WA Business" },
  { id: "instagram", label: "Instagram", color: "#E4405F", icon: (p) => <InstagramIcon size={p.size ?? 20} />, desc: "DMs vía Meta Graph" },
  { id: "messenger", label: "Messenger", color: "#1877F2", icon: (p) => <MessengerIcon size={p.size ?? 20} />, desc: "Facebook pages" },
  { id: "webchat", label: "Webchat", color: "#8B5CF6", icon: (p) => <GlobeIcon size={p.size ?? 20} />, desc: "Widget en tu sitio" },
];

const TONE_OPTIONS = [
  { id: "casual", label: "Casual", desc: "Cercano, tuteo." },
  { id: "amigable", label: "Amigable", desc: "Empático y cálido." },
  { id: "formal", label: "Formal", desc: "Usted y tono cuidado." },
  { id: "neutro", label: "Neutro", desc: "Directo y práctico." },
];

type Turn = { from: "tex" | "user"; text: string; id: string };

type Data = {
  ownerName: string;
  tagline: string;
  orgName: string;
  logoUrl: string | null;
  industry: string;
  topQuestions: string[];
  answers: Record<string, string>;
  neverPromise: string[];
  sampleMessages: string[];
  mustEscalate: string[];
  languages: string[];
  businessHours: Record<string, { open: string; close: string; active: boolean }>;
  channels: string[];
  tone: string;
};

const DEFAULT_HOURS: Data["businessHours"] = {
  lun: { open: "10:00", close: "20:00", active: true },
  mar: { open: "10:00", close: "20:00", active: true },
  mie: { open: "10:00", close: "20:00", active: true },
  jue: { open: "10:00", close: "20:00", active: true },
  vie: { open: "10:00", close: "20:00", active: true },
  sab: { open: "10:00", close: "18:00", active: true },
  dom: { open: "11:00", close: "17:00", active: false },
};

const INITIAL: Data = {
  ownerName: "",
  tagline: "",
  orgName: "",
  logoUrl: null,
  industry: "",
  topQuestions: ["", "", "", "", ""],
  answers: {},
  neverPromise: [],
  sampleMessages: ["", "", ""],
  mustEscalate: [],
  languages: ["Español"],
  businessHours: DEFAULT_HOURS,
  channels: [],
  tone: "casual",
};

export function TexOnboarding() {
  const router = useRouter();
  const [data, setData] = useState<Data>(INITIAL);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<Turn[]>([]);
  const [typing, setTyping] = useState(false);
  const [finalStage, setFinalStage] = useState<"idle" | "cards" | "coverage" | "enter">("idle");
  const [coverage, setCoverage] = useState(0);
  const [isPending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [freshTexMsg, setFreshTexMsg] = useState<string | null>(null);

  const topQs = data.topQuestions.filter((q) => q.trim());

  const steps = getSteps(topQs);
  const total = steps.length;

  const current = steps[step];

  // Push Tex's question for current step (only when step changes / on mount).
  useEffect(() => {
    if (!current) return;
    setTyping(true);
    const t1 = setTimeout(() => setFreshTexMsg(current.tex(data)), 520);
    const t2 = setTimeout(() => {
      setTyping(false);
      setHistory((h) => [...h, { from: "tex", text: current.tex(data), id: `tex-${step}` }]);
      setFreshTexMsg(null);
    }, 1080);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, typing, step]);

  function advance(userText?: string) {
    if (userText) {
      setHistory((h) => [...h, { from: "user", text: userText, id: `user-${step}` }]);
    }
    if (step < total - 1) {
      setTimeout(() => setStep((s) => s + 1), 220);
    } else {
      setTimeout(() => finalize(), 320);
    }
  }

  function back() {
    if (step === 0) return;
    setHistory((h) => h.slice(0, -2));
    setStep((s) => s - 1);
  }

  function finalize() {
    setFinalStage("cards");
  }

  function runCoverage() {
    setFinalStage("coverage");
    // Animate coverage target
    start(async () => {
      const res = await completeOnboarding({
        ownerName: data.ownerName,
        orgName: data.orgName || data.ownerName,
        tagline: data.tagline,
        industry: data.industry,
        logoUrl: data.logoUrl,
        topQuestions: topQs,
        answers: data.answers,
        neverPromise: data.neverPromise,
        mustEscalate: data.mustEscalate,
        sampleMessages: data.sampleMessages.filter((m) => m.trim()),
        languages: data.languages,
        businessHours: data.businessHours,
        tone: data.tone,
        channelsToConnect: data.channels,
      });
      if (!res.ok) {
        toast.error("No pudimos guardar. Probá de nuevo.");
        return;
      }
      // After short delay, enter
      setTimeout(() => setFinalStage("enter"), 2200);
    });
  }

  // Coverage animation based on data
  useEffect(() => {
    if (finalStage !== "coverage") return;
    const target = Math.min(
      92,
      topQs.length * 10 +
        Object.values(data.answers).filter((a) => a.length > 10).length * 6 +
        data.neverPromise.length * 3 +
        data.mustEscalate.length * 3 +
        (data.sampleMessages.filter((m) => m.trim().length > 5).length >= 3 ? 8 : 0) +
        (data.channels.length ? 4 : 0)
    );
    let n = 0;
    const iv = setInterval(() => {
      n += Math.random() * 4 + 1;
      if (n >= target) {
        n = target;
        clearInterval(iv);
      }
      setCoverage(Math.round(n));
    }, 38);
    return () => clearInterval(iv);
  }, [finalStage, data, topQs]);

  async function quickDemo() {
    start(async () => {
      const res = await seedDemo("barberia");
      if (res.ok) router.push("/inicio");
    });
  }

  if (finalStage === "enter") {
    return <EnterScreen orgName={data.orgName || "TextOS"} coverage={coverage} onEnter={() => router.push("/inicio")} />;
  }

  if (finalStage === "coverage") {
    return <CoverageScreen coverage={coverage} isPending={isPending} />;
  }

  if (finalStage === "cards") {
    return (
      <CardsReviewScreen
        data={data}
        topQs={topQs}
        onEdit={(q, answer) =>
          setData((d) => ({ ...d, answers: { ...d.answers, [q]: answer } }))
        }
        onBack={() => setFinalStage("idle")}
        onContinue={runCoverage}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative gradient-mesh">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      {/* Top progress */}
      <div className="relative z-10 px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={back} disabled={step === 0} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Atrás
        </Button>
        <div className="flex-1 max-w-xl mx-auto">
          <Progress value={((step + 1) / total) * 100} />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px] font-mono text-fg-4">
              {String(step + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <span className="text-[11px] text-fg-4">{current?.hint}</span>
          </div>
        </div>
        <button
          onClick={quickDemo}
          disabled={isPending}
          className="text-xs text-fg-3 hover:text-fg transition"
        >
          Saltear y ver con datos de ejemplo →
        </button>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1fr_380px] relative z-10 gap-0 overflow-hidden">
        {/* Left: chat column */}
        <div className="flex flex-col h-[calc(100vh-80px)]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 md:px-16 lg:px-24 pt-6 pb-6 no-scrollbar">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              <AnimatePresence initial={false}>
                {history.map((t) => (
                  <MessageBubble key={t.id} from={t.from} text={t.text} />
                ))}
              </AnimatePresence>
              {typing && <TypingBubble />}
              {!typing && freshTexMsg === null && (
                <motion.div
                  key={`input-${step}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.08 }}
                  className="mt-3"
                >
                  <StepInput step={current} data={data} setData={setData} advance={advance} />
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Right: knowledge preview */}
        <div className="hidden lg:block border-l border-[color:var(--border)] bg-bg-1/70 glass-2 overflow-y-auto h-[calc(100vh-80px)]">
          <KnowledgePreview data={data} topQs={topQs} currentStep={step} steps={steps} />
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ from, text }: { from: "tex" | "user"; text: string }) {
  if (from === "tex") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="flex gap-3 items-start"
      >
        <TexAvatar />
        <div className="max-w-[80%] rounded-2xl rounded-tl-md px-4 py-3 bg-bg-2 border border-[color:var(--border)] text-fg leading-relaxed">
          {text}
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="flex justify-end"
    >
      <div className="max-w-[80%] rounded-2xl rounded-tr-md px-4 py-3 bg-brand text-white leading-relaxed shadow-[0_4px_20px_rgba(139,92,246,0.35)]">
        {text}
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <div className="flex gap-3 items-start">
      <TexAvatar />
      <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-bg-2 border border-[color:var(--border)] flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-fg-3 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="h-2 w-2 rounded-full bg-fg-3 animate-bounce" style={{ animationDelay: "140ms" }} />
        <span className="h-2 w-2 rounded-full bg-fg-3 animate-bounce" style={{ animationDelay: "280ms" }} />
      </div>
    </div>
  );
}

function TexAvatar() {
  return (
    <div className="shrink-0 mt-1 h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-brand via-brand-2 to-[#EC4899] shadow-[0_4px_16px_rgba(139,92,246,0.45)] pulse-glow">
      T
    </div>
  );
}

/* ---------------- Steps ---------------- */

type Step = {
  id: string;
  hint?: string;
  tex: (d: Data) => string;
  canAdvance: (d: Data) => boolean;
  summary?: (d: Data) => string; // what we echo back as user bubble
  render: (props: StepRenderProps) => React.ReactNode;
};

type StepRenderProps = {
  data: Data;
  setData: (fn: (d: Data) => Data) => void;
  advance: (summary?: string) => void;
};

function getSteps(topQs: string[]): Step[] {
  const base: Step[] = [
    {
      id: "name",
      hint: "Paso 1 · Quién sos",
      tex: () => "Hola, soy Tex 👋. Voy a configurarte TextOS en pocos minutos. Para empezar, ¿cómo te llamás?",
      canAdvance: (d) => d.ownerName.trim().length > 1,
      summary: (d) => d.ownerName,
      render: ({ data, setData, advance }) => (
        <TextStep
          placeholder="Tu nombre"
          value={data.ownerName}
          onChange={(v) => setData((d) => ({ ...d, ownerName: v }))}
          onSubmit={() => advance(data.ownerName)}
          autoFocus
        />
      ),
    },
    {
      id: "tagline",
      hint: "Paso 2 · Qué hacés",
      tex: (d) => `Gusto ${d.ownerName.split(" ")[0] || "de conocerte"}. Contame en una frase: ¿qué vende o hace tu negocio?`,
      canAdvance: (d) => d.tagline.trim().length > 5,
      summary: (d) => d.tagline,
      render: ({ data, setData, advance }) => (
        <TextStep
          placeholder="Ej: Barbería premium en Palermo, cortes, barba y color."
          value={data.tagline}
          onChange={(v) => setData((d) => ({ ...d, tagline: v }))}
          onSubmit={() => advance(data.tagline)}
          autoFocus
          multiline
        />
      ),
    },
    {
      id: "org",
      hint: "Paso 3 · Tu negocio",
      tex: () => "¿Cómo se llama? Si tenés un logo, podés arrastrarlo acá.",
      canAdvance: (d) => d.orgName.trim().length > 1,
      summary: (d) => (d.logoUrl ? `${d.orgName} · logo cargado` : d.orgName),
      render: ({ data, setData, advance }) => (
        <OrgStep
          data={data}
          setData={setData}
          onSubmit={() => advance(data.logoUrl ? `${data.orgName} · logo cargado` : data.orgName)}
        />
      ),
    },
    {
      id: "industry",
      hint: "Paso 4 · Tu rubro",
      tex: () => "¿Cuál es tu rubro? Esto me ayuda a afinar el tono y los flujos.",
      canAdvance: (d) => d.industry.length > 0,
      summary: (d) => INDUSTRIES.find((i) => i.id === d.industry)?.label || d.industry,
      render: ({ data, setData, advance }) => (
        <ChipStep
          options={INDUSTRIES.map((i) => ({ id: i.id, label: `${i.emoji}  ${i.label}` }))}
          selected={data.industry ? [data.industry] : []}
          single
          onChange={(arr) => {
            setData((d) => ({ ...d, industry: arr[0] || "" }));
            if (arr[0]) setTimeout(() => advance(INDUSTRIES.find((i) => i.id === arr[0])?.label || arr[0]), 220);
          }}
        />
      ),
    },
    {
      id: "topQuestions",
      hint: "Paso 5 · Las 5 preguntas más frecuentes",
      tex: () =>
        "Pensemos en las 5 preguntas que MÁS te hacen tus clientes. Con cada Enter, se convierte en una tarjeta de conocimiento.",
      canAdvance: (d) => d.topQuestions.filter((q) => q.trim()).length >= 3,
      summary: (d) => d.topQuestions.filter((q) => q.trim()).join(" · "),
      render: ({ data, setData, advance }) => (
        <TopQuestionsStep
          value={data.topQuestions}
          onChange={(arr) => setData((d) => ({ ...d, topQuestions: arr }))}
          onSubmit={() => advance(data.topQuestions.filter((q) => q.trim()).join(" · "))}
        />
      ),
    },
  ];

  // One step per answered question
  topQs.forEach((q, i) => {
    base.push({
      id: `answer-${i}`,
      hint: `Paso ${6 + i} · Cómo respondés`,
      tex: () => `¿Cómo respondés habitualmente a: "${q}"?`,
      canAdvance: (d) => (d.answers[q] || "").trim().length > 4,
      summary: (d) => d.answers[q] || "",
      render: ({ data, setData, advance }) => (
        <TextStep
          key={`ans-${i}`}
          placeholder="Escribí tu respuesta habitual…"
          value={data.answers[q] || ""}
          onChange={(v) => setData((d) => ({ ...d, answers: { ...d.answers, [q]: v } }))}
          onSubmit={() => advance(data.answers[q] || "")}
          autoFocus
          multiline
        />
      ),
    });
  });

  base.push(
    {
      id: "neverPromise",
      hint: "Límites de la IA",
      tex: () =>
        "¿Hay algo que tu IA NUNCA debería prometer? Ej: descuentos sin tu OK, plazos, garantías. Escribí uno por línea.",
      canAdvance: () => true,
      summary: (d) => d.neverPromise.join(" · ") || "(saltear)",
      render: ({ data, setData, advance }) => (
        <MultilineChipStep
          placeholder="Ej: Descuentos sin confirmación"
          value={data.neverPromise}
          onChange={(arr) => setData((d) => ({ ...d, neverPromise: arr }))}
          onSubmit={() => advance(data.neverPromise.join(" · ") || "(saltear)")}
        />
      ),
    },
    {
      id: "sampleMessages",
      hint: "Tu tono real",
      tex: () =>
        "Pegame 3 mensajes reales que le hayas mandado a un cliente. La IA va a aprender tu tono.",
      canAdvance: (d) => d.sampleMessages.filter((m) => m.trim().length > 3).length >= 2,
      summary: (d) => `${d.sampleMessages.filter((m) => m.trim()).length} mensajes reales cargados`,
      render: ({ data, setData, advance }) => (
        <SampleMessagesStep
          value={data.sampleMessages}
          onChange={(arr) => setData((d) => ({ ...d, sampleMessages: arr }))}
          onSubmit={() =>
            advance(`${data.sampleMessages.filter((m) => m.trim()).length} mensajes reales cargados`)
          }
        />
      ),
    },
    {
      id: "tone",
      hint: "Tono general",
      tex: () => "Un toque más: ¿qué tono querés que use tu IA por defecto?",
      canAdvance: (d) => !!d.tone,
      summary: (d) => TONE_OPTIONS.find((t) => t.id === d.tone)?.label || d.tone,
      render: ({ data, setData, advance }) => (
        <ToneStep
          value={data.tone}
          onChange={(t) => {
            setData((d) => ({ ...d, tone: t }));
            setTimeout(() => advance(TONE_OPTIONS.find((x) => x.id === t)?.label || t), 200);
          }}
        />
      ),
    },
    {
      id: "escalate",
      hint: "Cuándo intervenir",
      tex: () =>
        "¿Cuándo querés que intervenga una persona sí o sí? Elegí los que apliquen.",
      canAdvance: () => true,
      summary: (d) => d.mustEscalate.join(" · ") || "(saltear)",
      render: ({ data, setData, advance }) => (
        <ChipStep
          options={ESCALATION_CHIPS.map((c) => ({ id: c, label: c }))}
          selected={data.mustEscalate}
          onChange={(arr) => setData((d) => ({ ...d, mustEscalate: arr }))}
          footer={
            <Button onClick={() => advance(data.mustEscalate.join(" · ") || "(saltear)")} className="gap-2">
              Continuar <ChevronRight className="h-4 w-4" />
            </Button>
          }
        />
      ),
    },
    {
      id: "languages",
      hint: "Idiomas",
      tex: () => "¿Qué idiomas hablás con tus clientes?",
      canAdvance: (d) => d.languages.length > 0,
      summary: (d) => d.languages.join(" · "),
      render: ({ data, setData, advance }) => (
        <ChipStep
          options={LANGUAGE_CHIPS.map((c) => ({ id: c, label: c }))}
          selected={data.languages}
          onChange={(arr) => setData((d) => ({ ...d, languages: arr }))}
          footer={
            <Button onClick={() => advance(data.languages.join(" · "))} disabled={!data.languages.length} className="gap-2">
              Continuar <ChevronRight className="h-4 w-4" />
            </Button>
          }
        />
      ),
    },
    {
      id: "hours",
      hint: "Horario de atención",
      tex: () => "¿Cuál es tu horario de atención? Marcá días activos y ajustá horas.",
      canAdvance: () => true,
      summary: (d) =>
        Object.values(d.businessHours).filter((x) => x.active).length + " días activos",
      render: ({ data, setData, advance }) => (
        <HoursStep
          value={data.businessHours}
          onChange={(h) => setData((d) => ({ ...d, businessHours: h }))}
          onSubmit={() =>
            advance(Object.values(data.businessHours).filter((x) => x.active).length + " días activos")
          }
        />
      ),
    },
    {
      id: "channels",
      hint: "Canales",
      tex: () =>
        "¿Querés conectar un canal ahora? Podés hacerlo después desde Ajustes.",
      canAdvance: () => true,
      summary: (d) => (d.channels.length ? d.channels.join(" · ") : "Los conecto después"),
      render: ({ data, setData, advance }) => (
        <ChannelsStep
          value={data.channels}
          onChange={(arr) => setData((d) => ({ ...d, channels: arr }))}
          onSubmit={() => advance(data.channels.length ? data.channels.join(" · ") : "Los conecto después")}
        />
      ),
    }
  );

  return base;
}

/* ---------------- Step UIs ---------------- */

function TextStep({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus,
  multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  multiline?: boolean;
}) {
  const Cmp = multiline ? Textarea : Input;
  return (
    <div className="flex items-end gap-2">
      <Cmp
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e: { target: { value: string } }) => onChange(e.target.value)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) onSubmit();
          }
        }}
        className={cn("flex-1 text-lg", multiline && "min-h-[100px]")}
        rows={multiline ? 3 : undefined}
      />
      <Button size="icon" onClick={onSubmit} disabled={!value.trim()} className="rounded-xl">
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}

function OrgStep({
  data,
  setData,
  onSubmit,
}: {
  data: Data;
  setData: (fn: (d: Data) => Data) => void;
  onSubmit: () => void;
}) {
  const [drag, setDrag] = useState(false);
  async function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setData((d) => ({ ...d, logoUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2">
        <Input
          autoFocus
          placeholder="Nombre del negocio"
          value={data.orgName}
          onChange={(e) => setData((d) => ({ ...d, orgName: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && data.orgName.trim()) onSubmit();
          }}
          className="flex-1 text-lg"
        />
        <Button onClick={onSubmit} disabled={!data.orgName.trim()} className="gap-2">
          Siguiente <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={cn(
          "cursor-pointer flex items-center gap-3 p-4 rounded-xl border border-dashed transition-colors",
          drag
            ? "border-brand-2 bg-[rgba(139,92,246,0.08)]"
            : "border-[color:var(--border-strong)] hover:border-brand-2 hover:bg-[rgba(139,92,246,0.04)]"
        )}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
        {data.logoUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.logoUrl} alt="logo" className="h-12 w-12 rounded-lg object-cover" />
            <div className="flex-1">
              <div className="text-sm font-medium">Logo cargado</div>
              <div className="text-xs text-fg-3">Hacé click para reemplazar</div>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                setData((d) => ({ ...d, logoUrl: null }));
              }}
              className="text-fg-3 hover:text-fg rounded-full p-1 hover:bg-bg-2"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="h-10 w-10 rounded-lg bg-bg-2 border border-[color:var(--border)] flex items-center justify-center text-fg-3">
              <Upload className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-sm">Arrastrá tu logo acá (opcional)</div>
              <div className="text-xs text-fg-3">PNG, JPG o SVG</div>
            </div>
          </>
        )}
      </label>
    </div>
  );
}

function ChipStep({
  options,
  selected,
  onChange,
  single,
  footer,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (arr: string[]) => void;
  single?: boolean;
  footer?: React.ReactNode;
}) {
  function toggle(id: string) {
    if (single) return onChange([id]);
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.id} active={selected.includes(o.id)} onClick={() => toggle(o.id)}>
            {o.label}
          </Chip>
        ))}
      </div>
      {footer && <div className="mt-4 flex justify-end">{footer}</div>}
    </div>
  );
}

function TopQuestionsStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string[];
  onChange: (arr: string[]) => void;
  onSubmit: () => void;
}) {
  const [input, setInput] = useState("");
  const filled = value.filter((v) => v.trim());
  function add(q: string) {
    if (!q.trim()) return;
    const next = [...filled, q.trim()];
    onChange([...next, ...Array(Math.max(0, 5 - next.length)).fill("")]);
    setInput("");
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {filled.map((q, i) => (
          <Chip key={i} active onRemove={() => onChange(value.map((x, j) => (j === i ? "" : x)))}>
            {q}
          </Chip>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Input
          autoFocus
          placeholder={filled.length === 0 ? "Ej: ¿Cuánto sale el corte?" : "Siguiente pregunta…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              e.preventDefault();
              add(input);
            }
          }}
          className="flex-1"
          disabled={filled.length >= 5}
        />
        <Button onClick={() => add(input)} disabled={!input.trim() || filled.length >= 5} variant="secondary">
          Agregar
        </Button>
        <Button onClick={onSubmit} disabled={filled.length < 3} className="gap-2">
          Listo <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-xs text-fg-4">
        {filled.length}/5 preguntas · mínimo 3 para continuar
      </div>
    </div>
  );
}

function MultilineChipStep({
  value,
  onChange,
  onSubmit,
  placeholder,
}: {
  value: string[];
  onChange: (arr: string[]) => void;
  onSubmit: () => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  function add(q: string) {
    if (!q.trim()) return;
    onChange([...value, q.trim()]);
    setInput("");
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {value.map((q, i) => (
          <Chip key={i} active onRemove={() => onChange(value.filter((_, j) => j !== i))}>
            {q}
          </Chip>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Input
          autoFocus
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(input);
            }
          }}
          className="flex-1"
        />
        <Button onClick={() => add(input)} disabled={!input.trim()} variant="secondary">
          Agregar
        </Button>
        <Button onClick={onSubmit} variant="outline">
          {value.length ? "Continuar" : "Saltear"} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function SampleMessagesStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string[];
  onChange: (arr: string[]) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {value.map((m, i) => (
        <Textarea
          key={i}
          placeholder={`Mensaje ${i + 1} que le hayas mandado a un cliente…`}
          value={m}
          onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
          className="min-h-[72px]"
        />
      ))}
      <div className="flex justify-end">
        <Button
          onClick={onSubmit}
          disabled={value.filter((m) => m.trim().length > 3).length < 2}
          className="gap-2"
        >
          Continuar <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ToneStep({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {TONE_OPTIONS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "text-left rounded-xl p-3 border transition-all",
            value === t.id
              ? "border-brand-2 bg-[rgba(139,92,246,0.1)]"
              : "border-[color:var(--border)] bg-bg-2 hover:border-[color:var(--border-strong)]"
          )}
        >
          <div className="font-medium">{t.label}</div>
          <div className="text-xs text-fg-3 mt-0.5">{t.desc}</div>
        </button>
      ))}
    </div>
  );
}

function HoursStep({
  value,
  onChange,
  onSubmit,
}: {
  value: Data["businessHours"];
  onChange: (v: Data["businessHours"]) => void;
  onSubmit: () => void;
}) {
  const days = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
  const labels: Record<string, string> = { lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo" };
  return (
    <div className="flex flex-col gap-2">
      {days.map((d) => {
        const h = value[d];
        return (
          <div
            key={d}
            className={cn(
              "flex items-center gap-3 rounded-xl border px-3 py-2 transition-colors",
              h.active ? "border-[color:var(--border-strong)] bg-bg-2" : "border-[color:var(--border)] bg-bg-1 opacity-60"
            )}
          >
            <Switch checked={h.active} onCheckedChange={(c) => onChange({ ...value, [d]: { ...h, active: c } })} />
            <div className="w-24 text-sm font-medium">{labels[d]}</div>
            <input
              type="time"
              value={h.open}
              disabled={!h.active}
              onChange={(e) => onChange({ ...value, [d]: { ...h, open: e.target.value } })}
              className="h-9 px-2 rounded-lg border border-[color:var(--border)] bg-bg-0 text-sm text-fg disabled:opacity-50"
            />
            <span className="text-fg-4 text-sm">—</span>
            <input
              type="time"
              value={h.close}
              disabled={!h.active}
              onChange={(e) => onChange({ ...value, [d]: { ...h, close: e.target.value } })}
              className="h-9 px-2 rounded-lg border border-[color:var(--border)] bg-bg-0 text-sm text-fg disabled:opacity-50"
            />
          </div>
        );
      })}
      <div className="flex justify-end mt-2">
        <Button onClick={onSubmit} className="gap-2">
          Continuar <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChannelsStep({
  value,
  onChange,
  onSubmit,
}: {
  value: string[];
  onChange: (arr: string[]) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        {CHANNEL_META.map((c) => {
          const on = value.includes(c.id);
          return (
            <button
              key={c.id}
              onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}
              className={cn(
                "relative flex items-center gap-3 p-4 rounded-xl border transition-all text-left",
                on
                  ? "border-[color:var(--border-strong)] bg-bg-2 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
                  : "border-[color:var(--border)] bg-bg-1 hover:border-[color:var(--border-strong)]"
              )}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: c.color }}
              >
                {c.icon({ size: 20 })}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs text-fg-3">{c.desc}</div>
              </div>
              {on && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-brand flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between items-center">
        <div className="text-xs text-fg-4">Podés conectarlos después desde Ajustes.</div>
        <Button onClick={onSubmit} className="gap-2">
          {value.length ? `Continuar con ${value.length}` : "Saltear"} <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Right column: knowledge preview ---------------- */

function KnowledgePreview({
  data,
  topQs,
  currentStep,
  steps,
}: {
  data: Data;
  topQs: string[];
  currentStep: number;
  steps: Step[];
}) {
  const answersStartAt = 5;
  return (
    <div className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-brand-2" />
        <div className="text-xs uppercase tracking-wider text-fg-3 font-semibold">Tu IA, en vivo</div>
      </div>
      <div className="text-sm text-fg-3 mb-4 leading-snug">
        Cada respuesta arma una tarjeta de conocimiento. Tu IA ya las está memorizando.
      </div>
      <div className="flex flex-col gap-2.5">
        <IdentityPreview data={data} />
        <AnimatePresence initial={false}>
          {topQs.map((q, i) => {
            const answered = !!data.answers[q];
            const isCurrent = currentStep === answersStartAt + i;
            return (
              <motion.div
                key={q}
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: "spring", stiffness: 240, damping: 24, delay: i * 0.05 }}
                className={cn(
                  "rounded-xl border p-3 bg-bg-0",
                  answered ? "border-[color:var(--border-strong)]" : isCurrent ? "amber-pulse-border" : "border-[color:var(--border)] border-dashed"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="text-[11px] uppercase tracking-wider font-medium text-brand-2">
                    Tarjeta {i + 1}
                  </div>
                  {answered ? (
                    <div className="text-[10px] font-mono text-[color:var(--accent-green)] flex items-center gap-1">
                      <Check className="h-3 w-3" /> 75%
                    </div>
                  ) : (
                    <div className="text-[10px] font-mono text-fg-4">esperando</div>
                  )}
                </div>
                <div className="text-sm font-medium mb-1 text-fg">{q}</div>
                <div className={cn("text-xs leading-snug", answered ? "text-fg-2" : "text-fg-4 italic")}>
                  {answered ? data.answers[q] : "Todavía sin respuesta…"}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {data.neverPromise.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.06)] p-3 mt-2"
          >
            <div className="text-[11px] uppercase tracking-wider font-medium text-[color:var(--accent-red)] mb-1.5">
              Líneas rojas
            </div>
            {data.neverPromise.map((np, i) => (
              <div key={i} className="text-xs text-fg-2 flex items-center gap-1.5">
                <X className="h-3 w-3 text-[color:var(--accent-red)]" /> {np}
              </div>
            ))}
          </motion.div>
        )}
        {data.mustEscalate.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-3"
          >
            <div className="text-[11px] uppercase tracking-wider font-medium text-fg-3 mb-1.5">
              Humano siempre en:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.mustEscalate.map((e) => (
                <Chip key={e}>{e}</Chip>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function IdentityPreview({ data }: { data: Data }) {
  if (!data.ownerName && !data.orgName) return null;
  return (
    <motion.div
      layout
      className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-3 flex items-center gap-3"
    >
      {data.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.logoUrl} alt="logo" className="h-10 w-10 rounded-lg object-cover" />
      ) : data.orgName ? (
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand to-[#EC4899] flex items-center justify-center text-white text-sm font-bold">
          {data.orgName[0]?.toUpperCase() || "T"}
        </div>
      ) : (
        <div className="h-10 w-10 rounded-lg bg-bg-3 flex items-center justify-center text-fg-3">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {data.orgName || "Tu negocio"}
        </div>
        <div className="text-xs text-fg-3 truncate">
          {data.industry ? INDUSTRIES.find((i) => i.id === data.industry)?.label + " · " : ""}
          {data.tagline || "Sin descripción"}
        </div>
      </div>
    </motion.div>
  );
}

/* ---------------- Step input wrapper ---------------- */

function StepInput({
  step,
  data,
  setData,
  advance,
}: {
  step: Step;
  data: Data;
  setData: (fn: (d: Data) => Data) => void;
  advance: (summary?: string) => void;
}) {
  const handle = (override?: string) => advance(override ?? step.summary?.(data));
  return step.render({ data, setData, advance: handle });
}

/* ---------------- Final screens ---------------- */

function CardsReviewScreen({
  data,
  topQs,
  onEdit,
  onBack,
  onContinue,
}: {
  data: Data;
  topQs: string[];
  onEdit: (q: string, answer: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="min-h-screen gradient-mesh relative flex flex-col">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="relative z-10 max-w-4xl mx-auto w-full px-6 py-10 flex-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-2 text-brand-2 text-sm font-medium mb-2">
            <Sparkles className="h-4 w-4" /> Tex armó esto para vos
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Tu IA ya sabe {topQs.length} cosas de {data.orgName || "tu negocio"}.
          </h1>
          <p className="text-fg-3 text-lg mb-8">
            Revisá las tarjetas antes de entrar. Podés editarlas ahora o después.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-3">
          {topQs.map((q, i) => (
            <motion.div
              key={q}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 240, damping: 22 }}
              className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4"
            >
              <div className="text-[10px] uppercase tracking-wider font-medium text-brand-2 mb-1">
                Tarjeta · {inferTopic(q)}
              </div>
              <div className="font-semibold mb-2 text-fg">{q}</div>
              <Textarea
                value={data.answers[q] || ""}
                onChange={(e) => onEdit(q, e.target.value)}
                className="text-sm min-h-[80px] bg-bg-0"
                placeholder="Respuesta…"
              />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 glass border-t border-[color:var(--border)] py-4">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={onBack}>
            Volver a editar
          </Button>
          <Button onClick={onContinue} size="lg" className="gap-2">
            Generar mi IA <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CoverageScreen({ coverage, isPending }: { coverage: number; isPending: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-mesh relative px-6">
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="relative z-10 max-w-md w-full text-center"
      >
        <div className="mx-auto h-24 w-24 rounded-3xl bg-gradient-to-br from-brand via-brand-2 to-[#EC4899] flex items-center justify-center text-white text-3xl font-bold shadow-[0_20px_60px_rgba(139,92,246,0.5)] mb-6 pulse-glow">
          T
        </div>
        <div className="text-sm text-fg-3 mb-2">Calculando cobertura estimada</div>
        <div className="text-7xl font-bold font-mono tabular-nums tracking-tight bg-gradient-to-br from-brand-2 to-[#EC4899] bg-clip-text text-transparent mb-4">
          {coverage}%
        </div>
        <div className="max-w-sm mx-auto h-3 rounded-full bg-bg-2 overflow-hidden border border-[color:var(--border)]">
          <motion.div
            className="h-full bg-gradient-to-r from-brand to-[#EC4899]"
            initial={{ width: 0 }}
            animate={{ width: `${coverage}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="mt-6 text-fg-3 text-sm">
          {isPending
            ? "Guardando tarjetas y preparando la bandeja…"
            : "Tu IA ya puede manejar este % de consultas sola."}
        </div>
      </motion.div>
    </div>
  );
}

function EnterScreen({
  orgName,
  coverage,
  onEnter,
}: {
  orgName: string;
  coverage: number;
  onEnter: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onEnter, 2600);
    return () => clearTimeout(t);
  }, [onEnter]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-mesh relative px-6 text-center">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        className="relative z-10 max-w-lg"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-bg-1 px-3 py-1.5 text-xs text-fg-2 mb-5">
          <PartyPopper className="h-3.5 w-3.5 text-brand-2" />
          Listo, {orgName}
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-3">
          Tu IA está lista para ayudarte.
        </h1>
        <p className="text-fg-3 text-lg mb-6">
          Cobertura inicial: <span className="text-brand-2 font-semibold">{coverage}%</span>. Cada respuesta
          que des va a subirla.
        </p>
        <Button size="xl" onClick={onEnter} className="gap-2">
          Entrar a TextOS <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}

function inferTopic(q: string) {
  const lower = q.toLowerCase();
  if (/hora|abren|cierran|atienden/.test(lower)) return "Horarios";
  if (/precio|cuánto|costo|sale/.test(lower)) return "Precios";
  if (/turno|cita|disponible/.test(lower)) return "Turnos";
  if (/dónde|direcci/.test(lower)) return "Ubicación";
  if (/envío|enviar|llega/.test(lower)) return "Envíos";
  if (/cambio|devol/.test(lower)) return "Cambios";
  if (/pago|tarjeta|efectivo/.test(lower)) return "Formas de pago";
  return "General";
}
