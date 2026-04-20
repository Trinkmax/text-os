"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";

export function DefaultEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } =
    props;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3,
  });

  const highlighted = (data as { highlighted?: boolean } | undefined)?.highlighted;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: selected
            ? "var(--brand-2)"
            : highlighted
              ? "var(--brand)"
              : "rgba(167, 139, 250, 0.45)",
          strokeWidth: selected || highlighted ? 2.25 : 1.5,
          strokeDasharray: highlighted ? "8 4" : undefined,
          ...(highlighted
            ? ({ animation: "flow-dash-march 1s linear infinite" } as React.CSSProperties)
            : {}),
        }}
      />
      {/* Label si existe (rama de condition u overrides) */}
      {props.label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan pointer-events-none absolute px-2 py-0.5 text-[10px] font-medium rounded-full border",
              selected
                ? "bg-brand text-white border-brand-2"
                : "bg-bg-1 text-fg-3 border-[color:var(--border)]",
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {props.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
