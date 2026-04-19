"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  Filter,
  X,
  Tag,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, initials, avatarGradient, formatRelative, money } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import { createContact, updateContactStage, updateContactTags } from "@/app/actions/contacts";
import { TexMascot, TexSpeechBubble, TEX_COPY } from "@/components/tex";

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  channel: string | null;
  stage: string;
  tags: string[];
  value: number;
  source: string | null;
  last_interaction_at: string | null;
};

type Stage = { id: string; name: string; color: string; position: number };

export function ContactsView({ contacts, stages }: { contacts: Contact[]; stages: Stage[] }) {
  const [view, setView] = useState<"table" | "kanban">("table");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState<Contact | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const filtered = useMemo(
    () =>
      contacts.filter((c) => {
        if (!search) return true;
        return c.name.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.includes(search);
      }),
    [contacts, search]
  );

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="flex flex-col min-h-0 h-[100dvh] md:h-[calc(100dvh-56px)]">
      <header className="px-4 md:px-6 py-3 md:py-4 flex flex-col md:flex-row md:items-center gap-3 border-b border-[color:var(--border)]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Contactos</h1>
          <Badge>{contacts.length}</Badge>
          <div className="md:hidden ml-auto">
            <Button size="icon" onClick={() => setNewOpen(true)} aria-label="Nuevo contacto">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="hidden md:block flex-1" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-[color:var(--border)] bg-bg-1 p-1 shrink-0">
            <button
              onClick={() => setView("table")}
              className={cn("px-3 h-9 md:h-8 rounded-lg text-xs flex items-center gap-1.5 transition", view === "table" ? "bg-bg-3 text-fg font-medium" : "text-fg-3")}
            >
              <List className="h-3.5 w-3.5" /> <span>Tabla</span>
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("px-3 h-9 md:h-8 rounded-lg text-xs flex items-center gap-1.5 transition", view === "kanban" ? "bg-bg-3 text-fg font-medium" : "text-fg-3")}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> <span>Kanban</span>
            </button>
          </div>
          <div className="relative flex-1 md:flex-none">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              className="h-11 md:h-9 pl-9 md:w-64"
              inputMode="search"
              autoComplete="off"
            />
          </div>
        </div>
        <Button className="hidden md:inline-flex gap-2" onClick={() => setNewOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo contacto
        </Button>
      </header>

      {selected.length > 0 && (
        <div className="px-4 md:px-6 py-2 bg-[rgba(139,92,246,0.08)] border-b border-[color:var(--border)] flex items-center gap-2 md:gap-3 text-sm overflow-x-auto no-scrollbar">
          <span className="text-brand-2 font-medium shrink-0">{selected.length} sel.</span>
          <Button size="sm" variant="secondary" className="shrink-0">Tag</Button>
          <Button size="sm" variant="secondary" className="shrink-0">Etapa</Button>
          <Button size="sm" variant="secondary" className="hidden sm:inline-flex shrink-0">
            Enviar broadcast
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" className="sm:hidden shrink-0" aria-label="Más acciones">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Enviar broadcast</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1 hidden md:block" />
          <button onClick={() => setSelected([])} className="text-xs text-fg-3 hover:text-fg shrink-0 ml-auto md:ml-0">
            Limpiar
          </button>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {view === "table" ? (
          <TableView contacts={filtered} selected={selected} toggle={toggle} onOpen={(c) => setOpen(c)} />
        ) : (
          <KanbanView contacts={filtered} stages={stages} onOpen={(c) => setOpen(c)} />
        )}
      </div>

      {/* Detail Sheet — slides from right, full-width on mobile, max-md on desktop */}
      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="right" className="p-0 w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center text-white text-base font-bold shrink-0"
                    style={{ backgroundImage: avatarGradient(open.name) }}
                  >
                    {initials(open.name)}
                  </div>
                  <div className="min-w-0">
                    <SheetTitle className="truncate">{open.name}</SheetTitle>
                    <div className="text-xs text-fg-3">{open.stage}</div>
                  </div>
                </div>
              </SheetHeader>
              <div className="px-5 flex-1 overflow-y-auto py-4">
                <dl className="flex flex-col gap-0">
                  <FieldRow label="Teléfono" value={open.phone} icon={<Phone className="h-4 w-4" />} />
                  <FieldRow label="Email" value={open.email} icon={<Mail className="h-4 w-4" />} />
                  <FieldRow label="Canal" value={open.channel} icon={<User className="h-4 w-4" />} />
                  <FieldRow label="Fuente" value={open.source} />
                  <FieldRow label="Valor" value={money(open.value)} />
                  <FieldRow label="Última interacción" value={formatRelative(open.last_interaction_at)} />
                </dl>
                <div className="mt-6">
                  <div className="text-xs uppercase tracking-wider text-fg-3 font-medium mb-2 flex items-center gap-2">
                    <Tag className="h-3 w-3" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {open.tags.length === 0 && <span className="text-xs text-fg-3">Sin tags todavía.</span>}
                    {open.tags.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-[color:var(--border)]">
                <Button asChild className="w-full">
                  <a href={`/conversaciones?open=${open.id}`}>Ver conversaciones</a>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <NewContactModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function TableView({
  contacts,
  selected,
  toggle,
  onOpen,
}: {
  contacts: Contact[];
  selected: string[];
  toggle: (id: string) => void;
  onOpen: (c: Contact) => void;
}) {
  if (!contacts.length) {
    return (
      <div className="py-12">
        <div className="flex flex-col items-center gap-3 px-4">
          <TexMascot variant="default" size="lg" popIn idle />
          <TexSpeechBubble tail="top-left" tone="info" maxWidth={360}>
            <span className="text-[13px]">{TEX_COPY.empty.noContacts}</span>
          </TexSpeechBubble>
        </div>
      </div>
    );
  }
  return (
    <>
      {/* Mobile: card list */}
      <ul className="md:hidden flex flex-col divide-y divide-[color:var(--border)]">
        {contacts.map((c) => {
          const isSel = selected.includes(c.id);
          return (
            <li
              key={c.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 active:bg-bg-2 transition-colors",
                isSel && "bg-[rgba(139,92,246,0.06)]"
              )}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(c.id);
                }}
                aria-label="Seleccionar"
                className="pt-1 shrink-0"
              >
                <Checkbox checked={isSel} onCheckedChange={() => toggle(c.id)} />
              </button>
              <button
                type="button"
                onClick={() => onOpen(c)}
                className="flex-1 min-w-0 text-left flex items-start gap-3"
              >
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ backgroundImage: avatarGradient(c.name) }}
                >
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-fg truncate flex-1">{c.name}</div>
                    <div className="text-[11px] text-fg-3 shrink-0">{formatRelative(c.last_interaction_at)}</div>
                  </div>
                  <div className="text-xs text-fg-3 truncate mt-0.5">{c.phone || c.email || c.channel || "—"}</div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant="brand">{c.stage}</Badge>
                    {c.tags.slice(0, 2).map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                    {c.tags.length > 2 && (
                      <span className="text-[11px] text-fg-3">+{c.tags.length - 2}</span>
                    )}
                    {c.value > 0 && (
                      <span className="ml-auto font-mono tabular-nums text-xs text-fg">{money(c.value)}</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Desktop: full table */}
      <table className="hidden md:table w-full text-sm">
        <thead className="sticky top-0 bg-bg-0 z-10 border-b border-[color:var(--border)]">
          <tr className="text-left text-[11px] uppercase tracking-wider text-fg-3">
            <th className="w-10 px-4 py-3"></th>
            <th className="px-3 py-3 font-medium">Nombre</th>
            <th className="px-3 py-3 font-medium">Canal</th>
            <th className="px-3 py-3 font-medium">Etapa</th>
            <th className="px-3 py-3 font-medium">Tags</th>
            <th className="px-3 py-3 font-medium">Valor</th>
            <th className="px-3 py-3 font-medium">Última</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr
              key={c.id}
              onClick={() => onOpen(c)}
              className="border-b border-[color:var(--border)] hover:bg-bg-1 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} />
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[11px] font-semibold shrink-0"
                    style={{ backgroundImage: avatarGradient(c.name) }}
                  >
                    {initials(c.name)}
                  </div>
                  <div>
                    <div className="font-medium text-fg">{c.name}</div>
                    <div className="text-[11px] text-fg-3">{c.phone || c.email || "—"}</div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-fg-2">{c.channel || "—"}</td>
              <td className="px-3 py-3">
                <Badge variant="brand">{c.stage}</Badge>
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {c.tags.slice(0, 3).map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                  {c.tags.length > 3 && <span className="text-[11px] text-fg-3">+{c.tags.length - 3}</span>}
                </div>
              </td>
              <td className="px-3 py-3 font-mono tabular-nums text-fg">{money(c.value)}</td>
              <td className="px-3 py-3 text-fg-3 text-xs">{formatRelative(c.last_interaction_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function KanbanView({
  contacts,
  stages,
  onOpen,
}: {
  contacts: Contact[];
  stages: Stage[];
  onOpen: (c: Contact) => void;
}) {
  const byStage = useMemo(() => {
    const m: Record<string, Contact[]> = {};
    for (const s of stages) m[s.name] = [];
    for (const c of contacts) {
      if (!m[c.stage]) m[c.stage] = [];
      m[c.stage].push(c);
    }
    return m;
  }, [contacts, stages]);

  const [isPending, start] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);

  return (
    <div className="flex gap-3 p-3 md:p-4 min-h-full overflow-x-auto snap-x snap-mandatory md:snap-none">
      {stages.map((s) => (
        <div
          key={s.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("id");
            if (!id) return;
            start(async () => {
              await updateContactStage(id, s.name);
            });
            setDragging(null);
          }}
          className="w-[85vw] sm:w-72 shrink-0 bg-bg-1 rounded-2xl border border-[color:var(--border)] flex flex-col snap-start md:snap-align-none"
        >
          <header className="px-3 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="font-medium text-sm">{s.name}</span>
              <span className="text-xs text-fg-3">{byStage[s.name]?.length || 0}</span>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2 no-scrollbar">
            {(byStage[s.name] || []).map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("id", c.id);
                  setDragging(c.id);
                }}
                onClick={() => onOpen(c)}
                className={cn(
                  "rounded-xl border border-[color:var(--border)] bg-bg-0 p-3 cursor-pointer hover:border-[color:var(--border-strong)] transition-all",
                  dragging === c.id && "opacity-40"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold"
                    style={{ backgroundImage: avatarGradient(c.name) }}
                  >
                    {initials(c.name)}
                  </div>
                  <div className="font-medium text-sm truncate flex-1">{c.name}</div>
                </div>
                <div className="text-xs text-fg-3 truncate mb-1.5">{c.channel || "—"} · {formatRelative(c.last_interaction_at)}</div>
                <div className="flex flex-wrap gap-1">
                  {c.tags.slice(0, 2).map((t) => (
                    <Chip key={t}>{t}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldRow({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-[color:var(--border)] last:border-0 flex items-center justify-between gap-3">
      <div className="text-xs text-fg-3 flex items-center gap-1.5">{icon}{label}</div>
      <div className="text-sm">{value || "—"}</div>
    </div>
  );
}

function NewContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", channel: "whatsapp" });
  const [isPending, start] = useTransition();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo contacto</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            placeholder="Nombre completo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              placeholder="Teléfono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
            <Input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              inputMode="email"
              autoComplete="email"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DialogClose>
          <Button
            disabled={!form.name.trim() || isPending}
            onClick={() =>
              start(async () => {
                await createContact({ name: form.name, phone: form.phone, email: form.email, channel: form.channel });
                onClose();
              })
            }
          >
            Crear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
