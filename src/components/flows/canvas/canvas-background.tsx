"use client";

// Fondo del canvas: grid finito con gradiente radial + glow sutil del brand.
// Se coloca dentro de ReactFlow como fondo absoluto, antes del grid oficial.

export function CanvasBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `
          radial-gradient(ellipse at center, rgba(139, 92, 246, 0.06) 0%, transparent 70%),
          radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.03) 0%, transparent 50%),
          radial-gradient(ellipse at bottom right, rgba(245, 158, 11, 0.03) 0%, transparent 50%)
        `,
      }}
    />
  );
}
