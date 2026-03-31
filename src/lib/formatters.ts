/**
 * Shared formatting utilities for display
 */

import { COUNTDOWN_FORMAT } from "./constants";

/**
 * Format milliseconds as countdown timer with color indicator
 * Returns { text, color } for display
 */
export function formatCountdown(
  remainingMs: number
): { text: string; color: "red" | "amber" | "green" } {
  if (remainingMs < 0) {
    return { text: "EXPIRED", color: "red" };
  }

  if (remainingMs < COUNTDOWN_FORMAT.CRITICAL_THRESHOLD_MS) {
    return { text: formatMs(remainingMs), color: "red" };
  }

  if (remainingMs < COUNTDOWN_FORMAT.WARNING_THRESHOLD_MS) {
    return { text: formatMs(remainingMs), color: "amber" };
  }

  return { text: formatMs(remainingMs), color: "green" };
}

/**
 * Format milliseconds to readable format (Xm Ys / Xs)
 */
export function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format number as percentage (0..1 range)
 */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Format number as percentage with decimal (0..1 range)
 */
export function formatPercent01(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format error rate as percentage
 */
export function formatErrorRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format latency in milliseconds
 */
export function formatLatency(ms: number): string {
  return `${Math.round(ms)}ms`;
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(value: number): string {
  return value.toLocaleString();
}

/**
 * Format timestamp as readable date/time
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Format timestamp as ISO string
 */
export function formatIsoTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Format duration between two timestamps
 */
export function formatDuration(startMs: number, endMs: number): string {
  const durationMs = endMs - startMs;
  return formatMs(durationMs);
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format status as badge text
 */
export function formatStatus(status: "pending" | "pass" | "fail"): string {
  const map = {
    pending: "⏳ Pending",
    pass: "✓ Pass",
    fail: "✗ Fail",
  };
  return map[status];
}

/**
 * Format circuit state as readable text
 */
export function formatCircuitState(state: "CLOSED" | "OPEN" | "HALF_OPEN"): string {
  const map = {
    CLOSED: "🟢 Closed",
    OPEN: "🔴 Open",
    HALF_OPEN: "🟡 Half-Open",
  };
  return map[state];
}
