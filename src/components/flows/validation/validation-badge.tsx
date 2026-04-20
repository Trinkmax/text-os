"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useFlowStore } from "../state/use-flow-store";
import { useFlowValidation } from "./use-flow-validation";

export function ValidationBadge() {
  const [open, setOpen] = useState(false);
  const { errors, warnings } = useFlowValidation();
  const selectNode = useFlowStore((s) => s.selectNode);
  const selectEdge = useFlowStore((s) => s.selectEdge);

  const total = errors.length + warnings.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition-colors",
          errors.length > 0
            ? "bg-red/10 text-red-2 border-red/30 hover:bg-red/15"
            : warnings.length > 0
              ? "bg-amber/10 text-amber-2 border-amber/30 hover:bg-amber/15"
              : "bg-green/10 text-green-2 border-green/25 hover:bg-green/15",
        )}
        aria-expanded={open}
      >
        {errors.length > 0 ? (
          <AlertCircle className="h-3 w-3" />
        ) : warnings.length > 0 ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <CheckCircle2 className="h-3 w-3" />
        )}
        {total === 0 ? (
          <span>Sin errores</span>
        ) : (
          <span>
            {total} {total === 1 ? "aviso" : "avisos"}
          </span>
        )}
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1.5 left-0 w-80 max-h-[320px] overflow-y-auto rounded-xl border border-[color:var(--border)] bg-bg-1 shadow-[var(--shadow-hover)] z-50 p-1"
          >
            {errors.map((issue, i) => (
              <button
                key={`e-${i}`}
                type="button"
                onClick={() => {
                  if (issue.nodeId) selectNode(issue.nodeId);
                  else if (issue.edgeId) selectEdge(issue.edgeId);
                  setOpen(false);
                }}
                className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-bg-2 transition-colors text-left"
              >
                <AlertCircle className="h-3.5 w-3.5 text-red-2 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-fg-2 leading-snug">{issue.message}</span>
              </button>
            ))}
            {warnings.map((issue, i) => (
              <button
                key={`w-${i}`}
                type="button"
                onClick={() => {
                  if (issue.nodeId) selectNode(issue.nodeId);
                  else if (issue.edgeId) selectEdge(issue.edgeId);
                  setOpen(false);
                }}
                className="w-full flex items-start gap-2 p-2 rounded-lg hover:bg-bg-2 transition-colors text-left"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-2 flex-shrink-0 mt-0.5" />
                <span className="text-xs text-fg-2 leading-snug">{issue.message}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
