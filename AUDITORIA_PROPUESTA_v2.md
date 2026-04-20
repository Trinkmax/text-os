# Auditoría TextOS — Sistema actual vs. Propuesta v2 (StudiOS)

**Fecha:** 2026-04-19
**Alcance:** análisis del repo `text-os` (branch `main`) contra `TextOS Propuesta v2.docx`.
**Objetivo:** decidir qué de la propuesta se implementa, qué se descarta, y con qué prioridad.

---

## TL;DR

1. **La propuesta v2 es, en espíritu, correcta.** Identifica bien los agujeros del documento original (alucinación prometida, proveedor único, swipe-up peligroso, cero observabilidad, cero cumplimiento, ICP vago) y los ataca con criterio.
2. **Pero la propuesta describe un producto que todavía no existe.** El repo actual es un **cascarón UI + ingesta multi-canal** muy bien construido, sin nada de IA real conectada. No hay LLM, no hay embeddings, no hay pipeline de scoring — los `confidence` y `semaphore` se están sirviendo de datos mockeados.
3. **Hay una discrepancia de marca:** el repo es `TextOS` (prefijo `textos_*` en 16 tablas, dominio `textos.app` en el código). La propuesta lo renombra a `StudiOS`. Decidir YA antes de salir a vender, porque cambiar el namespace en DB después es doloroso.
4. **Recomendación:** adoptar ~70% de la propuesta con modificaciones, descartar ~15%, diferir ~15%. Detalle abajo.

---

## 1. Radiografía del sistema actual

### 1.1 Stack real

| Capa | Lo que hay | Nota |
|---|---|---|
| Framework | Next.js **16.2.4**, React **19.2.4**, App Router | Alineado con plataforma Vercel actual |
| UI | Tailwind v4 + Radix primitives + motion + sonner + Geist | Sólido, ya pulido |
| DB | Supabase (Postgres + Auth + Realtime) | Vía `@supabase/ssr` |
| Auth | Supabase Auth con cookies SSR | Funcional |
| Canales | Meta Graph API (WhatsApp/IG/Messenger), Resend (email), widget webchat propio | **Nivel producción** |
| Seguridad webhook | HMAC SHA-256 con `timingSafeEqual` + verify_token por canal | Hecho bien |
| Idempotencia | Unique index `(conversation_id, external_id)` + manejo de `23505` | Correcto |
| Envío saliente | Retry exponencial (3 intentos, backoff 200ms·2^n), `delivery_status` tracking | Correcto |
| Realtime | `supabase_realtime` en 4 tablas, suscripción en swipe-inbox | Funcional |
| Multi-tenant | `textos_org_members` con roles `admin/agent/readonly`, cookie `textos_org_id` con verificación | Correcto |
| RLS | Enabled, **policies permisivas** para anon/auth (TODO marcado en el SQL) | **Agujero real en prod** |

### 1.2 Lo que ya está en la DB (16 tablas)

```
orgs, org_members, channels, stages, tag_catalog, contacts, conversations,
messages, suggestions, knowledge_cards, scope_gaps, flows, campaigns,
alerts, autosend_feedback, quick_replies, notes
```

El schema está pensando en el producto correcto (tiene `suggestions` con `confidence`/`semaphore`/`reason`, `scope_gaps` para curaduría, `autosend_feedback` para el pulgar abajo). Pero…

### 1.3 Lo que **NO** existe en código (importante)

| Área | Estado |
|---|---|
| Integración con cualquier LLM (OpenAI, Anthropic, Gemini, etc.) | **0 imports.** Grep vuelve vacío. |
| Pipeline de extracción de intención / entidades | No existe |
| Embeddings / pgvector / RAG | La extensión no está ni instalada |
| Motor de scoring (los 5 sub-scores de la propuesta) | No existe. El `confidence` se inserta a mano (seed/demo) |
| Memoria episódica por contacto (Capa 3 de la propuesta) | No existe |
| Validación cruzada / detección de conflictos | No existe |
| Reglas aprendidas con estados `propuesta → candidata → activa` | El schema no lo modela; hoy se convierte directo |
| Observabilidad LLM (Langfuse/Helicone), métricas de calibración | No hay |
| Cumplimiento Ley 25.326 (consentimiento, opt-out, registro, export/delete) | **No implementado.** Bloqueo real para vender. |
| Canary / rollback / panic button | No hay |

