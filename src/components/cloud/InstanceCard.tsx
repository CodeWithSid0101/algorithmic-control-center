"use client";

import { UnifiedInstance } from "@/types/cloud";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Cpu,
  HardDrive,
  Network,
  Clock,
  Zap,
  Activity,
} from "lucide-react";

type InstanceCardProps = {
  instance: UnifiedInstance;
};

/**
 * Component to display a single cloud compute instance with live metrics
 */
export function InstanceCard({ instance }: InstanceCardProps) {
  const isRunning = instance.state === "running";
  const isAWS = instance.provider === "aws";

  // Get provider-specific styling
  const providerColor = isAWS
    ? "from-orange-500 to-orange-600"
    : "from-blue-500 to-blue-600";
  const providerBadgeColor = isAWS ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800";

  // Get state-specific styling
  const stateColor =
    instance.state === "running"
      ? "bg-green-100 text-green-800"
      : instance.state === "stopped" || instance.state === "deallocated"
        ? "bg-red-100 text-red-800"
        : "bg-gray-100 text-gray-800";

  const stateLabel =
    instance.state === "deallocated" ? "deallocated" : instance.state;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header with provider and status indicator */}
      <div className={`bg-gradient-to-r ${providerColor} p-4 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg truncate">{instance.name}</h3>
            <p className="text-sm text-opacity-90 opacity-90">{instance.id}</p>
          </div>
          {/* Glowing status indicator */}
          <div className="flex flex-col items-end gap-2">
            {isRunning && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
                <span className="text-sm font-medium">Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Status and Instance Type */}
        <div className="flex gap-2 flex-wrap">
          <Badge className={stateColor}>{stateLabel}</Badge>
          <Badge className={providerBadgeColor}>
            {instance.provider.toUpperCase()}
          </Badge>
          <Badge variant="neutral">{instance.instanceType}</Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Region */}
          <div className="flex items-start gap-2">
            <Cloud className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-600">Region</p>
              <p className="font-medium truncate">{instance.region}</p>
            </div>
          </div>

          {/* CPU Usage */}
          {instance.cpuUsage !== null && (
            <div className="flex items-start gap-2">
              <Cpu className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-600">CPU</p>
                <p className="font-medium">
                  {instance.cpuUsage.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Memory Usage */}
          {instance.memoryUsage !== null && (
            <div className="flex items-start gap-2">
              <HardDrive className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-600">Memory</p>
                <p className="font-medium">
                  {instance.memoryUsage.toFixed(1)}%
                </p>
              </div>
            </div>
          )}

          {/* Network In */}
          {instance.networkBytesIn !== null && (
            <div className="flex items-start gap-2">
              <Network className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-600">Net In</p>
                <p className="font-medium">
                  {(instance.networkBytesIn / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}

          {/* Network Out */}
          {instance.networkBytesOut !== null && (
            <div className="flex items-start gap-2">
              <Activity className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-gray-600">Net Out</p>
                <p className="font-medium">
                  {(instance.networkBytesOut / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          )}

          {/* Launch Time */}
          <div className="flex items-start gap-2 col-span-2">
            <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-gray-600">Launched</p>
              <p className="font-medium text-xs">
                {new Date(instance.launchTime).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="pt-2 border-t flex items-center gap-2 text-xs text-gray-500">
          <Zap className="w-3 h-3" />
          <span>Updated {new Date(instance.lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>
    </Card>
  );
}
