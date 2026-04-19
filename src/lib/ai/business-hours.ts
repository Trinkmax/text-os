// Business hours: el formato en `textos_orgs.business_hours` que ya soporta
// el resto del producto es:
//   { mon: "10-20", tue: "10-20", wed: "closed", ..., sun: "closed" }
// o vacío {} → no hay restricción y el horario no se considera.
//
// Devolvemos `degrade=true` cuando el mensaje cae fuera de horario, lo que
// el pipeline usa para bajar de verde a amber (excepto si es un saludo).

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export type Hours = Partial<Record<(typeof DAY_KEYS)[number], string | "closed">>;

export type BusinessHoursResult = {
  configured: boolean;
  isOpen: boolean;
  /** Texto humano para el reason si degradamos. */
  label: string;
};

export function evaluateBusinessHours(
  hours: unknown,
  timezone: string,
  now: Date = new Date(),
): BusinessHoursResult {
  const h = (hours ?? {}) as Hours;
  if (!h || Object.keys(h).length === 0) {
    return { configured: false, isOpen: true, label: "" };
  }

  // Calcular hora local en la TZ de la org.
  const local = inTimezone(now, timezone);
  const day = DAY_KEYS[local.getDay()];
  const slot = h[day];
  if (!slot || slot === "closed") {
    return { configured: true, isOpen: false, label: "fuera de horario" };
  }

  const range = parseRange(slot);
  if (!range) return { configured: true, isOpen: true, label: "" };

  const minutes = local.getHours() * 60 + local.getMinutes();
  const isOpen = minutes >= range.from && minutes <= range.to;
  return {
    configured: true,
    isOpen,
    label: isOpen ? "" : "fuera de horario",
  };
}

function parseRange(s: string): { from: number; to: number } | null {
  // Acepta "10-20", "10:30-19:30", "9 a 18".
  const m = s.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(?:-|a|al)\s*(\d{1,2})(?::(\d{2}))?\s*$/i);
  if (!m) return null;
  const fromH = parseInt(m[1], 10);
  const fromM = m[2] ? parseInt(m[2], 10) : 0;
  const toH = parseInt(m[3], 10);
  const toM = m[4] ? parseInt(m[4], 10) : 0;
  return { from: fromH * 60 + fromM, to: toH * 60 + toM };
}

function inTimezone(d: Date, tz: string): Date {
  // Trick estándar: formateamos en la TZ deseada y reparseamos como local.
  // Se pierde TZ-awareness (es lo que queremos: hora "como la ve el operador").
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => fmt.find((p) => p.type === t)?.value || "00";
    const iso = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
    return new Date(iso);
  } catch {
    return d; // tz inválida → caemos a UTC; mejor fallar en abierto.
  }
}