> **Conclusión brutal:** la UI dice "Modo pareja IA" y "La IA está respondiendo sola 🟢". Hoy **eso es teatro**. El producto no tiene IA, tiene la UI que la expondría cuando exista.

### 1.4 Lo que está mejor de lo que la propuesta asume

La propuesta habla del stack como si arrancara de cero. **No es así.** Lo que ya está hecho y es valioso:

- **Multi-tenancy real** con memberships y roles, no sólo `org_id` suelto.
- **Webhook de Meta listo para producción** — firma, dedup, parser WhatsApp+IG+Messenger, respuesta rápida con `after()` para no hacer esperar a Meta.
- **Envío saliente con retry + `delivery_status` + `delivery_error`** — muy superior a lo que describe la propuesta.
- **UX de swipe funcional**: gestos táctiles + atajos de teclado + undo 8s + Realtime push + modo foco + pareja Tex (mascota) con copys por estado.
- **Onboarding guiado** ya existe (`/onboarding`, `TexOnboarding`).

La propuesta subestima cuánto se ganó ya.

---

## 2. ¿La propuesta es "correcta"?

**Sí, con reservas.** Los 7 diagnósticos del punto 2.2 son los correctos. Las correcciones que propone son el ~80% del camino. Desgloso por sección.

### 2.1 Lo que es claramente acertado (implementar tal cual)

| Propuesta | Por qué sí |
|---|---|
| **Abandonar "cero alucinación"** y prometer minimización + auditoría | Es la única promesa honesta con el estado del arte 2026 |
| **Capa abstracta sobre LLM** (Claude/GPT/Gemini intercambiables) | Riesgo de precio + capacidad es real. Un mes sin esto y quedás atado |
| **Swipe-up NO crea regla permanente** — ahora va a pool de candidatas con revisión semanal | Mejora de criterio. El comportamiento actual (convertir gap a card con 1 click en `convertScopeGap`) ya es demasiado ligero |
| **Cumplimiento Ley 25.326 desde el día 1** | No es opcional. Hoy el sistema guarda datos personales sin consentimiento registrado. Es responsabilidad civil directa |
| **Score multifactorial** (grounding + coherencia + regla + ausencia de conflicto + certeza) | Un score de un solo número es ruidoso. Separar sub-scores permite debugging y calibración |
| **Calibración dinámica de umbrales** | El default actual 0.85/0.55 es una hipótesis sin evidencia |
| **Pipeline de 7 pasos con latencias objetivo** | Obliga a pensar SLOs desde el inicio; hoy no hay ninguno |
| **Observabilidad LLM (Langfuse) + canary 5% + rollback automático** | Sin esto no se puede mejorar el producto con datos, sólo con intuición |
| **ICP estrecho** (clínicas estética/odonto/kinesio primero, Córdoba/Rosario/Mendoza antes que CABA) | Segmentación correcta. Menos competencia, ticket mayor, proceso repetitivo |
| **Separar "reglas candidatas" de "activas" con ≥5 aplicaciones exitosas** | Previene que una aprobación apurada un viernes se vuelva política |
| **Panic button** (desactiva autopilot por tenant) | Barato de implementar, salvavidas crítico si algo se rompe |

### 2.2 Lo que es correcto pero no para **ahora**

