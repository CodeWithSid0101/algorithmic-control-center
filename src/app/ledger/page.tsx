"use client";

import * as React from "react";
import { Database, Crown, GitMerge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLedgerSimulation } from "@/components/ledger/useLedgerSimulation";
import type { CloudTelemetry } from "@/lib/cloud/types";
import { cn } from "@/lib/utils";

export default function LedgerView() {
  const { nodes, leader, quorumWrites, healthyCount, feed } = useLedgerSimulation();
  const [cloudTelemetry, setCloudTelemetry] = React.useState<CloudTelemetry | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/cloud/telemetry", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as CloudTelemetry;
        if (!cancelled) setCloudTelemetry(data);
      } catch {
        // keep UI resilient; fall back to local simulation visuals
      }
    };

    load();
    const t = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Database className="h-5 w-5 text-cyan-200" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              Cross-Cloud Data Sync (The Ledger)
            </h1>
            <p className="text-sm text-zinc-400">
              Raft consensus quorum simulation with LWW conflict resolution using HLC timestamps.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Leader: {leader.cloud}</Badge>
          <Badge variant="neutral">Quorum writes: {quorumWrites}</Badge>
          <Badge variant={healthyCount >= 3 ? "success" : "warning"}>
            Healthy nodes: {healthyCount}/5
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Raft Node Map</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className={cn(
                    "rounded-2xl border p-3",
                    node.role === "LEADER"
                      ? "border-cyan-400/40 bg-cyan-500/10"
                      : "border-white/10 bg-white/5"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-100">{node.cloud}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]",
                        node.role === "LEADER"
                          ? "bg-cyan-400/20 text-cyan-100"
                          : "bg-white/10 text-zinc-300"
                      )}
                    >
                      {node.role === "LEADER" ? <Crown className="h-3 w-3" /> : null}
                      {node.role}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-zinc-400">
                    term: {node.term} | logIndex: {node.logIndex}
                  </div>
                  <div className="mt-1 text-xs">
                    <span
                      className={node.healthy ? "text-emerald-300" : "text-red-300"}
                    >
                      {node.healthy ? "healthy" : "degraded"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conflict Resolution Feed (LWW + HLC)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 space-y-2 overflow-auto pr-1">
              {feed.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">{item.key}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                        item.resolution === "LWW_APPLIED"
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-emerald-500/15 text-emerald-200"
                      )}
                    >
                      <GitMerge className="h-3 w-3" />
                      {item.resolution}
                    </span>
                  </div>
                  <div className="mt-1 text-zinc-500">
                    {item.source} | HLC: {item.hlc}
                  </div>
                  <div className="mt-1 text-zinc-300">
                    {item.oldValue} -&gt; {item.newValue}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Real Cloud Account Readiness (AWS + Azure)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-zinc-300/90">
          {cloudTelemetry?.accounts.map((a) => (
            <div key={a.provider} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="uppercase text-zinc-300">{a.provider}</span>
                <span className={a.connected ? "text-emerald-300" : "text-amber-300"}>
                  {a.connected ? "connected" : "not connected"}
                </span>
              </div>
              <div className="mt-1 text-zinc-500">
                {a.accountId ? `account: ${a.accountId} · ` : ""}
                {a.tenantId ? `tenant: ${a.tenantId} · ` : ""}
                {a.displayName ?? "no account metadata yet"}
              </div>
              <div className="mt-1 text-zinc-500">{a.details}</div>
            </div>
          ))}
          The UI is now ready to switch from mocked telemetry to live cloud data.
          Next step is adding secure backend adapters:
          <br />
          - AWS: AssumeRole via STS + CloudWatch/EKS/Route53 SDK polling
          <br />
          - Azure: Service Principal (or Managed Identity) + Azure Monitor/AKS SDK polling
          <br />
          - expose normalized data via Next.js server routes so frontend remains cloud-agnostic.
          {cloudTelemetry?.mockFallback ? (
            <div className="text-amber-300 text-xs">
              Mock fallback active for one or more providers until credentials are configured.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

