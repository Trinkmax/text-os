// Demo seed data used by the onboarding "Entrar con datos de ejemplo" path
// and by the main demo toggle. Mimics three industries to make it feel real.

export type DemoIndustry = "barberia" | "inmobiliaria" | "ecommerce";

type DemoConversation = {
  contact_name: string;
  stage: string;
  channel: "whatsapp" | "instagram" | "messenger" | "email" | "webchat";
  tags: string[];
  avatar_seed?: string;
  messages: { body: string; direction: "in" | "out"; author?: "ai" | "human" | "contact"; minsAgo: number }[];
  suggestion?: { proposed: string; confidence: number; reason?: string };
  semaphore?: "green" | "amber" | "red";
  unread?: number;
};

const barberia: {
  orgName: string;
  tagline: string;
  neverPromise: string[];
  mustEscalate: string[];
  stages: { name: string; color: string }[];
  tags: { name: string; color: string }[];
  knowledge: { topic: string; question: string; answer: string; variants?: string[]; confidence: number }[];
  conversations: DemoConversation[];
} = {
  orgName: "Barbería Monaco",
  tagline: "Barbería premium en Palermo. Cortes, color, barba y cuidado facial.",
  neverPromise: ["Descuentos sin autorización", "Horarios fuera del calendario"],
  mustEscalate: ["Queja de servicio", "Cancelación de seña", "Pedido de factura A"],
  stages: [
    { name: "Nuevo lead", color: "#64748B" },
    { name: "Turno agendado", color: "#F59E0B" },
    { name: "Cliente", color: "#10B981" },
    { name: "Recurrente", color: "#8B5CF6" },
  ],
  tags: [
    { name: "Primera vez", color: "#F59E0B" },
    { name: "Corte", color: "#3B82F6" },
    { name: "Color", color: "#EC4899" },
    { name: "Barba", color: "#10B981" },
  ],
  knowledge: [
    {
      topic: "Horarios",
      question: "¿A qué hora abren?",
      answer: "Abrimos de lunes a sábados de 10:00 a 20:00. Domingos cerramos. Podés agendar directo desde acá ✂️",
      variants: ["qué horarios tienen", "están abiertos", "hasta qué hora"],
      confidence: 0.95,
    },
    {
      topic: "Precio de corte",
      question: "¿Cuánto sale el corte?",
      answer: "El corte de caballero está a $8.500. Con barba completa te va a salir $12.000. Agendamos?",
      variants: ["cuánto cuesta cortarme", "precio pelo", "cuánto sale"],
      confidence: 0.92,
    },
    {
      topic: "Turnos disponibles",
      question: "¿Hay turno hoy?",
      answer: "Sí, todavía tengo hueco a las 17:30 y 19:00 con Juan. ¿Cuál te viene bien?",
      variants: ["tenés turno", "hora libre", "disponibilidad"],
      confidence: 0.88,
    },
    {
      topic: "Barbero que atiende",
      question: "¿Puedo elegir el barbero?",
      answer: "Sí, elegí el que quieras: Juan (clásico), Matu (fades), o Nacho (color y barba). Decime y te lo reservo.",
      confidence: 0.9,
    },
    {
      topic: "Dirección",
      question: "¿Dónde están ubicados?",
      answer: "Estamos en Thames 1850, Palermo. A 3 cuadras del subte D (Plaza Italia).",
      confidence: 0.98,
    },
    {
      topic: "Formas de pago",
      question: "¿Aceptan tarjeta?",
      answer: "Aceptamos efectivo, Mercado Pago, transferencia y todas las tarjetas. Sin recargo 💳",
      confidence: 0.95,
    },
    {
      topic: "Niños",
      question: "¿Cortan nenes?",
      answer: "¡Sí! Corte infantil hasta 12 años a $5.500. Tenemos silla especial y paciencia para los más chiquitos 😊",
      confidence: 0.87,
    },
  ],
  conversations: [
    {
      contact_name: "Agustín Ramirez",
      stage: "Turno agendado",
      channel: "whatsapp",
      tags: ["Corte", "Barba"],
      semaphore: "amber",
      unread: 1,
      messages: [
        { body: "Hola, tengo turno el jueves. ¿Puedo moverlo para el viernes?", direction: "in", author: "contact", minsAgo: 8 },
      ],
      suggestion: {
        proposed:
          "¡Claro Agus! El viernes tengo 11:30 y 18:00 con Juan. ¿Cuál te cierra? Paso el turno del jueves al nuevo horario.",
        confidence: 0.82,
        reason: "Ya respondí 14 veces pedidos parecidos de cambio de turno.",
      },
    },
    {
      contact_name: "Lucía Fernandez",
      stage: "Nuevo lead",
      channel: "instagram",
      tags: ["Primera vez"],
      semaphore: "amber",
      unread: 2,
      messages: [
        { body: "Holaaa! Vi el corte que le hicieron a Juan Sánchez. Hacen lo mismo?", direction: "in", author: "contact", minsAgo: 24 },
        { body: "Mi pelo es ondulado, medio largo", direction: "in", author: "contact", minsAgo: 22 },
      ],
      suggestion: {
        proposed:
          "Hola Lu! Sí, ese corte lo hace Matu. Con pelo ondulado queda buenísimo. Dura unos 45 min, sale $9.500. Tenés preferencia de día?",
        confidence: 0.74,
        reason: "7 consultas anteriores por referencia a fotos de otros clientes.",
      },
    },
    {
      contact_name: "Tomás Di Marco",
      stage: "Cliente",
      channel: "whatsapp",
      tags: ["Corte"],
      semaphore: "red",
      unread: 1,
      messages: [
        {
          body: "Che, cuando vine la última vez Nacho me dio una crema para el cabello. Me podés pasar cuál era que la busqué y no me acuerdo?",
          direction: "in",
          author: "contact",
          minsAgo: 53,
        },
      ],
      suggestion: {
        proposed: "",
        confidence: 0.32,
        reason: "No tengo registro del producto que le recomendó Nacho. Humano necesario.",
      },
    },
    {
      contact_name: "Pato Milei",
      stage: "Recurrente",
      channel: "whatsapp",
      tags: ["Corte", "Barba"],
      semaphore: "green",
      unread: 0,
      messages: [
        { body: "Me confirman el turno de mañana?", direction: "in", author: "contact", minsAgo: 110 },
        {
          body: "Listo Pato, te esperamos mañana 17:30 con Juan. Si querés cancelar o mover, avisame con 2h de anticipación. Gracias!",
          direction: "out",
          author: "ai",
          minsAgo: 110,
        },
      ],
    },
    {
      contact_name: "Martín Blanco",
      stage: "Cliente",
      channel: "whatsapp",
      tags: ["Color"],
      semaphore: "amber",
      unread: 1,
      messages: [
        { body: "Cuánto me sale un color platino?", direction: "in", author: "contact", minsAgo: 190 },
      ],
      suggestion: {
        proposed: "Martín, el color platino sale entre $24.000 y $32.000 según el largo y si ya tenés base decolorada. Te paso turno con Nacho para evaluarlo en persona?",
        confidence: 0.71,
        reason: "Coincide con 3 respuestas previas sobre color platino.",
      },
    },
    {
      contact_name: "Ana Casas",
      stage: "Nuevo lead",
      channel: "webchat",
      tags: [],
      semaphore: "amber",
      unread: 1,
      messages: [
        { body: "Hola, hacen corte a señoras?", direction: "in", author: "contact", minsAgo: 300 },
      ],
      suggestion: {
        proposed:
          "Hola Ana! Sí, atendemos a todos. Cortes desde $9.500 según el largo. Preferís día de semana o sábado?",
        confidence: 0.8,
      },
    },
  ],
};

