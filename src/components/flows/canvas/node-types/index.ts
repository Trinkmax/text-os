// Mapeo de type → componente para que ReactFlow sepa qué pintar.
// Todos los tipos comparten BaseNodeComponent — las diferencias son de datos
// (config), no de layout, así que no hace falta especializar.

import { BaseNodeComponent } from "./base-node";
import type { NodeType } from "../../types/flow";

export const NODE_COMPONENTS: Record<NodeType, typeof BaseNodeComponent> = {
  start: BaseNodeComponent,
  saludo: BaseNodeComponent,
  calif: BaseNodeComponent,
  faq: BaseNodeComponent,
  datos: BaseNodeComponent,
  agendar: BaseNodeComponent,
  pagar: BaseNodeComponent,
  derivar: BaseNodeComponent,
  cerrar: BaseNodeComponent,
  condition: BaseNodeComponent,
};
