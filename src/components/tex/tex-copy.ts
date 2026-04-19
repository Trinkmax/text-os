export const TEX_COPY = {
  support: {
    hi: "¿Te pierdo en algo? Estoy acá. 👀",
    palette: "Tip: apretá ⌘K para saltar a cualquier lugar.",
    firstTime: "¿Primera vez por acá? Te muestro lo esencial.",
    dismiss: "Listo, me voy a un costado. Si me necesitás, estoy abajo a la derecha.",
  },
  goals: {
    levelUp: "¡Lo lograste! +1 nivel 🏆",
    highCoverage: "Cobertura arriba del 80%. Tu IA ya es tu mejor empleada.",
    firstWhatsapp: "Primera venta por WhatsApp. Check-point desbloqueado.",
    lowCoverage: "Recién arrancamos. Cada respuesta me hace más inteligente.",
  },
  analytics: {
    peek: "Mirá estos datos 📊. Tus clientes preguntan horarios hasta tarde.",
    mondaysPeak: "Los lunes son pico. Quizás conviene auto-responder más fuerte ahí.",
    funnelDrop: "Tu funnel pierde gente en 'agendar'. ¿Te armo una tarjeta?",
    weekendsSolo: "Tu IA volvió sola de fin de semana. 📊",
    noData: "Todavía no hay datos. Respondé 10 consultas y me pongo a trabajar.",
    roomToGrow: "Tenés margen para crecer. Te marco los temas que no manejo todavía.",
  },
  empty: {
    swipeZero: "Bandeja en cero. Todo bajo control 🟢.",
    noMemory: "Todavía no aprendí nada. Respondé tu primera consulta y empezamos.",
    noContacts: "Acá van a aparecer tus contactos. Importá uno o esperá el primer mensaje.",
    noCampaigns: "Sin campañas todavía. La primera siempre es la más divertida.",
    noFlows: "Los flujos son como un tablero de Arkanoid. Armá el primero y te muestro.",
    noAlerts: "Yo te aviso. Vos respirás.",
    noReports: "Todavía no hay datos para reportar. Dale unos días.",
  },
  onboarding: {
    hi: "Hola, soy Tex 👋",
    mission: "Voy a armar tu CRM en dos minutos.",
    reassure: "Vamos paso por paso. Podés volver cuando quieras.",
    lets_go: "Listo. Entramos?",
    coverage: "Haciendo cálculos… esto es lo que puedo resolver sin vos.",
    done: "Todo listo. Tu IA ya está trabajando.",
  },
  errors: {
    generic: "Algo no salió. Probá de nuevo — no se perdió nada.",
    fieldEmpty: "Ese campo quedó vacío. Dame una mano y lo completo.",
  },
  tips: {
    swipeRight: "Tip: en la Bandeja Swipe, → es enviar. Rápido como Tinder.",
    focusMode: "Modo foco oculta todo menos la bandeja. Apretá F.",
    aiThreshold: "Con más confianza mínima, yo respondo menos pero me equivoco casi nada.",
    knowledge: "Cada tarjeta que agregás me sube la cobertura.",
  },
  alerts: {
    header: "Yo te aviso cuando algo se salga del guion.",
  },
  dashboard: {
    mornings: (pct: number, name: string) =>
      pct >= 80
        ? `${name}, tu IA manejó el ${pct}% sola. Sos un crack.`
        : pct >= 40
          ? `${name}, andamos bien. Cubrimos el ${pct}% hoy.`
          : `${name}, con más tarjetas subimos la cobertura rápido.`,
  },
} as const;

export type TexCopy = typeof TEX_COPY;
