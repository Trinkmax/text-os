"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Ctx = { isOpen: boolean; open: () => void; close: () => void; toggle: () => void };
const CommandCtx = createContext<Ctx | null>(null);

export function CommandProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return <CommandCtx.Provider value={{ isOpen, open, close, toggle }}>{children}</CommandCtx.Provider>;
}

export function useCommand() {
  const ctx = useContext(CommandCtx);
  if (!ctx) throw new Error("useCommand outside provider");
  return ctx;
}
