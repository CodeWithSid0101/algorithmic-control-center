"use client";

import * as React from "react";

import { useWrrSimulation } from "@/components/traffic/useWrrSimulation";
import { useCircuitBreakerSimulation } from "@/components/traffic/useCircuitBreakerSimulation";
import { CircuitBreaker } from "@/components/traffic/CircuitBreaker";
import { WrrTable } from "@/components/traffic/WrrTable";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Shield } from "lucide-react";

export default function TrafficManagementPage() {
  const { nodes, selectedNodeId, distribution, avgErrorRate } = useWrrSimulation();
  const circuit = useCircuitBreakerSimulation(avgErrorRate);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Traffic Router (Weighted Round Robin + Automatic Failover)
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Real-time mock telemetry drives WRR selection. Circuit Breaker flips
            between CLOSED / OPEN / HALF-OPEN with Framer Motion.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">
            <span className="inline-flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5 text-cyan-200" />
              Avg Error: <span className="font-semibold">{(avgErrorRate * 100).toFixed(2)}%</span>
            </span>
          </Badge>
          <Badge variant="neutral">
            <span className="inline-flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-emerald-200" />
              Zero-Downtime: <span className="font-semibold">99.999%</span>
            </span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_420px]">
        <div className="min-w-0">
          <WrrTable nodes={nodes} selectedNodeId={selectedNodeId} distribution={distribution} />

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>WRR Interpretation</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400 leading-relaxed">
                The router computes a blended Weight Score from latency, capacity, and
                error rate. Smooth Weighted Round Robin then chooses the next
                endpoint to maintain stable distribution under fluctuating
                telemetry.
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interoperability Signal</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-zinc-400 leading-relaxed">
                Each node is treated as an abstract service target. The routing
                policy is agnostic across AWS/Azure/GCP/On-Prem, simulating
                vendor-neutral traffic orchestration.
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="min-w-0">
          <CircuitBreaker
            state={circuit.state}
            readiness={circuit.readiness}
            phaseProgress={circuit.phaseProgress}
            eventLog={circuit.eventLog}
          />
        </div>
      </div>
    </div>
  );
}

