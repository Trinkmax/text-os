"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NAV } from "@/lib/nav";

export function NavShortcuts() {
  const router = useRouter();
  useEffect(() => {
    let gWaiting: number | null = null;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "g" && !gWaiting) {
        gWaiting = window.setTimeout(() => (gWaiting = null), 1200);
        return;
      }
      if (gWaiting) {
        const match = NAV.find((n) => n.shortcut === `g ${e.key.toLowerCase()}`);
        if (match) {
          e.preventDefault();
          router.push(match.href);
        }
        window.clearTimeout(gWaiting);
        gWaiting = null;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
  return null;
}
