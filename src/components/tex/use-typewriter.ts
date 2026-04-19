"use client";

import { useEffect, useRef, useState } from "react";

export interface UseTypewriterOptions {
  text: string;
  charIntervalMs?: number;
  startDelayMs?: number;
  enabled?: boolean;
  onDone?: () => void;
}

export function useTypewriter({
  text,
  charIntervalMs = 28,
  startDelayMs = 120,
  enabled = true,
  onDone,
}: UseTypewriterOptions) {
  const [shown, setShown] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      setIsTyping(false);
      return;
    }
    setShown("");
    setIsTyping(false);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let i = 0;
    timeoutId = setTimeout(() => {
      setIsTyping(true);
      intervalId = setInterval(() => {
        i += 1;
        if (i >= text.length) {
          setShown(text);
          if (intervalId) clearInterval(intervalId);
          setIsTyping(false);
          doneRef.current?.();
          return;
        }
        setShown(text.slice(0, i));
      }, charIntervalMs);
    }, startDelayMs);
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, charIntervalMs, startDelayMs, enabled]);

  return { text: shown, isTyping, done: shown === text && text.length > 0 };
}
