"use client";

import { useState, useTransition } from "react";
import {
  User,
  Building2,
  Users,
  Plug,
  BrainCircuit,
  Palette,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { updateOrgProfile } from "@/app/actions/settings";
import { resetDemoSession } from "@/app/actions/orgs";
import { TeamSection as RealTeamSection } from "@/components/settings/team-section";
import { ChannelsSection } from "@/components/settings/channels-section";
import { AiSection } from "@/components/settings/ai-section";
import type { SafeChannel } from "@/app/actions/channels";
import type { SafeAiProvider } from "@/app/actions/ai";

type Org = {
  id: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  timezone: string;
  tone: string;
  threshold_auto: number;
  threshold_suggest: number;
  shadow_mode: boolean;
  never_promise: string[];
  must_escalate: string[];
};

type Channel = SafeChannel;

const SECTIONS = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "org", label: "Organización", icon: Building2 },
  { id: "team", label: "Equipo", icon: Users },
  { id: "channels", label: "Canales", icon: Plug },
  { id: "ai", label: "IA", icon: BrainCircuit },
  { id: "appearance", label: "Apariencia", icon: Palette },
  { id: "billing", label: "Facturación", icon: CreditCard },
];

type Role = "admin" | "agent" | "readonly";
type Member = { user_id: string; role: Role; created_at: string };
type Invite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  accepted_at: string | null;
  created_at: string;
};

export function SettingsView({
  org,
  channels,
  team,
  role,
  currentUserId,
  aiProviders,
  initialSection,
}: {
  org: Org;
  channels: Channel[];
  team: { members: Member[]; invites: Invite[] };
  role: Role;
  currentUserId: string;
  aiProviders: SafeAiProvider[];
  initialSection?: string;
}) {
  const [sec, setSec] = useState(initialSection ?? "ai");
  return (
    <div className="flex flex-col md:flex-row h-[100dvh] md:h-[calc(100dvh-56px)]">
      {/* Mobile: horizontal pill tabs */}
      <nav className="md:hidden flex gap-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-[color:var(--border)] bg-bg-1 shrink-0">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = sec === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSec(s.id)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full text-sm transition-colors border",
                active
                  ? "bg-brand/10 border-brand/40 text-fg"
                  : "bg-bg-2 border-[color:var(--border)] text-fg-2"
              )}
            >
              <Icon className="h-4 w-4" /> {s.label}
            </button>
          );
        })}
      </nav>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:block w-56 border-r border-[color:var(--border)] bg-bg-1 p-2 shrink-0">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setSec(s.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm transition-colors",
                sec === s.id ? "bg-bg-3 text-fg font-medium" : "text-fg-3 hover:text-fg hover:bg-bg-2"
              )}
            >
              <Icon className="h-[18px] w-[18px]" /> {s.label}
            </button>
          );
        })}
      </aside>
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-6 md:py-8 max-w-3xl w-full mx-auto md:mx-0">
        {sec === "ai" && <AiSection org={org} providers={aiProviders} />}
        {sec === "profile" && <ProfileSection org={org} />}
        {sec === "org" && <OrgSection org={org} />}
        {sec === "team" && (
          <RealTeamSection
            members={team.members}
            invites={team.invites}
            currentUserId={currentUserId}
            role={role}
            orgName={org.name}
          />
        )}
        {sec === "channels" && <ChannelsSection orgName={org.name} channels={channels} />}
        {sec === "appearance" && <AppearanceSection />}
        {sec === "billing" && <BillingSection />}
      </main>
    </div>
  );
}

function ProfileSection({ org }: { org: Org }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Perfil</h2>
      <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5 flex flex-col gap-4">
        <Field label="Nombre" value="Tú" />
        <Field label="Email" value="tu@negocio.com" />
        <Field label="Idioma" value="Español" />
      </div>
    </div>
  );
}

function OrgSection({ org }: { org: Org }) {
  const [name, setName] = useState(org.name);
  const [tagline, setTagline] = useState(org.tagline || "");
  const [isPending, start] = useTransition();
  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Organización</h2>
      <p className="text-fg-3 text-sm mb-6">Datos que ve tu IA al responder.</p>
      <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5 flex flex-col gap-4">
        <div>
          <label className="text-xs text-fg-3 font-medium mb-1 block">Nombre del negocio</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-fg-3 font-medium mb-1 block">Tagline</label>
          <Input value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-fg-3 font-medium mb-1 block">Zona horaria</label>
          <Input value={org.timezone} readOnly />
        </div>
        <div className="flex justify-between">
          <form action={async () => { await resetDemoSession(); }}>
            <Button variant="ghost" size="sm" type="submit">Rehacer onboarding</Button>
          </form>
          <Button
            disabled={isPending}
            onClick={() =>
              start(async () => {
                await updateOrgProfile({ name, tagline });
                toast.success("Guardado");
              })
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Apariencia</h2>
      <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-5">
        <h3 className="font-semibold mb-3">Tema</h3>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          {["dark", "light"].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                theme === t ? "border-brand bg-[rgba(139,92,246,0.08)]" : "border-[color:var(--border)] bg-bg-2"
              )}
            >
              <div className="font-medium capitalize">{t === "dark" ? "Oscuro" : "Claro"}</div>
              <div className="text-xs text-fg-3">{t === "dark" ? "Recomendado para uso prolongado" : "Para ambientes muy iluminados"}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BillingSection() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Facturación</h2>
      <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-8 text-center">
        <CreditCard className="h-10 w-10 text-fg-3 mx-auto mb-3" />
        <div className="font-semibold mb-1">Plan: Prueba</div>
        <div className="text-sm text-fg-3 mb-4">Estás probando TextOS con todas las funciones.</div>
        <Button>Elegir plan</Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-fg-3 font-medium mb-1 block">{label}</label>
      <Input value={value} readOnly />
    </div>
  );
}
