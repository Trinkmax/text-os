"use client";

import { Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useCommand } from "@/components/shell/command-context";
import { SemaphoreCounter } from "@/components/shell/semaphore-badge";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/shell/user-menu";

export function AppHeader({
  orgId,
  orgName: _orgName,
  userName,
  userEmail,
  initialCounts,
}: {
  orgId: string;
  orgName: string;
  userName: string;
  userEmail: string;
  initialCounts: { green: number; amber: number; red: number };
}) {
  const { open } = useCommand();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="glass sticky top-0 z-30 h-14 border-b border-[color:var(--border)] hidden md:flex items-center gap-3 px-5">
      <button
        onClick={open}
        className="flex items-center gap-2 h-9 px-3 rounded-xl bg-bg-1 border border-[color:var(--border)] text-sm text-fg-3 hover:text-fg hover:border-[color:var(--border-strong)] transition-all flex-1 max-w-md"
      >
        <Search className="h-4 w-4" />
        <span>Buscar contactos, conversaciones, comandos…</span>
        <span className="ml-auto flex items-center gap-1">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="flex-1" />
      <SemaphoreCounter initial={initialCounts} orgId={orgId} />
      {mounted && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-xl"
          aria-label="Cambiar tema"
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      )}
      <UserMenu userName={userName} userEmail={userEmail} />
    </header>
  );
}
