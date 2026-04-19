"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined") return () => {};
    const mql = window.matchMedia(query);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  };
}

function getSnapshot(query: string) {
  return () => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  };
}

function getServerSnapshot() {
  return false;
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(subscribe(query), getSnapshot(query), getServerSnapshot);
}

/** True when viewport is narrower than Tailwind's md breakpoint (768px). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** True when viewport is narrower than Tailwind's lg breakpoint (1024px). */
export function useIsTablet(): boolean {
  return useMediaQuery("(max-width: 1023px)");
}

/** True when the primary pointer is coarse (touch). */
export function useIsTouch(): boolean {
  return useMediaQuery("(pointer: coarse)");
}
