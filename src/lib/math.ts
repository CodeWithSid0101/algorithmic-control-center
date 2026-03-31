/**
 * Shared mathematical utilities for simulations
 */

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Round to 2 decimal places
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Add Gaussian-like noise (via averaging uniform samples)
 * Uses box-muller approximation with 4 samples
 */
export function addGaussianNoise(base: number, amplitude: number): number {
  // Average 4 uniform samples for Gaussian-like distribution
  const r = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
  return base + (r - 0.5) * amplitude;
}

/**
 * Pick a random element from an array
 */
export function randomItem<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error("Cannot pick from empty array");
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Softmax pick - probabilistically select from actions based on values
 * Uses softmax to convert raw Q-values to probabilities
 */
export function softmaxPick<T extends Record<string, number>>(
  actions: T,
  keys: (keyof T)[]
): keyof T {
  const values = keys.map((k) => actions[k]);
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const r = Math.random() * sum;
  
  let acc = 0;
  for (let i = 0; i < keys.length; i += 1) {
    acc += exps[i];
    if (r <= acc) return keys[i];
  }
  return keys[keys.length - 1];
}

/**
 * Weighted random selection based on weights
 */
export function weightedPick<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item;
  }
  
  return items[items.length - 1];
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Detect anomalies using z-score (standard deviations from mean)
 */
export function detectAnomalies(values: number[], threshold: number = 2.0): boolean[] {
  if (values.length < 2) return values.map(() => false);
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = standardDeviation(values);
  
  if (stdDev === 0) return values.map(() => false);
  
  return values.map((val) => {
    const zScore = Math.abs((val - mean) / stdDev);
    return zScore > threshold;
  });
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Exponential moving average
 */
export function ema(currentValue: number, previousEma: number, alpha: number): number {
  return alpha * currentValue + (1 - alpha) * previousEma;
}
