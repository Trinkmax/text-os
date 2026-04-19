"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  ExternalLink,
  Flame,
  Gauge,
  KeyRound,
  Loader2,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PROVIDERS,
  PROVIDER_BY_ID,
  ROLE_META,
  type ProviderId,
  type Role,
} from "@/lib/ai/registry";
import {
  saveAiProvider,
  testAiProvider,
  type SafeAiProvider,
} from "@/app/actions/ai";

type Step = "provider" | "credentials" | "model" | "behavior" | "test";

export function AiProviderDialog({
  open,
  onOpenChange,
  editing,
  initialRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: SafeAiProvider | null;
  initialRole?: Role;
}) {
  const router = useRouter();
  const isEdit = !!editing;

  const [step, setStep] = useState<Step>("provider");
  const [provider, setProvider] = useState<ProviderId>(
    editing?.provider ?? "vercel_gateway",
  );
  const [role, setRole] = useState<Role>(editing?.role ?? initialRole ?? "generation");
  const [model, setModel] = useState<string>(editing?.model ?? "");
  const [nickname, setNickname] = useState(editing?.nickname ?? "");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [baseUrl, setBaseUrl] = useState(editing?.config?.base_url ?? "");
  const [temperature, setTemperature] = useState(
    Math.round((editing?.config?.temperature ?? 0.4) * 100),
  );
  const [maxTokens, setMaxTokens] = useState(editing?.config?.max_tokens ?? 400);
  const [isDefault, setIsDefault] = useState(editing?.is_default ?? true);
  const [isSaving, startSave] = useTransition();
  const [testResult, setTestResult] = useState<null | {
    ok: boolean;
    latencyMs: number;
    sample?: string;
    error?: string;
  }>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(editing?.id ?? null);

  useEffect(() => {
    if (!open) return;
    // Reset state on open for create; pre-fill for edit.
    if (editing) {
      setStep("behavior");
      setProvider(editing.provider);
      setRole(editing.role);
      setModel(editing.model);
      setNickname(editing.nickname);
      setApiKey("");
      setBaseUrl(editing.config?.base_url ?? "");
      setTemperature(Math.round((editing.config?.temperature ?? 0.4) * 100));
      setMaxTokens(editing.config?.max_tokens ?? 400);
      setIsDefault(editing.is_default);
      setSavedId(editing.id);
      setTestResult(null);
    } else {
      setStep("provider");
      setProvider("vercel_gateway");
      setRole(initialRole ?? "generation");
      setModel("");
      setNickname("");
      setApiKey("");
      setBaseUrl("");
      setTemperature(40);
      setMaxTokens(400);
      setIsDefault(true);
      setSavedId(null);
      setTestResult(null);
    }
  }, [open, editing, initialRole]);

  const providerDef = PROVIDER_BY_ID.get(provider)!;
  const availableModels = useMemo(
    () => providerDef.models.filter((m) => m.roles.includes(role)),
    [providerDef, role],
  );

  // Auto-select the recommended model when role/provider changes.
  useEffect(() => {
    if (availableModels.length === 0) return;
    if (!availableModels.find((m) => m.id === model)) {
      const rec = availableModels.find((m) => m.recommended) ?? availableModels[0];
      setModel(rec.id);
    }
  }, [availableModels, model]);

  // Auto-generate nickname when provider/model chosen for create flow.
  useEffect(() => {
    if (isEdit) return;
    if (!providerDef || !model) return;
    const modelLabel = providerDef.models.find((m) => m.id === model)?.label ?? model;
    setNickname(`${providerDef.label} · ${modelLabel}`);
  }, [providerDef, model, isEdit]);

  const canProceedFromCredentials = (() => {
    if (isEdit && !apiKey) return true; // no hace falta rotar la key
    if (providerDef.apiKeyField && !apiKey.trim()) return false;
    if (provider === "custom" && !baseUrl.trim()) return false;
    return true;
  })();

  async function handleSave({ andTest }: { andTest: boolean }) {
    startSave(async () => {
      const res = await saveAiProvider({
        id: editing?.id,
        nickname: nickname.trim() || providerDef.label,
        provider,
        model,
        role,
        api_key: apiKey.trim() || undefined,
        base_url: baseUrl.trim() || undefined,
        temperature: temperature / 100,
        max_tokens: maxTokens,
        is_default: isDefault,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setSavedId(res.id);
      if (andTest) {
        setStep("test");
        setIsTesting(true);
        const tr = await testAiProvider(res.id);
        setTestResult(tr);
        setIsTesting(false);
      } else {
        toast.success(isEdit ? "Proveedor actualizado" : "Proveedor conectado");
        onOpenChange(false);
        router.refresh();
      }
    });
  }

  async function runTestAgain() {
    if (!savedId) return;
    setIsTesting(true);
    const tr = await testAiProvider(savedId);
    setTestResult(tr);
    setIsTesting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-brand-2" />
            {isEdit ? "Editar conexión de IA" : "Conectar un modelo de IA"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cambiá el modelo, la creatividad o la clave de API."
              : "Elegí proveedor, modelo y probá la conexión en un paso."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <Stepper step={step} />
        )}

        <div className="mt-2">
          {step === "provider" && (
            <ProviderStep
              role={role}
              onRoleChange={setRole}
              provider={provider}
              onProviderChange={setProvider}
              onNext={() => setStep("credentials")}
            />
          )}

          {step === "credentials" && (
            <CredentialsStep
              provider={provider}
              apiKey={apiKey}
              onApiKeyChange={setApiKey}
              showKey={showKey}
              onToggleShow={() => setShowKey((v) => !v)}
              baseUrl={baseUrl}
              onBaseUrlChange={setBaseUrl}
              isEdit={isEdit}
              hasExistingKey={editing?.has_api_key ?? false}
              existingKeyPreview={editing?.api_key_preview ?? null}
              onBack={() => setStep("provider")}
              onNext={() => setStep("model")}
              canContinue={canProceedFromCredentials}
            />
          )}

          {step === "model" && (
            <ModelStep
              provider={provider}
              role={role}
              model={model}
              onModelChange={setModel}
              onBack={() => setStep("credentials")}
              onNext={() => setStep("behavior")}
            />
          )}

          {step === "behavior" && (
            <BehaviorStep
              role={role}
              nickname={nickname}
              onNicknameChange={setNickname}
              temperature={temperature}
              onTemperatureChange={setTemperature}
              maxTokens={maxTokens}
              onMaxTokensChange={setMaxTokens}
              isDefault={isDefault}
              onIsDefaultChange={setIsDefault}
              onBack={() => (isEdit ? onOpenChange(false) : setStep("model"))}
              onSaveAndTest={() => handleSave({ andTest: true })}
              onJustSave={() => handleSave({ andTest: false })}
              saving={isSaving}
              isEdit={isEdit}
            />
          )}

          {step === "test" && (
            <TestStep
              result={testResult}
              isTesting={isTesting}
              onRetry={runTestAgain}
              onClose={() => {
                onOpenChange(false);
                router.refresh();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// -----------------------------------------------------------------------------
// Stepper
// -----------------------------------------------------------------------------
function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ["provider", "credentials", "model", "behavior"];
  const i = Math.max(0, steps.indexOf(step));
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {steps.map((s, idx) => (
        <div
          key={s}
          className={cn(
            "flex-1 h-1 rounded-full transition-colors",
            idx <= i ? "bg-brand-2" : "bg-bg-3",
          )}
        />
      ))}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 1: elegir rol + proveedor
// -----------------------------------------------------------------------------
function ProviderStep({
  role,
  onRoleChange,
  provider,
  onProviderChange,
  onNext,
}: {
  role: Role;
  onRoleChange: (r: Role) => void;
  provider: ProviderId;
  onProviderChange: (p: ProviderId) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <label className="text-xs font-medium text-fg-3 uppercase tracking-wider mb-2 block">
          ¿Para qué tarea?
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ROLE_META) as Role[]).map((r) => {
            const meta = ROLE_META[r];
            const active = role === r;
            return (
              <button
                key={r}
                onClick={() => onRoleChange(r)}
                className={cn(
                  "rounded-xl border p-3 text-left transition text-sm",
                  active
                    ? "border-brand-2 bg-[rgba(139,92,246,0.08)]"
                    : "border-[color:var(--border)] bg-bg-2 hover:border-[color:var(--border-strong)]",
                )}
              >
                <div className="font-semibold">{meta.label}</div>
                <div className="text-[11px] text-fg-3 mt-0.5 leading-snug">
                  {meta.description}
                </div>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-fg-3 mt-2">{ROLE_META[role].hint}</div>
      </div>

      <div>
        <label className="text-xs font-medium text-fg-3 uppercase tracking-wider mb-2 block">
          Proveedor
        </label>
        <div className="grid grid-cols-1 gap-2 max-h-[40dvh] sm:max-h-none overflow-y-auto pr-1">
          {PROVIDERS.filter((p) => p.models.some((m) => m.roles.includes(role))).map((p) => {
            const active = provider === p.id;
            const isGateway = p.id === "vercel_gateway";
            return (
              <button
                key={p.id}
                onClick={() => onProviderChange(p.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition",
                  active
                    ? "border-brand-2 bg-[rgba(139,92,246,0.06)]"
                    : "border-[color:var(--border)] bg-bg-1 hover:border-[color:var(--border-strong)]",
                )}
              >
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ background: p.color }}
                >
                  {p.label.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="font-medium text-sm truncate">{p.label}</div>
                    {isGateway && (
                      <Badge variant="brand" className="text-[10px]">
                        <Sparkles className="h-2.5 w-2.5" /> Recomendado
                      </Badge>
                    )}
                    {p.dataRetention === "zero" && (
                      <Badge variant="green" className="text-[10px]">
                        Zero-retention
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-fg-3 truncate">{p.tagline}</div>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    active ? "text-brand-2" : "text-fg-4",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext}>Continuar</Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 2: credenciales
// -----------------------------------------------------------------------------
function CredentialsStep({
  provider,
  apiKey,
  onApiKeyChange,
  showKey,
  onToggleShow,
  baseUrl,
  onBaseUrlChange,
  isEdit,
  hasExistingKey,
  existingKeyPreview,
  onBack,
  onNext,
  canContinue,
}: {
  provider: ProviderId;
  apiKey: string;
  onApiKeyChange: (v: string) => void;
  showKey: boolean;
  onToggleShow: () => void;
  baseUrl: string;
  onBaseUrlChange: (v: string) => void;
  isEdit: boolean;
  hasExistingKey: boolean;
  existingKeyPreview: string | null;
  onBack: () => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  const def = PROVIDER_BY_ID.get(provider)!;
  const needsKey = !!def.apiKeyField;
  const needsBaseUrl = def.supportsBaseUrl && provider === "custom";

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[color:var(--border)] bg-bg-2 p-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-fg-3" />
          <div className="text-sm font-medium">Credenciales de {def.label}</div>
        </div>
        <p className="text-xs text-fg-3 leading-relaxed">
          Guardamos tu clave cifrada en Supabase y la usamos sólo del lado servidor. Nunca
          se expone en el navegador.
          {def.docsUrl && (
            <>
              {" "}
              <a
                href={def.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-2 hover:underline inline-flex items-center gap-0.5"
              >
                Dónde conseguirla
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </p>
      </div>

      {needsKey && (
        <div>
          <label className="text-xs font-medium text-fg-3 mb-1.5 block">
            API Key
          </label>
          <div className="relative">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={
                isEdit && hasExistingKey
                  ? `Guardada: ${existingKeyPreview ?? "••••"} — dejá vacío para no cambiar`
                  : "sk-..."
              }
              autoComplete="off"
              spellCheck={false}
              className="pr-10 font-mono text-sm"
            />
            <button
              type="button"
              onClick={onToggleShow}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-fg-3 hover:text-fg hover:bg-bg-3"
              aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {isEdit && hasExistingKey && (
            <div className="text-[11px] text-fg-4 mt-1">
              Dejá el campo vacío para mantener la clave actual.
            </div>
          )}
        </div>
      )}

      {needsBaseUrl && (
        <div>
          <label className="text-xs font-medium text-fg-3 mb-1.5 block">
            URL base del endpoint
          </label>
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder="https://tu-servidor.com/v1"
            className="font-mono text-sm"
          />
          <div className="text-[11px] text-fg-4 mt-1">
            Tiene que hablar el protocolo de OpenAI (/chat/completions).
          </div>
        </div>
      )}

      {provider === "ollama" && (
        <div>
          <label className="text-xs font-medium text-fg-3 mb-1.5 block">
            URL de Ollama (opcional)
          </label>
          <Input
            type="url"
            value={baseUrl}
            onChange={(e) => onBaseUrlChange(e.target.value)}
            placeholder="http://localhost:11434/v1"
            className="font-mono text-sm"
          />
        </div>
      )}

      {!needsKey && provider === "ollama" && (
        <div className="rounded-lg border border-[color:var(--border)] bg-bg-1 p-3 text-xs text-fg-3">
          Ollama corre local. No necesita API key.
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={onNext} disabled={!canContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 3: elegir modelo
// -----------------------------------------------------------------------------
function ModelStep({
  provider,
  role,
  model,
  onModelChange,
  onBack,
  onNext,
}: {
  provider: ProviderId;
  role: Role;
  model: string;
  onModelChange: (m: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const def = PROVIDER_BY_ID.get(provider)!;
  const models = def.models.filter((m) => m.roles.includes(role));
  const allowCustom = provider === "custom" || provider === "ollama";

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs text-fg-3">
        Modelos disponibles para <b className="text-fg-2">{ROLE_META[role].label.toLowerCase()}</b> en {def.label}.
      </div>
      <div className="grid grid-cols-1 gap-2 max-h-[50dvh] overflow-y-auto pr-1">
        {models.map((m) => {
          const active = model === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onModelChange(m.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                active
                  ? "border-brand-2 bg-[rgba(139,92,246,0.06)]"
                  : "border-[color:var(--border)] bg-bg-1 hover:border-[color:var(--border-strong)]",
              )}
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <div className="font-medium text-sm">{m.label}</div>
                {m.recommended && (
                  <Badge variant="brand" className="text-[10px]">
                    <Sparkles className="h-2.5 w-2.5" /> Recomendado
                  </Badge>
                )}
                {m.context && m.context >= 1_000_000 && (
                  <Badge variant="default" className="text-[10px]">
                    <Flame className="h-2.5 w-2.5" /> {(m.context / 1_000_000).toFixed(0)}M ctx
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-fg-3 font-mono">{m.id}</div>
              {(m.inputPer1M != null || m.outputPer1M != null || m.notes) && (
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px] text-fg-3">
                  {m.inputPer1M != null && (
                    <span>
                      Input: <span className="text-fg-2 font-mono">${m.inputPer1M}/1M</span>
                    </span>
                  )}
                  {m.outputPer1M != null && (
                    <span>
                      Output: <span className="text-fg-2 font-mono">${m.outputPer1M}/1M</span>
                    </span>
                  )}
                  {m.notes && <span className="text-fg-4">· {m.notes}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {allowCustom && (
        <div>
          <label className="text-xs font-medium text-fg-3 mb-1.5 block">
            O escribí el id del modelo manualmente
          </label>
          <Input
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder={provider === "ollama" ? "llama3.1:8b" : "mi-modelo"}
            className="font-mono text-sm"
          />
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={onNext} disabled={!model.trim()}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 4: comportamiento
// -----------------------------------------------------------------------------
function BehaviorStep({
  role,
  nickname,
  onNicknameChange,
  temperature,
  onTemperatureChange,
  maxTokens,
  onMaxTokensChange,
  isDefault,
  onIsDefaultChange,
  onBack,
  onSaveAndTest,
  onJustSave,
  saving,
  isEdit,
}: {
  role: Role;
  nickname: string;
  onNicknameChange: (v: string) => void;
  temperature: number;
  onTemperatureChange: (v: number) => void;
  maxTokens: number;
  onMaxTokensChange: (v: number) => void;
  isDefault: boolean;
  onIsDefaultChange: (v: boolean) => void;
  onBack: () => void;
  onSaveAndTest: () => void;
  onJustSave: () => void;
  saving: boolean;
  isEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium text-fg-3 mb-1.5 block">Nombre en tu cuenta</label>
        <Input
          value={nickname}
          onChange={(e) => onNicknameChange(e.target.value)}
          placeholder="Claude principal"
          maxLength={60}
        />
      </div>

      {role !== "embedding" && (
        <>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-fg-3">
                Creatividad (temperature)
              </label>
              <span className="text-xs font-mono text-fg-2">
                {(temperature / 100).toFixed(2)}
              </span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([v]) => onTemperatureChange(v)}
              min={0}
              max={200}
              step={5}
            />
            <div className="grid grid-cols-3 gap-2 mt-1.5 text-[11px] text-fg-3">
              <span className="text-left">Literal</span>
              <span className="text-center">Balanceado</span>
              <span className="text-right">Creativo</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-fg-3">
                Longitud máxima de respuesta
              </label>
              <span className="text-xs font-mono text-fg-2">{maxTokens} tokens</span>
            </div>
            <Slider
              value={[maxTokens]}
              onValueChange={([v]) => onMaxTokensChange(v)}
              min={50}
              max={2000}
              step={50}
            />
            <div className="text-[11px] text-fg-4 mt-1">
              ~{Math.round(maxTokens * 0.75)} palabras aprox.
            </div>
          </div>
        </>
      )}

      <label className="flex items-start gap-3 rounded-xl border border-[color:var(--border)] bg-bg-2 p-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => onIsDefaultChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-2"
        />
        <div className="flex-1">
          <div className="text-sm font-medium">Usar como modelo principal para este rol</div>
          <div className="text-[11px] text-fg-3 mt-0.5">
            Cualquier otro modelo marcado como principal para <b>{ROLE_META[role].label}</b> deja
            de serlo automáticamente.
          </div>
        </div>
      </label>

      <div className="flex justify-between items-center pt-1">
        <Button variant="ghost" onClick={onBack}>
          {isEdit ? "Cancelar" : "Atrás"}
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onJustSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
          </Button>
          <Button onClick={onSaveAndTest} disabled={saving} className="gap-1.5">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Guardar y probar
          </Button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Step 5: resultado del test
// -----------------------------------------------------------------------------
function TestStep({
  result,
  isTesting,
  onRetry,
  onClose,
}: {
  result: null | { ok: boolean; latencyMs: number; sample?: string; error?: string };
  isTesting: boolean;
  onRetry: () => void;
  onClose: () => void;
}) {
  if (isTesting || !result) {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-4">
        <div className="h-14 w-14 rounded-full bg-[rgba(139,92,246,0.12)] flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-brand-2" />
        </div>
        <div>
          <div className="font-semibold">Probando la conexión…</div>
          <div className="text-sm text-fg-3 mt-0.5">
            Mandamos un ping al modelo y esperamos respuesta.
          </div>
        </div>
      </div>
    );
  }

  if (result.ok) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-[color:var(--accent-green)]/30 bg-[rgba(16,185,129,0.06)] p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-[color:var(--accent-green)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg">Funciona</div>
              <div className="text-sm text-fg-2 mt-0.5">
                El modelo respondió correctamente en{" "}
                <b className="font-mono">{result.latencyMs}ms</b>.
              </div>
            </div>
          </div>
          {result.sample && (
            <div className="mt-4 rounded-xl bg-bg-1 border border-[color:var(--border)] p-3">
              <div className="text-[11px] text-fg-3 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Respuesta recibida
              </div>
              <div className="text-sm font-mono">{result.sample}</div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onRetry}>
            Probar de nuevo
          </Button>
          <Button onClick={onClose}>Listo</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[color:var(--accent-red)]/30 bg-[rgba(239,68,68,0.05)] p-5">
        <div className="flex items-start gap-3">
          <XCircle className="h-6 w-6 text-[color:var(--accent-red)] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg">No pudimos conectar</div>
            <div className="text-sm text-fg-2 mt-0.5">
              El modelo rechazó el pedido después de {result.latencyMs}ms.
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-bg-1 border border-[color:var(--accent-red)]/25 p-3">
          <div className="text-[11px] text-fg-3 uppercase tracking-wider mb-1">Error</div>
          <div className="text-xs font-mono text-[color:var(--accent-red-2)] whitespace-pre-wrap break-words">
            {result.error}
          </div>
        </div>
        <div className="mt-3 text-xs text-fg-3 leading-relaxed">
          Causas típicas: clave inválida, modelo no disponible en tu cuenta, cuota agotada, o el
          proveedor pide facturación habilitada.
        </div>
      </div>
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onClose}>
          Cerrar
        </Button>
        <Button onClick={onRetry} className="gap-1.5">
          <Zap className="h-4 w-4" /> Reintentar
        </Button>
      </div>
    </div>
  );
}
