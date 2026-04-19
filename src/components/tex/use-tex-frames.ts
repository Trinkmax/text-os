"use client";

import { useEffect, useState } from "react";

/**
 * Drives the 3-frame talking animation.
 * While `isTyping` is true, alternates frame 1 (idle smile) and 3 (mouth open) every ~150ms.
 * While idle (paused between messages), occasionally shows frame 2 (blink) for ~140ms.
 */
export function useTexFrames(isTyping: boolean, reduced = false) {
  const [frame, setFrame] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (reduced) {
      setFrame(1);
      return;
    }

    if (isTyping) {
      const iv = setInterval(() => {
        setFrame((f) => (f === 3 ? 1 : 3));
      }, 150);
      return () => clearInterval(iv);
    }

    // Idle blink loop — check every ~250ms, blink ~8% of ticks.
    setFrame(1);
    const iv = setInterval(() => {
      if (Math.random() < 0.08) {
        setFrame(2);
        setTimeout(() => setFrame(1), 140);
      }
    }, 250);
    return () => clearInterval(iv);
  }, [isTyping, reduced]);

  return frame;
}
