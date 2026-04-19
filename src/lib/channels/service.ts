// Supabase server client para los webhooks. Corren sin cookies (los llama un
// proveedor externo), así que usamos el service role si está disponible para
// bypassear RLS, o caemos al anon key (las políticas actuales son permisivas).

import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";

export function createSbService() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey || anonKey,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      // Con service role no se refrescan sesiones de usuario.
      ...(serviceKey ? { auth: { persistSession: false } } : {}),
    },
  );
}