export const DEMO_DATA: Record<DemoIndustry, typeof barberia> = {
  barberia,
  inmobiliaria: {
    orgName: "Propiedades del Sur",
    tagline: "Inmobiliaria boutique especializada en alquileres y ventas en CABA.",
    neverPromise: ["Confirmación de alquiler sin garantía", "Precio final sin tasación"],
    mustEscalate: ["Firma de contrato", "Cancelación de seña", "Queja formal"],
    stages: [
      { name: "Nuevo lead", color: "#64748B" },
      { name: "Visita agendada", color: "#F59E0B" },
      { name: "Oferta", color: "#3B82F6" },
      { name: "Cerrado", color: "#10B981" },
    ],
    tags: [
      { name: "Alquiler", color: "#3B82F6" },
      { name: "Venta", color: "#10B981" },
      { name: "2 amb", color: "#F59E0B" },
      { name: "3 amb", color: "#EC4899" },
    ],
    knowledge: [
      {
        topic: "Requisitos de alquiler",
        question: "¿Qué garantía piden?",
        answer:
          "Aceptamos garantía propietaria de CABA (GBA con evaluación), seguro de caución (Afianzar/BBVA) o propietaria de familiar directo con recibos.",
        confidence: 0.92,
      },
      {
        topic: "Visita",
        question: "¿Cuándo puedo ver la propiedad?",
        answer:
          "Las visitas son de lunes a sábados, entre 10 y 18. Coordinamos según agenda del propietario. Decime el rango que te queda bien?",
        confidence: 0.88,
      },
      {
        topic: "Expensas",
        question: "¿Cuánto son las expensas?",
        answer: "Te paso el último mes exacto según la unidad. ¿De cuál propiedad me consultás?",
        confidence: 0.78,
      },
    ],
    conversations: [
      {
        contact_name: "Carolina Piñeiro",
        stage: "Visita agendada",
        channel: "whatsapp",
        tags: ["Alquiler", "2 amb"],
        semaphore: "amber",
        unread: 1,
        messages: [
          {
            body: "Hola! La visita del jueves la mantenemos? Se complicó mi horario.",
            direction: "in",
            author: "contact",
            minsAgo: 15,
          },
        ],
        suggestion: {
          proposed:
            "Hola Caro, tenemos lugar también el viernes 17:30 o sábado 11:00. ¿Cuál te queda mejor?",
          confidence: 0.8,
        },
      },
      {
        contact_name: "Fede Soria",
        stage: "Nuevo lead",
        channel: "instagram",
        tags: ["Venta"],
        semaphore: "red",
        unread: 1,
        messages: [
          {
            body: "Quiero saber si aceptan pago en stablecoins para la compra de un PH.",
            direction: "in",
            author: "contact",
            minsAgo: 40,
          },
        ],
        suggestion: { proposed: "", confidence: 0.25, reason: "Escenario no cubierto por el conocimiento actual." },
      },
    ],
  },
  ecommerce: {
    orgName: "Trama Store",
    tagline: "Tienda de indumentaria sustentable. Envíos a todo el país.",
    neverPromise: ["Garantía de talle sin probar", "Descuentos fuera de campaña"],
    mustEscalate: ["Reclamo de pago", "Cambio sin ticket", "Devolución fuera de plazo"],
    stages: [
      { name: "Nuevo lead", color: "#64748B" },
      { name: "Carrito abierto", color: "#F59E0B" },
      { name: "Compró", color: "#10B981" },
      { name: "Recurrente", color: "#8B5CF6" },
    ],
    tags: [
      { name: "Cambio", color: "#F59E0B" },
      { name: "Consulta talle", color: "#3B82F6" },
      { name: "Envío", color: "#10B981" },
    ],
    knowledge: [
      {
        topic: "Envíos",
        question: "¿Cuánto tarda el envío?",
        answer:
          "En CABA y GBA llega en 48-72h. Al interior 3-5 días hábiles vía Correo Argentino o Andreani según tu zona.",
        confidence: 0.95,
      },
      {
        topic: "Cambios",
        question: "¿Hacen cambios?",
        answer:
          "Tenés 15 días desde la recepción. La prenda tiene que estar sin uso y con etiqueta. Te enviamos nueva vez que confirmemos stock.",
        confidence: 0.9,
      },
    ],
    conversations: [
      {
        contact_name: "Jose Lunardi",
        stage: "Carrito abierto",
        channel: "whatsapp",
        tags: ["Consulta talle"],
        semaphore: "amber",
        unread: 1,
        messages: [
          { body: "Hola, la remera oversize sale talle único no?", direction: "in", author: "contact", minsAgo: 9 },
        ],
        suggestion: {
          proposed: "Hola Jose! Sí, la oversize es talle único y queda bien entre talle 38 y 46. ¿Querés que te guarde una?",
          confidence: 0.77,
        },
      },
    ],
  } as never,
};
