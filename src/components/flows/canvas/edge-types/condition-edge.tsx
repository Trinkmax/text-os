"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

// Edge "condition": dashed y con label visible por default.
export function ConditionEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, label } =
    props;

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: selected ? "var(--brand-2)" : "var(--accent-amber)",
          strokeWidth: 1.75,
          strokeDasharray: "6 4",
          opacity: 0.8,
        }}
      />
      {(label ?? "condición") && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute px-2 py-0.5 text-[10px] font-medium rounded-full border bg-bg-1 text-amber-2 border-amber/30"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
          >
            {label ?? "condición"}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