| Propuesta | Difiere a |
|---|---|
| **App móvil React Native (Expo)** | Fase 2 OK, pero hoy el web responsive ya cubre swipe. No duplicar codebase antes de tener 50 tenants |
| **BSP externo (Gupshup/Twilio)** | Ya integraste **Meta directo**. Volver atrás a un BSP es un downgrade. Sólo usar BSP si bloquea alta de cuentas nuevas, no como default |
| **Fine-tuning por vertical con datos anonimizados** | Fase 4. Caro, difícil de evaluar, y hasta tener 200+ tenants no hay volumen que justifique el esfuerzo. Usar prompts + RAG primero |
| **Marketplace de integraciones de partners** | Fase 4+. No es un moat hasta ya tener escala |
| **Expansión a MX/CO en mes 18** | Depende del dato real de adopción, no del plan |

### 2.3 Lo que está **mal** en la propuesta

1. **Railway / Fly.io / Render como infra de arranque.** Estás ya en Vercel con la integración nativa a Supabase y con uso de `after()` (Fluid Compute). Cambiar eso es un retroceso. **Quedarse en Vercel + Supabase hasta que algo específico lo justifique.**
2. **React Native con Expo "desde fase 2".** El swipe actual ya es responsive y performante en móvil web. Agregar RN hoy duplica el costo de mantenimiento por una ganancia marginal (PWA + notificaciones web alcanzan). Diferir a fase 3+.
3. **"BSP reduce fricción de alta; se migra después".** Revés exacto: **el onboarding actual asume Meta directo y ya funciona**. Migrar *desde* BSP *a* Meta directo después es el camino caro. El equipo ya hizo el trabajo duro; no tirarlo.
4. **text-embedding-3-small como default para castellano.** Para castellano rioplatense conviene benchmarquear contra `bge-m3` self-hosted o el modelo de `voyage-3`. No cerrarse a OpenAI embeddings sin medir.
5. **Proyección conservadora: USD 19k MRR al mes 18 con 280 tenants.** El CAC implícito (USD 60) sólo se sostiene si el content-led growth en TikTok/IG funciona sin comprar tráfico; en LATAM ese canal se satura rápido. El plan necesita un segundo canal probado antes del mes 6, no después.
6. **"Los costos variables de WhatsApp se pasan al cliente al costo + 10%".** Legalmente OK, pero **operativamente horrible** para el cliente PyME: facturas variables generan churn. Mejor: incluir un bucket generoso en cada tier y cobrar `overage` sólo cuando se pasa >20%.
7. **"Autopilot sólo en saludos, FAQs básicas y confirmaciones" (fase 1).** Demasiado tímido. Con el schema actual se puede hacer autopilot para **agendamiento simple** desde el día 1 si el conocimiento del negocio está cargado. Limitar el alcance desmotiva al cliente beta.
8. **Ausencia total de AI Gateway / ruteo de modelos.** Con Vercel AI Gateway (GA desde ago/25) ya tenés failover entre proveedores, observabilidad y zero-data-retention en 1 línea. La propuesta insiste en una "capa abstracta" casera cuando la plataforma ya la ofrece.

### 2.4 Lo que la propuesta **omite** y deberías agregar

1. **Plan de migración del esquema actual.** La propuesta describe 5 capas de memoria, pero el repo ya tiene 16 tablas con datos (o al menos seeds). No hay una sección de "cómo pasamos de lo que hay a lo que se propone" sin romper. **Agregar un plan de migración explícito.**
2. **Decisión de marca TextOS vs. StudiOS.** La propuesta cambia el nombre sin justificarlo. El código, el dominio (`textos.app` en `send.ts`), los prefijos SQL (`textos_*`) y el branding (`Tex` mascota) están en TextOS. Cambiar ahora implica: migración de schema, cambio de dominio, rebrand de Tex. **Costo real, no cosmético.**
3. **Política de retención de datos por tipo.** La propuesta menciona "borrado automático configurable" pero no da números. Propuesta mínima: audio/imágenes transcriptas 30d, mensajes 365d, ficha del cliente mientras dure el contrato + 2 años post-churn.
4. **Estrategia de eval.** Mencionan Promptfoo + Giskard pero sin definir **qué se evalúa**. Mínimo: golden set de 50 conversaciones reales anonimizadas por vertical, re-run en cada cambio de prompt.
5. **Qué pasa cuando Meta suspende un número.** Ocurre. Hay que tener detección, notificación al cliente, y un flujo de re-alta. Ni lo mencionan.
6. **Consentimiento explícito para el cliente final** (no el PyME). La propuesta lo nombra pero no describe el flujo: ¿primer mensaje automático dice "hola, estás hablando con asistente"? ¿cómo se registra el opt-in/opt-out? Esto tiene que ser código, no política.

