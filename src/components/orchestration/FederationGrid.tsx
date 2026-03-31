"use client";

import * as React from "react";

import type { CloudEnv, FederationCluster, FederationService } from "./useOrchestrationSimulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const envOrder: CloudEnv[] = ["AWS", "Azure", "GCP", "On-Prem"];

export function FederationGrid({
  clusters,
  services,
}: {
  clusters: FederationCluster[];
  services: FederationService[];
}) {
  const totalCapacity = clusters.reduce((sum, c) => sum + c.capacity, 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kubernetes Federation: Proportional Replication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-3 text-xs">
          {clusters.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-3"
            >
              <div className="text-zinc-300">{c.id}</div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Capacity: {c.capacity.toFixed(0)} vCPU ·{" "}
                Util: {(c.utilization * 100).toFixed(0)}%
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400/70 to-emerald-400/70"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(0, (c.capacity / totalCapacity) * 100)
                    ).toFixed(0)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 text-xs">
          {services.map((svc) => {
            const totalReplicas = Object.values(svc.replicasByCluster).reduce(
              (sum, v) => sum + v,
              0
            );
            return (
              <div
                key={svc.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-zinc-200">
                    {svc.name}
                    <span className="ml-2 text-[11px] text-zinc-500">
                      ({totalReplicas} replicas)
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex h-4 overflow-hidden rounded-full bg-white/5 text-[10px]">
                  {envOrder.map((env) => {
                    const r = svc.replicasByCluster[env] ?? 0;
                    const pct =
                      totalReplicas === 0 ? 0 : (r / totalReplicas) * 100;
                    if (pct <= 0) return null;
                    const bg =
                      env === "AWS"
                        ? "bg-cyan-400/80"
                        : env === "Azure"
                          ? "bg-violet-400/80"
                          : env === "GCP"
                            ? "bg-emerald-400/80"
                            : "bg-amber-400/80";
                    return (
                      <div
                        key={env}
                        className={`${bg} flex items-center justify-center border-r border-black/30`}
                        style={{ width: `${pct}%` }}
                      >
                        {pct > 15 ? `${env} (${r})` : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

