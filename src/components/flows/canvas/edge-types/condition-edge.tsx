"use client";

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";

// Edge "condition": dashed amber con halo suave y label tipo pill.
export function ConditionEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
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

  const stroke = selected ? "var(--brand-2)" : "var(--accent-amber)";

  return (
    <>
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeOpacity={selected ? 0.3 : 0.16}
        strokeWidth={selected ? 7 : 5}
        strokeLinecap="round"
        pointerEvents="none"
      />
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke,
          strokeWidth: selected ? 2.25 : 1.75,
          strokeDasharray: "6 4",
          strokeLinecap: "round",
          opacity: selected ? 1 : 0.85,
          transition: "stroke 180ms ease, stroke-width 180ms ease",
        }}
      />
      {(label ?? "condición") && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan absolute px-2 py-0.5 text-[10px] font-medium rounded-full border bg-bg-1/95 text-amber-2 border-amber/30 backdrop-blur-md shadow-sm"
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
