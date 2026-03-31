"use client";

import * as React from "react";

export type MetricPoint = {
  timeLabel: string;
  cpu: number;
  memory: number;
  latency: number;
};

export type AnomalyPoint = {
  timeLabel: string;
  value: number;
  zScore: number;
  isAnomaly: boolean;
};

export type EscalationEvent = {
  id: string;
  at: number;
  level: 1 | 2 | 3 | 4;
  message: string;
};

type InternalMetric = {
  at: number;
  cpu: number;
  memory: number;
  latency: number;
};

const MAX_POINTS = 48;
const MAX_ANOMALY_POINTS = 64;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function hhmmss(ms: number) {
  return new Date(ms).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function seededStart() {
  const now = Date.now();
  const points: InternalMetric[] = [];
  for (let i = 22; i >= 0; i -= 1) {
    points.push({
      at: now - i * 3000,
      cpu: 42 + Math.random() * 8,
      memory: 56 + Math.random() * 10,
      latency: 38 + Math.random() * 7,
    });
  }
  return points;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function std(values: number[]) {
  if (!values.length) return 0;
  const m = mean(values);
  const variance = values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function useObservabilitySimulation() {
  const [metrics, setMetrics] = React.useState<InternalMetric[]>(() => seededStart());
  const [anomalySeries, setAnomalySeries] = React.useState<AnomalyPoint[]>([]);
  const [escalationLog, setEscalationLog] = React.useState<EscalationEvent[]>([]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setMetrics((prev) => {
        const latest = prev[prev.length - 1];
        const baselineCpu = latest?.cpu ?? 45;
        const baselineMemory = latest?.memory ?? 58;
        const baselineLatency = latest?.latency ?? 40;

        const burst = Math.random() < 0.07;
        const cpu = clamp(
          baselineCpu + (Math.random() - 0.5) * 9 + (burst ? 15 + Math.random() * 12 : 0),
          12,
          96
        );
        const memory = clamp(
          baselineMemory + (Math.random() - 0.5) * 5 + (burst ? 7 + Math.random() * 6 : 0),
          25,
          98
        );
        const latency = clamp(
          baselineLatency + (Math.random() - 0.5) * 6 + (burst ? 22 + Math.random() * 16 : 0),
          8,
          180
        );

        const next = [...prev, { at: Date.now(), cpu, memory, latency }].slice(-MAX_POINTS);
        return next;
      });
    }, 1500);

    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const values = metrics.map((m) => m.latency);
    const m = mean(values);
    const s = std(values) || 1;
    const last = metrics[metrics.length - 1];
    if (!last) return;

    const z = (last.latency - m) / s;
    const isAnomaly = Math.abs(z) > 3;

    setAnomalySeries((prev) =>
      [
        ...prev,
        {
          timeLabel: hhmmss(last.at),
          value: Number(last.latency.toFixed(2)),
          zScore: Number(z.toFixed(2)),
          isAnomaly,
        },
      ].slice(-MAX_ANOMALY_POINTS)
    );

    if (isAnomaly) {
      const id = `${last.at}-${Math.random().toString(36).slice(2, 7)}`;
      const level: 1 | 2 | 3 | 4 =
        Math.abs(z) > 4.4 ? 4 : Math.abs(z) > 3.8 ? 3 : Math.abs(z) > 3.4 ? 2 : 1;
      const levelMessages: Record<1 | 2 | 3 | 4, string> = {
        1: "Level 1: Restart unhealthy pod replica.",
        2: "Level 2: Migrate workload to lower-latency cluster.",
        3: "Level 3: Reroute traffic via multi-cloud failover path.",
        4: "Level 4: Disaster Recovery protocol initiated.",
      };
      setEscalationLog((prev): EscalationEvent[] =>
        [
          ...prev,
          { id, at: last.at, level, message: levelMessages[level] },
        ].slice(-100)
      );
    } else if (Math.random() < 0.1) {
      const id = `${last.at}-ok-${Math.random().toString(36).slice(2, 6)}`;
      const level = 1 as const;
      setEscalationLog((prev): EscalationEvent[] =>
        [
          ...prev,
          {
            id,
            at: last.at,
            level,
            message: "Health check passed: no action required.",
          },
        ].slice(-100)
      );
    }
  }, [metrics]);

  const chartData: MetricPoint[] = React.useMemo(
    () =>
      metrics.map((m) => ({
        timeLabel: hhmmss(m.at),
        cpu: Number(m.cpu.toFixed(2)),
        memory: Number(m.memory.toFixed(2)),
        latency: Number(m.latency.toFixed(2)),
      })),
    [metrics]
  );

  const uptime = "99.999%";
  const interoperability = "Cross-cloud sync: healthy";
  const lockIn = "Agnostic abstraction: active";
  const security = "Compliance checks: 42/42 passing";

  return {
    chartData,
    anomalySeries,
    escalationLog: escalationLog.slice().reverse(),
    uptime,
    interoperability,
    lockIn,
    security,
  };
}

