"use client";

import * as React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, retry: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  hasError: boolean;
}

/**
 * ErrorBoundary component for catching and displaying errors
 * Works with React 18+ including async errors
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ error: null, hasError: false });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        this.props.fallback?.(this.state.error, this.handleRetry) || (
          <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
            <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
              <h2 className="mb-2 text-lg font-semibold text-red-400">Something went wrong</h2>
              <p className="mb-4 text-sm text-red-300/80">{this.state.error.message}</p>
              <button
                onClick={this.handleRetry}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Async error boundary that catches promise rejections
 * Wraps children with error handling for async operations
 */
export function AsyncErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError?: (error: Error) => void;
}) {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      onError?.(event.error);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      onError?.(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [onError]);

  return <>{children}</>;
}
