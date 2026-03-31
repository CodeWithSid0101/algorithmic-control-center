"use client";

import * as React from "react";

/**
 * Base hook for time-based simulations
 * Handles interval management, state updates, and cleanup automatically
 *
 * @param interval - Update interval in milliseconds
 * @param tickFn - Function called on each tick, receives previous state and returns next state
 * @param initialState - Initial state value
 * @returns Current state value
 *
 * @example
 * const [nodes, setNodes] = useState(initialNodes);
 * useTimedSimulation(1000, () => {
 *   setNodes(prev => updateNodeTelemetry(prev));
 * });
 */
export function useTimedSimulation<T>(
  interval: number,
  tickFn: (prev: T) => T,
  initialState: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = React.useState(initialState);

  React.useEffect(() => {
    const intervalId = window.setInterval(() => {
      setState((prev) => tickFn(prev));
    }, interval);

    return () => window.clearInterval(intervalId);
  }, [interval, tickFn]);

  return [state, setState];
}

/**
 * Hook for async operations with loading and error states
 *
 * @param asyncFn - Async function to call
 * @param dependencies - Dependencies array (like useEffect)
 * @returns Object with { data, loading, error }
 *
 * @example
 * const { data, loading, error } = useAsync(async () => {
 *   return fetch('/api/data').then(r => r.json());
 * }, []);
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: React.DependencyList = []
): { data: T | null; loading: boolean; error: Error | null } {
  const [state, setState] = React.useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    let isMounted = true;

    setState({ data: null, loading: true, error: null });

    asyncFn()
      .then((data) => {
        if (isMounted) {
          setState({ data, loading: false, error: null });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({ data: null, loading: false, error });
        }
      });

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return state;
}

/**
 * Hook for previous value tracking
 * Useful for detecting changes between renders
 *
 * @param value - Value to track
 * @returns Previous value (or undefined on first render)
 *
 * @example
 * const prevCount = usePrevious(count);
 * if (prevCount !== count) {
 *   console.log('Count changed from', prevCount, 'to', count);
 * }
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for debounced values
 *
 * @param value - Value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 *
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for tracking mounted state
 * Useful for preventing state updates after unmount
 *
 * @returns Boolean indicating if component is mounted
 *
 * @example
 * const isMounted = useIsMounted();
 * useEffect(() => {
 *   setTimeout(() => {
 *     if (isMounted()) setState(newValue);
 *   }, 1000);
 * }, []);
 */
export function useIsMounted(): () => boolean {
  const ref = React.useRef(false);

  React.useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);

  return React.useCallback(() => ref.current, []);
}