---

## 3. ¿Qué haría y qué no? — Plan de 12 semanas

Partiendo de la realidad del repo, no de un greenfield.

### Semanas 1–2 — Tapar agujeros legales y de seguridad
- [ ] **Cerrar RLS**: reemplazar las policies permisivas por policies basadas en `textos_org_members.user_id = auth.uid()`. Hoy cualquier user autenticado ve cualquier org. Es una bomba.
- [ ] **Flujo de consentimiento Ley 25.326**: primer mensaje saliente automático con aviso + opt-out de un tap; tabla `textos_consents` con timestamp y base legal.
- [ ] **Endpoints de derechos ARCO** (acceso/rectificación/cancelación/oposición): ruta `/api/contacts/:id/export` y `/api/contacts/:id/purge` con verificación de identidad.
- [ ] **Política de privacidad versionada** + aceptación guardada al onboarding del PyME.
- [ ] **Decisión de marca** (TextOS vs. StudiOS) — comprometida antes de cualquier rebrand.

### Semanas 3–5 — Conectar la primera IA real (autopilot conservador)
- [ ] Instalar `@ai-sdk/*` v6 con Vercel AI Gateway como proveedor.
- [ ] Habilitar extensión `pgvector` en Supabase + tabla `textos_knowledge_embeddings` (FK a `knowledge_cards`).
- [ ] Job de embedding incremental al guardar/editar cards.
- [ ] Pipeline `ingestInboundMessage` → extraer entidades (modelo chico) → recuperar top-k cards (pgvector) → score con 5 sub-scores → insertar en `textos_suggestions` con `confidence` y `semaphore` reales.
- [ ] Prompt del generativo con guardrails explícitos ("nunca inventar precios/horarios/políticas que no estén en el contexto").
- [ ] Logging a **Langfuse** desde el día 1, no después.

### Semanas 6–7 — Reglas con estados + revisión semanal
- [ ] Migrar `knowledge_cards` para agregar `state: proposed|candidate|active`, `success_count`, `modification_count`.
- [ ] Cambiar `convertScopeGap` y el swipe-up: ahora van a `proposed`. Pasan a `candidate` con 5 aplicaciones sin modificar, a `active` con confirmación manual.
- [ ] Vista `/revision-semanal` con batch de candidatas + métricas de la semana + muestreo aleatorio de autosends.

### Semanas 8–9 — Observabilidad y safety
- [ ] Panic button por tenant (`textos_orgs.autopilot_enabled boolean`).
- [ ] Canary: cada cambio de prompt se despliega primero a 5% del tráfico (split por `org_id % 20 == 0` o similar).
- [ ] Medir calibración: comparar `confidence` declarado vs. tasa de aprobación sin modificación. Alerta si desalineación >5pp.
- [ ] Dashboard interno (no del cliente) con: tasa de autopilot, falsos positivos, costo por conversación, latencia p50/p95.

### Semanas 10–12 — Enderezar la propuesta comercial
- [ ] Redefinir planes con **bucket generoso de conversaciones incluidas** (no pass-through), overage sólo >120%.
- [ ] Primer vertical empaquetado: plantillas y reglas pre-cargadas para clínicas de estética.
- [ ] Landing con waitlist + seña USD 10 (propuesta sección 19 — eso sí, tal cual).
- [ ] 15 entrevistas del ICP, en orden, grabadas.

