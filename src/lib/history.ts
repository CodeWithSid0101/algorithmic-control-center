/**
 * Array history and data structure utilities
 */

/**
 * Maintain a circular history buffer by keeping only last N items
 */
export function maintainHistory<T>(items: T[], newItem: T, maxSize: number): T[] {
  const updated = [...items, newItem];
  return updated.slice(-maxSize);
}

/**
 * Add multiple items to history, maintaining max size
 */
export function maintainHistoryMultiple<T>(items: T[], newItems: T[], maxSize: number): T[] {
  const updated = [...items, ...newItems];
  return updated.slice(-maxSize);
}

/**
 * Create a shallow copy of map with updated key
 */
export function updateMap<K extends string | number, V>(map: Record<K, V>, key: K, value: V): Record<K, V> {
  return { ...map, [key]: value };
}

/**
 * Create a shallow copy of map with multiple updates
 */
export function updateMapMultiple<K extends string | number, V>(
  map: Record<K, V>,
  updates: Partial<Record<K, V>>
): Record<K, V> {
  return { ...map, ...updates };
}

/**
 * Create a shallow copy of array with item at index replaced
 */
export function updateArray<T>(items: T[], index: number, item: T): T[] {
  const updated = [...items];
  updated[index] = item;
  return updated;
}

/**
 * Filter and map array in one pass
 */
export function filterMap<T, U>(items: T[], predicate: (item: T) => U | null): U[] {
  return items.reduce((acc, item) => {
    const mapped = predicate(item);
    if (mapped !== null) acc.push(mapped);
    return acc;
  }, [] as U[]);
}

/**
 * Group array items by key
 */
export function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<K, T[]>
  );
}

/**
 * Calculate sum of numeric values
 */
export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/**
 * Calculate average of numeric values
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Find min and max in array
 */
export function minMax(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 0 };
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/**
 * Normalize values to 0..1 range
 */
export function normalize(values: number[]): number[] {
  const { min, max } = minMax(values);
  const range = max - min;
  
  if (range === 0) {
    return values.map(() => 0.5);
  }
  
  return values.map((v) => (v - min) / range);
}
