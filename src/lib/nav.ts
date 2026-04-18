import {
  Home,
  Layers,
  MessagesSquare,
  Users,
  BrainCircuit,
  Workflow,
  Megaphone,
  Bell,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  description?: string;
};

export const NAV: NavItem[] = [
  { href: "/inicio", label: "Inicio", icon: Home, shortcut: "g h", description: "Semáforo del día" },
  {
    href: "/swipe",
    label: "Bandeja Swipe",
    icon: Layers,
    shortcut: "g s",
    description: "Decidí de un gesto",
  },
  {
    href: "/conversaciones",
    label: "Conversaciones",
    icon: MessagesSquare,
    shortcut: "g c",
    description: "Vista clásica",
  },
  { href: "/contactos", label: "Contactos", icon: Users, shortcut: "g u" },
  { href: "/conocimiento", label: "Conocimiento", icon: BrainCircuit, shortcut: "g k" },
  { href: "/flujos", label: "Flujos", icon: Workflow, shortcut: "g f" },
  { href: "/campanas", label: "Campañas", icon: Megaphone, shortcut: "g b" },
  { href: "/alertas", label: "Alertas", icon: Bell, shortcut: "g a" },
  { href: "/reportes", label: "Reportes", icon: BarChart3, shortcut: "g r" },
  { href: "/ajustes", label: "Ajustes", icon: Settings, shortcut: "g x" },
];
