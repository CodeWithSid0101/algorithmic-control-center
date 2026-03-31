"use client";

import * as React from "react";

import type { CloudEnv, QRow } from "./useOrchestrationSimulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const envs: CloudEnv[] = ["AWS", "Azure", "GCP", "On-Prem"];

export function QTable({ rows }: { rows: QRow[] }) {
  const maxQ = React.useMemo(
    () => Math.max(...rows.flatMap((r) => envs.map((e) => r.actions[e]))),
    [rows]
  );
  const minQ = React.useMemo(
    () => Math.min(...rows.flatMap((r) => envs.map((e) => r.actions[e]))),
    [rows]
  );

  const norm = (v: number) =>
    maxQ === minQ ? 0.5 : (v - minQ) / (maxQ - minQ || 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Q-Learning Agent (Workload Placement)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <table className="w-full min-w-[460px] text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[11px] text-zinc-400">
              <th className="px-3 py-2 text-left">State / Action</th>
              {envs.map((e) => (
                <th key={e} className="px-3 py-2 text-right">
                  {e}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Visits</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.state} className="border-b border-white/5">
                <td className="px-3 py-2 text-zinc-300">{row.state}</td>
                {envs.map((e) => {
                  const v = row.actions[e];
                  const t = norm(v);
                  const best = v === Math.max(...envs.map((env) => row.actions[env]));
                  return (
                    <td key={e} className="px-3 py-1.5 text-right align-middle">
                      <div
                        className={cn(
                          "inline-flex items-center justify-end gap-2 rounded-full px-2 py-0.5",
                          best
                            ? "bg-emerald-500/10 text-emerald-200"
                            : "bg-white/5 text-zinc-200"
                        )}
                      >
                        <span className="tabular-nums">
                          {v.toFixed(2)}
                        </span>
                        <span
                          className="h-1.5 w-10 overflow-hidden rounded-full bg-white/5"
                          aria-hidden
                        >
                          <span
                            className="block h-full bg-gradient-to-r from-cyan-400/70 to-violet-400/70"
                            style={{ width: `${Math.round(t * 100)}%` }}
                          />
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-right text-zinc-400 tabular-nums">
                  {row.visits}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

