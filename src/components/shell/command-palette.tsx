"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCommand } from "@/components/shell/command-context";
import { NAV } from "@/lib/nav";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import {
  MessageSquarePlus,
  Search,
  Megaphone,
  PlusCircle,
  Moon,
  Sun,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SearchHit = { type: "contact" | "conv"; id: string; title: string; subtitle?: string };

export function CommandPalette({ orgId }: { orgId: string }) {
  const { isOpen, close } = useCommand();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setHits([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setHits([]);
      return;
    }
    const sb = createClient();
    let alive = true;
    (async () => {
      const [{ data: contacts }, { data: convs }] = await Promise.all([
        sb
          .from("textos_contacts")
          .select("id,name,phone,email,channel")
          .eq("org_id", orgId)
          .ilike("name", `%${query}%`)
          .limit(6),
        sb
          .from("textos_conversations")
          .select("id,last_message,textos_contacts!inner(name)")
          .eq("org_id", orgId)
          .ilike("last_message", `%${query}%`)
          .limit(6),
      ]);
      if (!alive) return;
      const h: SearchHit[] = [];
      contacts?.forEach((c) =>
        h.push({ type: "contact", id: c.id, title: c.name, subtitle: c.phone || c.email || c.channel || "" })
      );
      convs?.forEach((c) =>
        h.push({
          type: "conv",
          id: c.id,
          title: (c as unknown as { textos_contacts: { name: string } }).textos_contacts.name,
          subtitle: c.last_message || "",
        })
      );
      setHits(h);
    })();
    return () => {
      alive = false;
    };
  }, [query, orgId]);

  function go(path: string) {
    close();
    router.push(path);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && close()}>
      <DialogContent
        className={cn(
          // Mobile: full-dvh top sheet aligned to top so the keyboard doesn't cover results.
          "p-0 overflow-hidden inset-x-0 top-0 bottom-auto max-h-[100dvh] h-[100dvh] rounded-none pb-0 pt-[max(env(safe-area-inset-top),0.5rem)]",
          // Desktop: centered command palette.
          "sm:max-w-[620px] sm:inset-x-auto sm:top-[22%] sm:bottom-auto sm:h-auto sm:max-h-[60dvh] sm:translate-y-0 sm:rounded-2xl sm:pt-0",
        )}
        hideClose
      >
        <Command
          label="Command Menu"
          className="flex flex-col"
          shouldFilter={query.length < 2}
        >
          <div className="flex items-center gap-3 px-4 h-14 border-b border-[color:var(--border)]">
            <Search className="h-4 w-4 text-fg-3" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar o ejecutar un comando…"
              className="flex-1 bg-transparent outline-none text-base placeholder:text-fg-3"
            />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="flex-1 sm:max-h-[360px] overflow-y-auto p-2 overscroll-contain">
            <Command.Empty className="py-12 text-center text-sm text-fg-3">
              Sin coincidencias.
            </Command.Empty>

            {hits.length > 0 && (
              <Command.Group heading="Resultados" className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[11px] [&>[cmdk-group-heading]]:font-medium [&>[cmdk-group-heading]]:text-fg-4 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider">
                {hits.map((h) => (
                  <Item
                    key={`${h.type}-${h.id}`}
                    onSelect={() =>
                      go(h.type === "contact" ? `/contactos?open=${h.id}` : `/conversaciones?open=${h.id}`)
                    }
                    icon={h.type === "contact" ? <PlusCircle /> : <MessageSquarePlus />}
                    label={h.title}
                    sub={h.subtitle}
                  />
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Ir a"
              className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[11px] [&>[cmdk-group-heading]]:font-medium [&>[cmdk-group-heading]]:text-fg-4 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider"
            >
              {NAV.map((n) => {
                const Icon = n.icon;
                return (
                  <Item
                    key={n.href}
                    onSelect={() => go(n.href)}
                    icon={<Icon />}
                    label={n.label}
                    shortcut={n.shortcut}
                  />
                );
              })}
            </Command.Group>

            <Command.Group
              heading="Acciones"
              className="[&>[cmdk-group-heading]]:px-2 [&>[cmdk-group-heading]]:py-1.5 [&>[cmdk-group-heading]]:text-[11px] [&>[cmdk-group-heading]]:font-medium [&>[cmdk-group-heading]]:text-fg-4 [&>[cmdk-group-heading]]:uppercase [&>[cmdk-group-heading]]:tracking-wider"
            >
              <Item onSelect={() => go("/contactos?new=1")} icon={<PlusCircle />} label="Nuevo contacto" />
              <Item onSelect={() => go("/campanas?new=1")} icon={<Megaphone />} label="Nueva campaña" />
              <Item onSelect={() => go("/conocimiento?new=1")} icon={<Sparkles />} label="Crear tarjeta de conocimiento" />
              <Item onSelect={() => go("/swipe")} icon={<RefreshCw />} label="Ir a modo foco (Swipe)" />
              <Item
                onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                icon={resolvedTheme === "dark" ? <Sun /> : <Moon />}
                label={`Cambiar a modo ${resolvedTheme === "dark" ? "claro" : "oscuro"}`}
              />
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function Item({
  icon,
  label,
  sub,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  shortcut?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center gap-3 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-fg-2 data-[selected=true]:bg-bg-2 data-[selected=true]:text-fg"
    >
      <span className="h-8 w-8 rounded-lg bg-bg-2 border border-[color:var(--border)] flex items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{label}</div>
        {sub && <div className="text-xs text-fg-4 truncate">{sub}</div>}
      </div>
      {shortcut && (
        <span className="flex items-center gap-1">
          {shortcut.split(" ").map((k, i) => (
            <Kbd key={i}>{k}</Kbd>
          ))}
        </span>
      )}
    </Command.Item>
  );
}
