"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

// Edge "default": curva bezier con halo suave debajo y stroke redondeado.
// El halo aporta peso visual y feedback claro en hover/selected sin saturar.
export function DefaultEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
    label,
  } = props;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.4,
  });

  const highlighted = (data as { highlighted?: boolean } | undefined)?.highlighted;
  const active = selected || highlighted;

  return (
    <>
      {/* Halo suave detrás del path principal — más visible al estar activo. */}
      <path
        d={path}
        fill="none"
        stroke={selected ? "var(--brand-2)" : highlighted ? "var(--brand)" : "var(--brand-2)"}
        strokeOpacity={selected ? 0.32 : highlighted ? 0.28 : 0.1}
        strokeWidth={active ? 8 : 5}
        strokeLinecap="round"
        pointerEvents="none"
      />

      {/* Path principal */}
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: selected
            ? "var(--brand-2)"
            : highlighted
              ? "var(--brand)"
              : "rgba(167, 139, 250, 0.72)",
          strokeWidth: active ? 2.25 : 1.75,
          strokeLinecap: "round",
          strokeDasharray: highlighted ? "8 4" : undefined,
          ...(highlighted
            ? ({ animation: "flow-dash-march 1s linear infinite" } as React.CSSProperties)
            : {}),
          transition: "stroke 180ms ease, stroke-width 180ms ease",
        }}
      />

      {/* Label opcional (rama de condition u override). */}
      {label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan pointer-events-none absolute px-2 py-0.5 text-[10px] font-medium rounded-full border backdrop-blur-md shadow-sm",
              selected
                ? "bg-brand text-white border-brand-2"
                : "bg-bg-1/95 text-fg-3 border-[color:var(--border)]",
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
