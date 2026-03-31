"use client";

import * as React from "react";
import { Cpu, ShieldAlert, Zap } from "lucide-react";

import type { CloudNode } from "./useWrrSimulation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WrrTable({
  nodes,
  selectedNodeId,
  distribution,
}: {
  nodes: CloudNode[];
  selectedNodeId: string;
  distribution: Record<CloudNode["region"], number>;
}) {
  const regionOrder: CloudNode["region"][] = ["US", "EU", "APAC", "LOCAL"];

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Weighted Round Robin (WRR) Real-Time Routing</CardTitle>
          <div className="mt-2 text-sm text-zinc-400">
            Traffic manager selects next target using smooth weighted WRR based on simulated telemetry.
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/3 px-3 py-2">
          <Zap className="h-4 w-4 text-cyan-200" />
          <div className="text-xs text-zinc-400">
            Selected:&nbsp;
            <span className="font-semibold text-zinc-100">
              {nodes.find((n) => n.id === selectedNodeId)?.name ?? "—"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cloud Node</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Available Capacity</TableHead>
              <TableHead>Error Rate</TableHead>
              <TableHead>Weight Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nodes.map((n) => {
              const weightPct = Math.round(n.weightScore * 100);
              const rowActive = n.id === selectedNodeId;
              const weightColor =
                n.weightScore >= 0.74
                  ? "from-emerald-400/80 to-cyan-400/70"
                  : n.weightScore >= 0.5
                    ? "from-cyan-400/70 to-violet-400/60"
                    : "from-amber-300/60 to-red-400/50";

              return (
                <TableRow
                  key={n.id}
                  className={cn(
                    rowActive && "bg-white/5 ring-1 ring-inset ring-cyan-300/25"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                        {n.region === "LOCAL" ? (
                          <ShieldAlert className="h-4 w-4 text-amber-200" />
                        ) : (
                          <Cpu className="h-4 w-4 text-cyan-200" />
                        )}
                      </div>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-zinc-100">
                          {n.name}
                        </div>
                        <div className="text-xs text-zinc-500">{n.region}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-200/90">
                    <span className="tabular-nums">{n.latencyMs} ms</span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-200/90 tabular-nums">
                        {n.capacityPct}%
                      </div>
                      <div className="h-2 rounded-full bg-white/5 ring-1 ring-inset ring-white/10 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${weightColor}`}
                          style={{ width: `${n.capacityPct}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-zinc-200/90 tabular-nums">
                      {(n.errorRate * 100).toFixed(2)}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-xs text-zinc-200/90">
                        <span className="tabular-nums font-medium">{weightPct}%</span>
                        <span className="text-zinc-500 tabular-nums">w={n.weight.toFixed(2)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/5 ring-1 ring-inset ring-white/10 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${weightColor}`}
                          style={{ width: `${weightPct}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="grid grid-cols-4 gap-2">
          {regionOrder.map((r) => {
            const count = distribution[r] ?? 0;
            const pct = Math.round((count / Math.max(1, Object.values(distribution).reduce((a, b) => a + b, 0))) * 100);
            return (
              <div key={r} className="rounded-2xl border border-white/10 bg-white/3 p-3">
                <div className="text-xs text-zinc-500">{r}</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-100">
                  {count}
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/5 ring-1 ring-inset ring-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400/60 to-violet-400/60"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

