import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelative(ts: string | Date | null | undefined) {
  if (!ts) return "";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 45) return "ahora";
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d`;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function formatTime(ts: string | Date | null | undefined) {
  if (!ts) return "";
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || "")
    .join("");
}

export function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

const AVATAR_GRADIENTS = [
  ["#8B5CF6", "#EC4899"],
  ["#10B981", "#3B82F6"],
  ["#F59E0B", "#EF4444"],
  ["#06B6D4", "#8B5CF6"],
  ["#F472B6", "#F59E0B"],
  ["#22C55E", "#14B8A6"],
  ["#818CF8", "#A78BFA"],
  ["#EF4444", "#F97316"],
];

export function avatarGradient(seed: string) {
  const [a, b] = AVATAR_GRADIENTS[hash(seed) % AVATAR_GRADIENTS.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}

export function money(n: number | null | undefined) {
  return (n || 0).toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}
