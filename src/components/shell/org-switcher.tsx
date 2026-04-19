"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initials, avatarGradient } from "@/lib/utils";
import { switchOrgAction } from "@/app/actions/auth";

type Role = "admin" | "agent" | "readonly";
type Membership = { org_id: string; role: Role; name: string; logo_url: string | null };

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  agent: "Agente",
  readonly: "Lectura",
};

export function OrgSwitcher({
  currentOrgId,
  memberships,
  role,
  compact = false,
}: {
  currentOrgId: string;
  memberships: Membership[];
  role: Role;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const current = memberships.find((m) => m.org_id === currentOrgId) ?? memberships[0];

  async function handleSwitch(orgId: string) {
    if (orgId === currentOrgId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await switchOrgAction(orgId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      router.push("/inicio");
      router.refresh();
    });
  }

  const trigger = (
    <button
      type="button"
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-bg-2 transition group",
        compact && "justify-center px-1.5",
      )}
      aria-label="Cambiar organización"
    >
      <div
        className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-[0_4px_16px_rgba(139,92,246,0.35)]"
        style={{
          backgroundImage: current?.logo_url
            ? `url(${current.logo_url})`
            : avatarGradient(current?.name ?? "T"),
          backgroundSize: "cover",
        }}
      >
        {!current?.logo_url && initials(current?.name ?? "T")}
      </div>
      {!compact && (
        <>
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <div className="text-sm font-semibold truncate">{current?.name ?? "TextOS"}</div>
            <div className="text-[10px] uppercase tracking-wider text-fg-4 leading-none mt-0.5">
              {ROLE_LABEL[role]}
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-fg-4 group-hover:text-fg-2 shrink-0" />
        </>
      )}
    </button>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-fg-4">
          Tus organizaciones
        </DropdownMenuLabel>
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.org_id}
            onSelect={(e) => {
              e.preventDefault();
              handleSwitch(m.org_id);
            }}
            className="flex items-center gap-2.5 py-2"
          >
            <div
              className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{
                backgroundImage: m.logo_url ? `url(${m.logo_url})` : avatarGradient(m.name),
                backgroundSize: "cover",
              }}
            >
              {!m.logo_url && initials(m.name)}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm truncate">{m.name}</span>
              <span className="text-[10px] text-fg-4 uppercase tracking-wider">{ROLE_LABEL[m.role]}</span>
            </div>
            {m.org_id === currentOrgId && <Check className="h-4 w-4 text-brand shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Crear nueva organización
          </Link>
        </DropdownMenuItem>
        {role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/ajustes?tab=equipo" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> Gestionar equipo
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
