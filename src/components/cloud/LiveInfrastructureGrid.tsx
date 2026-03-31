"use client";

import { useComputeInstances } from "./useComputeInstances";
import { InstanceCard } from "./InstanceCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AlertCircle, RefreshCw, Cloud, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface LiveInfrastructureGridProps {
  pollInterval?: number;
  providers?: ("aws" | "azure")[];
}

/**
 * Live Infrastructure Grid - displays real-time compute instances from AWS and Azure
 * with automatic polling every 15 seconds and visual connection indicators
 */
export function LiveInfrastructureGrid({
  pollInterval = 15000,
  providers = ["aws", "azure"],
}: LiveInfrastructureGridProps) {
  const {
    data,
    allInstances,
    awsInstances,
    azureInstances,
    isLoading,
    isHealthy,
    lastUpdated,
    error,
    refetch,
  } = useComputeInstances({ pollInterval, providers });

  if (error && allInstances.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Unable to Fetch Cloud Data</h3>
              <p className="text-sm text-red-800 mt-1">{error}</p>
              <p className="text-xs text-red-700 mt-2">
                Check your environment variables for AWS and Azure credentials.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header with Status and Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Cloud className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Live Infrastructure</h2>
              {isHealthy && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-800">
                    All Systems Active
                  </span>
                </div>
              )}
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {/* Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Total Instances */}
            <Card className="p-4">
              <div className="text-sm text-gray-600">Total Instances</div>
              <div className="text-2xl font-bold">{allInstances.length}</div>
            </Card>

            {/* AWS Status */}
            {providers.includes("aws") && (
              <Card
                className={`p-4 ${
                  data?.aws?.connected
                    ? "border-orange-200 bg-orange-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">AWS</div>
                    <div className="text-lg font-semibold">
                      {awsInstances.length}
                    </div>
                  </div>
                  <div>
                    {data?.aws?.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Azure Status */}
            {providers.includes("azure") && (
              <Card
                className={`p-4 ${
                  data?.azure?.connected
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Azure</div>
                    <div className="text-lg font-semibold">
                      {azureInstances.length}
                    </div>
                  </div>
                  <div>
                    {data?.azure?.connected ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* Last Updated */}
            <Card className="p-4">
              <div className="text-sm text-gray-600">Last Updated</div>
              <div className="text-sm font-semibold">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Auto-refresh: {(pollInterval / 1000).toFixed(0)}s
              </div>
            </Card>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && allInstances.length === 0 && (
          <Card className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
            <p className="text-gray-600">Fetching cloud infrastructure...</p>
          </Card>
        )}

        {/* Instances Grid */}
        {allInstances.length > 0 && (
          <div className="space-y-6">
            {/* AWS Instances Section */}
            {awsInstances.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">
                    AWS EC2
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {data?.aws?.runningCount ?? 0} running,{" "}
                    {data?.aws?.stoppedCount ?? 0} stopped
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {awsInstances.map((instance) => (
                    <InstanceCard
                      key={instance.id}
                      instance={instance}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Azure Instances Section */}
            {azureInstances.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">
                    Azure VMs
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {data?.azure?.runningCount ?? 0} running,{" "}
                    {data?.azure?.stoppedCount ?? 0} stopped
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {azureInstances.map((instance) => (
                    <InstanceCard
                      key={instance.id}
                      instance={instance}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && allInstances.length === 0 && !error && (
          <Card className="p-8 text-center">
            <Cloud className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              No Instances Found
            </h3>
            <p className="text-gray-600">
              No running or stopped instances detected in your cloud accounts.
            </p>
          </Card>
        )}
      </div>
    </ErrorBoundary>
  );
}