---

## 4. Matriz de decisión

| Ítem de la propuesta | Decisión | Prioridad |
|---|---|---|
| Renombrar StudiOS | Discutir, **no ejecutar sin acuerdo** | Alta |
| 5 capas de memoria | **Sí**, pero mapeadas sobre las 16 tablas existentes, no desde cero | Alta |
| Pipeline 7 pasos con SLOs | **Sí** | Alta |
| 5 sub-scores | **Sí** (cambia semana 3–5) | Alta |
| Capa abstracta de LLM | **Sí, vía Vercel AI Gateway**, no casera | Alta |
| Ley 25.326 completa | **Sí, bloqueante** | Crítica |
| Swipe-up → regla candidata | **Sí** | Alta |
| Revisión semanal | **Sí** | Alta |
| Canary + rollback | **Sí** | Alta |
| Panic button | **Sí** | Alta |
| Langfuse | **Sí** | Alta |
| ICP clínicas estética/odonto | **Sí** | Alta |
| App RN/Expo | **No en fase 1-2**, PWA alcanza | Baja |
| BSP (Gupshup/Twilio) | **No**, Meta directo ya funciona | — |
| Railway/Fly/Render | **No**, Vercel + Supabase se queda | — |
| Pass-through + 10% WhatsApp | **No**, bucket + overage | Media |
| Fine-tuning por vertical | Fase 4 | Baja |
| RN app + Instagram DM + webchat v2 | Ya existe mejor; **no rehacer** | — |
| Pre-venta seña USD 10 | **Sí** | Media |
| Plan de migración schema (omitido) | **Agregar** | Alta |
| Flujo consentimiento cliente final (omitido) | **Agregar** | Crítica |
| Golden set de eval (omitido) | **Agregar** | Media |

---

## 5. Riesgos que la propuesta no dimensiona

1. **RLS abierto en producción.** Mientras las policies sigan `using (true) with check (true)`, cualquier usuario autenticado puede leer datos de cualquier org si el código tiene un bug de aislamiento. Es el #1 que arreglar.
2. **Meta puede deshabilitar el template o la cuenta.** No hay plan de contingencia; hoy un ban de WhatsApp deja al cliente sin canal sin tener siquiera cómo notificarle.
3. **Cambio de nombre con 16 tablas prefijadas `textos_*`.** No es `sed -i`; es una migración con datos en vuelo si ya hay tenants.
4. **El `confidence` hoy es un número inventado.** Cualquier roadmap se apoya en que ese número sea real; hasta semana 3-5 no lo es.
5. **No hay suite de tests.** Ni de server actions ni de los parsers de Meta. Eso es aceptable hoy pero se vuelve caro cada vez que toquemos el pipeline de ingesta.

---

## 6. Conclusión

La propuesta v2 **es buena como hoja de ruta conceptual** — especialmente en diagnóstico, seguridad, compliance, y separación de reglas candidatas vs. activas. Debe adoptarse **con 3 enmiendas**:

1. **Respetar lo que ya está construido** (Meta directo, Vercel, multi-tenant real) — no regresionar.
2. **Priorizar lo bloqueante** antes que lo aspiracional: RLS + Ley 25.326 + primera IA real > app mobile + fine-tuning + marketplace.
3. **Usar la plataforma en vez de reinventar**: Vercel AI Gateway, Supabase pgvector, Langfuse OSS — no capas caseras que duplican lo que ya existe mantenido por terceros.

Si se ejecutan las 12 semanas de arriba, al final de junio/julio 2026 el sistema pasa de "UI linda sin IA" a "IA con guardrails, cumplimiento legal y observabilidad" — listo para los primeros 10 tenants pagando que la propuesta pide para la fase 1.

La propuesta es correcta. El repo está más adelantado y mejor arquitecturado de lo que la propuesta asume. La oportunidad es combinar ambas.
