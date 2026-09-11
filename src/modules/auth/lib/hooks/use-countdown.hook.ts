"use client";

import { useEffect, useState } from "react";

/** Whole seconds left until `deadlineMs`; 0 when it has passed or is unset. */
export function useCountdown(deadlineMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadlineMs <= Date.now()) return;

    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadlineMs) window.clearInterval(id);
    }, 250);

    return () => window.clearInterval(id);
  }, [deadlineMs]);

  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}
