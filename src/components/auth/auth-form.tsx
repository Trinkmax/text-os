"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInAction, signUpAction } from "@/app/actions/auth";

type Mode = "signin" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pendingEmail = searchParams.get("pending");
  const redirect = searchParams.get("redirect") || "/";

  async function onSubmit(formData: FormData) {
    setError(null);
    formData.set("redirect", redirect);
    startTransition(async () => {
      const action = mode === "signin" ? signInAction : signUpAction;
      const res = await action(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (mode === "signup" && res.redirect?.includes("pending")) {
        toast.success("Revisá tu email para confirmar la cuenta.");
      }
      router.push(res.redirect ?? "/");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-bg-1 p-6 shadow-sm">
      <h1 className="text-lg font-semibold mb-1">
        {mode === "signin" ? "Iniciá sesión" : "Creá tu cuenta"}
      </h1>
      <p className="text-sm text-fg-3 mb-5">
        {mode === "signin"
          ? "Entrá a tu espacio de trabajo."
          : "Vas a poder crear tu primera organización en 30 segundos."}
      </p>

      {pendingEmail && mode === "signin" && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Te enviamos un email a <b>{pendingEmail}</b> para confirmar la cuenta.
        </div>
      )}

      <form action={onSubmit} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs text-fg-3">Email</span>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="vos@empresa.com"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-fg-3">Contraseña</span>
          <Input
            type="password"
            name="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? "Procesando…"
            : mode === "signin"
              ? "Entrar"
              : "Crear cuenta"}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-fg-3">
        {mode === "signin" ? (
          <>
            ¿No tenés cuenta?{" "}
            <Link href="/signup" className="text-fg hover:underline">
              Registrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="text-fg hover:underline">
              Iniciá sesión
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
