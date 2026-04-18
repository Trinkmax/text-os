"use client";

import { createContext, useContext, useState } from "react";

type Ctx = { focus: boolean; setFocus: (v: boolean) => void };
const FocusCtx = createContext<Ctx | null>(null);

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [focus, setFocus] = useState(false);
  return <FocusCtx.Provider value={{ focus, setFocus }}>{children}</FocusCtx.Provider>;
}

export function useFocus() {
  const ctx = useContext(FocusCtx);
  if (!ctx) throw new Error("useFocus outside provider");
  return ctx;
}
