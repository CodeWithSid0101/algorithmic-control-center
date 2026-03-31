"use client";

import * as React from "react";

interface LoadingStateProps {
  isLoading: boolean;
  error?: Error | null;
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: (error: Error) => React.ReactNode;
}

/**
 * LoadingState component for handling async data states
 * Displays loading state, error state, or children based on async operation status
 */
export function LoadingState({
  isLoading,
  error,
  children,
  loadingFallback,
  errorFallback,
}: LoadingStateProps) {
  if (isLoading) {
    return (
      loadingFallback || (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (error) {
    return (
      errorFallback?.(error) || (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h3 className="mb-2 text-base font-semibold text-red-400">Error loading data</h3>
          <p className="text-sm text-red-300/80">{error.message}</p>
        </div>
      )
    );
  }

  return <>{children}</>;
}

/**
 * Skeleton loader for content placeholders
 */
export function SkeletonLoader({
  count = 1,
  height = "h-4",
  width = "w-full",
  className = "",
}: {
  count?: number;
  height?: string;
  width?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} ${width} animate-pulse rounded bg-zinc-800/50`}
        />
      ))}
    </div>
  );
}

/**
 * Table skeleton loader
 */
export function TableSkeletonLoader({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-4 w-full animate-pulse rounded bg-zinc-800/50" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={`row-${rowIdx}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={`cell-${rowIdx}-${colIdx}`}
              className="h-4 w-full animate-pulse rounded bg-zinc-800/50"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton loader
 */
export function CardSkeletonLoader({
  hasHeader = true,
  hasContent = true,
  contentLines = 3,
}: {
  hasHeader?: boolean;
  hasContent?: boolean;
  contentLines?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      {hasHeader && <div className="mb-6 h-6 w-1/3 animate-pulse rounded bg-zinc-800/50" />}
      {hasContent && (
        <div className="space-y-3">
          {Array.from({ length: contentLines }).map((_, i) => (
            <div
              key={i}
              className={`h-4 animate-pulse rounded bg-zinc-800/50 ${i === contentLines - 1 ? "w-2/3" : "w-full"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
