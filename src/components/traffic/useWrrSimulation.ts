"use client";

import * as React from "react";

export type CloudNode = {
  id: string;
  name: string;
  region: "US" | "EU" | "APAC" | "LOCAL";
  latencyMs: number;
  capacityPct: number; // 0..100
  errorRate: number; // 0..1
  weightScore: number; // 0..1
  weight: number; // derived weight for WRR (>= 0)
};

export type WrrTick = {
  timestamp: number;
  selectedNodeId: string;
  distributionByRegion: Record<CloudNode["region"], number>;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

function computeWeightScore(params: {
  latencyMs: number;
  capacityPct: number;
  errorRate: number;
}): { weightScore: number; weight: number } {
  const { latencyMs, capacityPct, errorRate } = params;

  // Scores are normalized and blended to represent "availability" for traffic.
  const latencyScore = clamp(1 - latencyMs / 220, 0, 1);
  const capacityScore = clamp(capacityPct / 100, 0, 1);
  const errorScore = clamp(1 - errorRate / 0.06, 0, 1);

  const weightScore = clamp(0.45 * capacityScore + 0.35 * latencyScore + 0.2 * errorScore, 0, 1);

  // Smooth weighted round robin uses relative weights; keep a floor to avoid starvation.
  const weight = clamp(weightScore, 0.04, 1) * 10;

  return { weightScore, weight };
}

function addNoise(base: number, amplitude: number) {
  // Small gaussian-like noise via averaging uniform samples.
  const r = (Math.random() + Math.random() + Math.random() + Math.random()) / 4;
  return base + (r - 0.5) * amplitude;
}

export function useWrrSimulation() {
  const initialNodes = React.useMemo<CloudNode[]>(() => {
    const base = [
      { id: "aws-us-east", name: "AWS - us-east-1", region: "US" as const, latencyMs: 46, capacityPct: 84, errorRate: 0.010 },
      { id: "azure-eu-west", name: "Azure - eu-west-1", region: "EU" as const, latencyMs: 62, capacityPct: 76, errorRate: 0.016 },
      { id: "gcp-apac-sg", name: "GCP - ap-southeast-1", region: "APAC" as const, latencyMs: 58, capacityPct: 70, errorRate: 0.012 },
      { id: "onprem-local", name: "On-Prem - core-01", region: "LOCAL" as const, latencyMs: 85, capacityPct: 64, errorRate: 0.022 },
    ];

    return base.map((n) => {
      const { weightScore, weight } = computeWeightScore(n);
      return { ...n, weightScore, weight };
    });
  }, []);

  const [nodes, setNodes] = React.useState<CloudNode[]>(initialNodes);
  const [selectedNodeId, setSelectedNodeId] = React.useState(initialNodes[0]?.id ?? "");
  const [distribution, setDistribution] = React.useState<Record<CloudNode["region"], number>>({
    US: 0,
    EU: 0,
    APAC: 0,
    LOCAL: 0,
  });
  const [ticks, setTicks] = React.useState<WrrTick[]>([]);

  const currentWeightsRef = React.useRef<Record<string, number>>({});
  const windowHistoryRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    // Initialize smooth weighted round robin state.
    const map: Record<string, number> = {};
    for (const n of initialNodes) map[n.id] = 0;
    currentWeightsRef.current = map;
  }, [initialNodes]);

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setNodes((prev) => {
        const nextTelemetry = prev.map((n) => {
          // Make telemetry move slowly but allow occasional spikes.
          const spike = Math.random() < 0.06 ? 1.6 : 1;
          const latencyMs = clamp(addNoise(n.latencyMs, 16 * spike), 18, 250);
          const capacityPct = clamp(addNoise(n.capacityPct, 10), 22, 98);
          const errorRate = clamp(addNoise(n.errorRate, 0.012 * spike), 0.002, 0.09);

          const { weightScore, weight } = computeWeightScore({
            latencyMs,
            capacityPct,
            errorRate,
          });
          return {
            ...n,
            latencyMs: Math.round(latencyMs),
            capacityPct: Math.round(capacityPct),
            errorRate,
            weightScore,
            weight,
          };
        });

        // Smooth weighted round robin selection.
        const totalWeight = nextTelemetry.reduce((sum, n) => sum + n.weight, 0);
        let bestId = nextTelemetry[0]?.id ?? "";
        let bestWeight = -Infinity;

        // Ensure current weights exist.
        const cw = currentWeightsRef.current;
        for (const n of nextTelemetry) {
          if (cw[n.id] === undefined) cw[n.id] = 0;
        }

        // Add weights and pick max.
        for (const n of nextTelemetry) {
          cw[n.id] += n.weight;
          if (cw[n.id] > bestWeight) {
            bestWeight = cw[n.id];
            bestId = n.id;
          }
        }

        cw[bestId] -= totalWeight;

        setSelectedNodeId(bestId);

        // Maintain a small sliding window to show recent distribution.
        const windowSize = 90;
        const history = windowHistoryRef.current;
        history.push(bestId);
        while (history.length > windowSize) history.shift();

        const nextDistribution: Record<CloudNode["region"], number> = {
          US: 0,
          EU: 0,
          APAC: 0,
          LOCAL: 0,
        };

        const idToNode = new Map(nextTelemetry.map((n) => [n.id, n]));
        for (const id of history) {
          const node = idToNode.get(id);
          if (!node) continue;
          nextDistribution[node.region] += 1;
        }

        setDistribution(nextDistribution);
        setTicks((prevTicks) => {
          const timestamp = Date.now();
          const tick: WrrTick = {
            timestamp,
            selectedNodeId: bestId,
            distributionByRegion: nextDistribution,
          };
          return [...prevTicks.slice(-79), tick];
        });

        return nextTelemetry;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const avgErrorRate = React.useMemo(() => {
    if (!nodes.length) return 0;
    return nodes.reduce((sum, n) => sum + n.errorRate, 0) / nodes.length;
  }, [nodes]);

  return {
    nodes,
    selectedNodeId,
    distribution,
    recentTicks: ticks,
    avgErrorRate: avgErrorRate,
  };
}

export function formatPercent01(v: number) {
  return `${Math.round(v * 10000) / 100}%`;
}

export function formatErrorRate(v: number) {
  return `${round2(v * 100)}%`;
}

