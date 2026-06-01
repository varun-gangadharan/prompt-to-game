"use client";

import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only settles to the latest value
 * after `delayMs` has elapsed without further changes. Used to throttle live
 * GameCanvas updates while a field is being edited.
 */
export function useDebouncedSpec<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
