"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Copy, Trash2, Shield, ShieldCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { inviteMember, revokeInvite, removeMember, changeMemberRole } from "@/app/actions/team";

type Role = "admin" | "agent" | "readonly";
type Member = { user_id: string; role: Role; created_at: string; display?: string };
type Invite = {
  id: string;
  email: string;
  role: Role;
  token: string;
  accepted_at: string | null;
  created_at: string;
};

const ROLE_META: Record<Role, { label: string; icon: React.ElementType; hint: string }> = {
  admin: { label: "Admin", icon: ShieldCheck, hint: "Control total del workspace" },
  agent: { label: "Agente", icon: Shield, hint: "Puede responder y editar" },
  readonly: { label: "Lectura", icon: Eye, hint: "Solo puede mirar" },
};

export function TeamSection({
  members,
  invites,
  currentUserId,
  role: myRole,
  orgName,
}: {
  members: Member[];
  invites: Invite[];
  currentUserId: string;
  role: Role;
  orgName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("agent");
  const [pending, startTransition] = useTransition();

  const isAdmin = myRole === "admin";

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const res = await inviteMember({ email: email.trim(), role: newRole });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const link = inviteLink(res.data?.token ?? "");
      await copy(link);
      toast.success("Invitación creada · Link copiado al portapapeles");
      setEmail("");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Equipo</h2>
          <p className="text-sm text-fg-3 mt-1">
            Gestioná quién tiene acceso a <b>{orgName}</b>.
          </p>
        </div>
      </div>

      {isAdmin && (
        <form
          onSubmit={handleInvite}
          className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-4 mb-6 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[220px] space-y-1.5">
            <label className="text-xs text-fg-3">Email para invitar</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colega@empresa.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-fg-3">Rol</label>
            <RoleSelect value={newRole} onChange={setNewRole} />
          </div>
          <Button type="submit" disabled={pending} className="gap-2">
            <Plus className="h-4 w-4" /> Invitar
          </Button>
        </form>
      )}

      <div className="text-xs uppercase tracking-wider text-fg-4 mb-2">Miembros · {members.length}</div>
      <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 overflow-hidden mb-6">
        {members.map((m) => {
          const isMe = m.user_id === currentUserId;
          const Icon = ROLE_META[m.role].icon;
          return (
            <div
              key={m.user_id}
              className="flex items-center gap-3 px-5 py-4 border-b border-[color:var(--border)] last:border-0"
            >
              <div className="h-9 w-9 rounded-full bg-bg-3 flex items-center justify-center text-sm font-semibold">
                {m.user_id.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {isMe ? "Vos" : `Miembro ${m.user_id.slice(0, 6)}`}
                  {isMe && <Badge variant="brand">Vos</Badge>}
                </div>
                <div className="text-xs text-fg-3 flex items-center gap-1.5">
                  <Icon className="h-3 w-3" />
                  {ROLE_META[m.role].hint}
                </div>
              </div>
              {isAdmin && !isMe ? (
                <MemberActions
                  member={m}
                  onChange={(role) =>
                    startTransition(async () => {
                      const res = await changeMemberRole(m.user_id, role);
                      if (!res.ok) return toast.error(res.error);
                      toast.success("Rol actualizado");
                      router.refresh();
                    })
                  }
                  onRemove={() =>
                    startTransition(async () => {
                      const res = await removeMember(m.user_id);
                      if (!res.ok) return toast.error(res.error);
                      toast.success("Miembro quitado");
                      router.refresh();
                    })
                  }
                />
              ) : (
                <Badge variant={m.role === "admin" ? "brand" : "default"}>
                  {ROLE_META[m.role].label}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {invites.length > 0 && (
        <>
          <div className="text-xs uppercase tracking-wider text-fg-4 mb-2">
            Invitaciones · {invites.filter((i) => !i.accepted_at).length} pendientes
          </div>
          <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 overflow-hidden">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 border-b border-[color:var(--border)] last:border-0",
                  inv.accepted_at && "opacity-60",
                )}
              >
                <div className="flex-1">
                  <div className="font-medium">{inv.email}</div>
                  <div className="text-xs text-fg-3">
                    {inv.accepted_at ? "Aceptada" : "Pendiente"} · {ROLE_META[inv.role].label}
                  </div>
                </div>
                {!inv.accepted_at && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      onClick={async () => {
                        await copy(inviteLink(inv.token));
                        toast.success("Link copiado");
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar link
                    </Button>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          startTransition(async () => {
                            const res = await revokeInvite(inv.id);
                            if (!res.ok) return toast.error(res.error);
                            toast.success("Invitación revocada");
                            router.refresh();
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RoleSelect({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5 min-w-[140px] justify-between">
          {ROLE_META[value].label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {(Object.keys(ROLE_META) as Role[]).map((r) => {
          const Icon = ROLE_META[r].icon;
          return (
            <DropdownMenuItem key={r} onSelect={() => onChange(r)} className="flex items-start gap-2 py-2">
              <Icon className="h-4 w-4 mt-0.5 text-fg-3" />
              <div>
                <div className="text-sm font-medium">{ROLE_META[r].label}</div>
                <div className="text-[11px] text-fg-4">{ROLE_META[r].hint}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MemberActions({
  member,
  onChange,
  onRemove,
}: {
  member: Member;
  onChange: (role: Role) => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          {ROLE_META[member.role].label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(ROLE_META) as Role[]).map((r) => (
          <DropdownMenuItem
            key={r}
            onSelect={() => onChange(r)}
            disabled={r === member.role}
            className="py-2"
          >
            <span className="text-sm">{ROLE_META[r].label}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          onSelect={onRemove}
          className="text-red-400 focus:text-red-300 focus:bg-red-500/10 py-2"
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" />
          Quitar del equipo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function inviteLink(token: string) {
  if (typeof window === "undefined") return `/invitacion/${token}`;
  return `${window.location.origin}/invitacion/${token}`;
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}
