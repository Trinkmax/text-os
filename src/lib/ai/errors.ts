// Traducción de errores crudos de proveedores → mensajes humanos.
// El objetivo es que el `reason` de la sugerencia y los toasts de UI
// nunca le tiren al usuario el dump técnico del provider; eso queda en
// el campo `error` de la traza para debugging.

export type FriendlyError = {
  /** Lo que el dueño del negocio lee. */
  message: string;
  /** Acción sugerida ("Andá a Ajustes → IA"). Opcional. */
  cta?: { label: string; href: string };
  /** Texto técnico, resumido, para el details expandible. */
  details: string;
};

const PATTERNS: Array<{
  test: RegExp;
  build: (raw: string) => Omit<FriendlyError, "details">;
}> = [
  {
    test: /401|invalid[_\s]?api[_\s]?key|authentication/i,
    build: () => ({
      message: "Tu clave parece vencida o inválida. Renovala desde Ajustes.",
      cta: { label: "Ir a Ajustes", href: "/ajustes" },
    }),
  },
  {
    test: /403|permission|not[_\s]?allowed/i,
    build: () => ({
      message: "El proveedor rechazó la conexión por permisos. Revisá tu cuenta.",
    }),
  },
  {
    test: /429|rate[_\s]?limit|too many requests/i,
    build: () => ({
      message: "Te pasaste del límite del proveedor. Reintentamos en un minuto o cambiá de modelo.",
    }),
  },
  {
    test: /quota|insufficient[_\s]?quota|billing/i,
    build: () => ({
      message: "Cuota agotada en el proveedor. Recargá saldo o probá otro modelo.",
      cta: { label: "Cambiar modelo", href: "/ajustes" },
    }),
  },
  {
    test: /timeout|timed out|ETIMEDOUT|aborted/i,
    build: () => ({
      message: "El modelo no contestó a tiempo. Reintentamos solos en un minuto.",
    }),
  },
  {
    test: /model.*(not found|does not exist|unavailable)/i,
    build: () => ({
      message: "Ese modelo no está disponible en tu cuenta. Elegí otro desde Ajustes.",
      cta: { label: "Cambiar modelo", href: "/ajustes" },
    }),
  },
  {
    test: /5\d\d|server error|service unavailable/i,
    build: () => ({
      message: "El proveedor tuvo un problema. Reintentamos en un momento.",
    }),
  },
];

export function humanizeProviderError(err: unknown): FriendlyError {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const details = raw.slice(0, 400);
  for (const p of PATTERNS) {
    if (p.test.test(raw)) {
      return { ...p.build(raw), details };
    }
  }
  return {
    message: "El modelo no respondió bien esta vez. Reintentamos solos.",
    details,
  };
}

/** Mensaje a poner en `suggestion.reason` cuando todo falló pero queremos
 *  que el operador igual vea la tarjeta en rojo en vez de que desaparezca. */
export function reasonFromError(err: unknown): string {
  const f = humanizeProviderError(err);
  return f.message;
}
