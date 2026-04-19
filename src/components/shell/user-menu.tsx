"use client";

import { useTransition } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "@/components/ui/avatar";
import { signOutAction } from "@/app/actions/auth";

export function UserMenu({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [pending, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Menú de usuario"
          className="rounded-full focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <GradientAvatar name={userName} className="h-8 w-8" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-fg-3" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm truncate">{userName}</span>
            {userEmail && <span className="text-[11px] text-fg-4 truncate">{userEmail}</span>}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            start(async () => {
              await signOutAction();
            });
          }}
        >
          <LogOut className="h-4 w-4" />
          {pending ? "Cerrando…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
