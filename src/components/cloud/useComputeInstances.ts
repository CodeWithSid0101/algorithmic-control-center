import { useEffect, useState, useCallback } from "react";
import type { ComputeInfrastructureStatus, UnifiedInstance } from "@/types/cloud";

export interface UseComputeInstancesOptions {
  pollInterval?: number; // in milliseconds, default 15000 (15 seconds)
  providers?: ("aws" | "azure")[];
}

export interface UseComputeInstancesReturn {
  data: ComputeInfrastructureStatus | null;
  allInstances: UnifiedInstance[];
  awsInstances: UnifiedInstance[];
  azureInstances: UnifiedInstance[];
  isLoading: boolean;
  isHealthy: boolean;
  lastUpdated: Date | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and poll live AWS and Azure compute instances
 * Automatically calls both /api/cloud/aws/status and /api/cloud/azure/status
 */
export function useComputeInstances(
  options: UseComputeInstancesOptions = {}
): UseComputeInstancesReturn {
  const { pollInterval = 15000, providers = ["aws", "azure"] } = options;

  const [data, setData] = useState<ComputeInfrastructureStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const responses: Partial<ComputeInfrastructureStatus> = {
        generatedAt: new Date().toISOString(),
        isHealthy: true,
      };

      // Fetch AWS instances if provider is enabled
      if (providers.includes("aws")) {
        try {
          const awsResponse = await fetch("/api/cloud/aws/status", {
            cache: "no-store",
          });
          if (awsResponse.ok) {
            const awsData = await awsResponse.json();
            responses.aws = awsData.aws;
          }
        } catch (err) {
          console.error("[Hook] AWS fetch error:", err);
          // Continue even if AWS fails
        }
      }

      // Fetch Azure instances if provider is enabled
      if (providers.includes("azure")) {
        try {
          const azureResponse = await fetch("/api/cloud/azure/status", {
            cache: "no-store",
          });
          if (azureResponse.ok) {
            const azureData = await azureResponse.json();
            responses.azure = azureData.azure;
          }
        } catch (err) {
          console.error("[Hook] Azure fetch error:", err);
          // Continue even if Azure fails
        }
      }

      // Determine overall health
      const hasHealthyProvider =
        (responses.aws?.connected || responses.azure?.connected) ?? false;
      if (responses) {
        responses.isHealthy = hasHealthyProvider;
      }

      setData((responses as ComputeInfrastructureStatus) || null);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error fetching instances";
      setError(message);
      console.error("[Hook] Error fetching compute instances:", err);
    } finally {
      setIsLoading(false);
    }
  }, [providers]);

  // Initial fetch
  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // Polling
  useEffect(() => {
    const interval = setInterval(fetchInstances, pollInterval);
    return () => clearInterval(interval);
  }, [fetchInstances, pollInterval]);

  const allInstances = [
    ...(data?.aws?.instances ?? []),
    ...(data?.azure?.instances ?? []),
  ];

  const awsInstances = data?.aws?.instances ?? [];
  const azureInstances = data?.azure?.instances ?? [];

  const isHealthy = data?.isHealthy ?? false;

  return {
    data,
    allInstances,
    awsInstances,
    azureInstances,
    isLoading,
    isHealthy,
    lastUpdated,
    error,
    refetch: fetchInstances,
  };
}
