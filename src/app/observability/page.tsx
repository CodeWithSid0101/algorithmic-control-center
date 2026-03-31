"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ShieldCheck, Unplug, Workflow } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useObservabilitySimulation } from "@/components/observability/useObservabilitySimulation";
type TooltipLike = { payload?: { zScore?: number; isAnomaly?: boolean } };

const chartTheme = {
  grid: "rgba(148, 163, 184, 0.18)",
  axis: "rgba(203, 213, 225, 0.45)",
  cpu: "#22d3ee",
  memory: "#a78bfa",
  latency: "#34d399",
  anomaly: "#f87171",
};

export default function ObservabilityPlaceholder() {
  const { chartData, anomalySeries, escalationLog, uptime, interoperability, lockIn, security } =
    useObservabilitySimulation();

  const anomalyOnly = anomalySeries.filter((p) => p.isAnomaly);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Observability & Resilience (The Monitor)
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Grafana-style telemetry with anomaly detection and 4-level self-healing automation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">{uptime} Uptime</Badge>
          <Badge variant="neutral">{interoperability}</Badge>
          <Badge variant="neutral">{lockIn}</Badge>
          <Badge variant="success">{security}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <QuickSignal icon={Activity} title="Downtime Gap" value={uptime} subtitle="SLO visibility + alerting" />
        <QuickSignal icon={Workflow} title="Interoperability Gap" value="Seamless" subtitle="Cross-cloud data flow" />
        <QuickSignal icon={Unplug} title="Vendor Lock-In Gap" value="Agnostic" subtitle="Abstraction layer active" />
        <QuickSignal icon={ShieldCheck} title="Security Gap" value="42 checks" subtitle="Runtime policy compliant" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Prometheus Stream: CPU / Memory / Network Latency</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: 8, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis dataKey="timeLabel" stroke={chartTheme.axis} tick={{ fontSize: 11 }} minTickGap={18} />
                <YAxis stroke={chartTheme.axis} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(9, 12, 20, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                />
                <Line type="monotone" dataKey="cpu" stroke={chartTheme.cpu} strokeWidth={2.2} dot={false} name="CPU %" />
                <Line type="monotone" dataKey="memory" stroke={chartTheme.memory} strokeWidth={2.2} dot={false} name="Memory %" />
                <Line type="monotone" dataKey="latency" stroke={chartTheme.latency} strokeWidth={2.2} dot={false} name="Latency ms" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anomaly Detection (Z-score &gt; 3.0)</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 8, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
                <XAxis type="category" dataKey="timeLabel" stroke={chartTheme.axis} tick={{ fontSize: 11 }} minTickGap={18} />
                <YAxis type="number" dataKey="value" stroke={chartTheme.axis} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name, props) => {
                    const numeric = typeof value === "number" ? value : Number(value ?? 0);
                    const row = (props as TooltipLike | undefined)?.payload;
                    const z = row?.zScore ?? 0;
                    return [`${numeric} ms | z=${z}`, String(name)];
                  }}
                  contentStyle={{
                    backgroundColor: "rgba(9, 12, 20, 0.9)",
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 12,
                    color: "#e2e8f0",
                  }}
                />
                <Scatter data={anomalySeries} fill={chartTheme.latency} name="Latency" />
                <Scatter data={anomalyOnly} fill={chartTheme.anomaly} name="Anomaly" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Self-Healing Escalation Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono">
            <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
              <span>workflow: restart -&gt; migrate -&gt; reroute -&gt; disaster recovery</span>
              <span>{escalationLog.length} entries</span>
            </div>
            <div className="max-h-72 space-y-1 overflow-auto pr-1 text-xs">
              {escalationLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="text-zinc-600">
                    {new Date(entry.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span
                    className={
                      entry.level === 1
                        ? "text-emerald-300"
                        : entry.level === 2
                          ? "text-cyan-300"
                          : entry.level === 3
                            ? "text-amber-300"
                            : "text-red-300"
                    }
                  >
                    [L{entry.level}]
                  </span>
                  <span className="text-zinc-300/95">{entry.message}</span>
                </div>
              ))}
              {!escalationLog.length && (
                <div className="text-zinc-500">Waiting for signals...</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickSignal({
  icon: Icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">{title}</span>
          <Icon className="h-4 w-4 text-cyan-200/90" />
        </div>
        <div className="mt-2 text-xl font-semibold tracking-tight text-zinc-100">{value}</div>
        <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

