"use client";

import * as React from "react";

export type CloudEnv = "AWS" | "Azure" | "GCP" | "On-Prem";

export type QRow = {
  state: CloudEnv;
  actions: Record<CloudEnv, number>;
  visits: number;
};

export type FederationCluster = {
  id: CloudEnv;
  capacity: number;
  utilization: number;
};

export type FederationService = {
  id: string;
  name: string;
  baseReplicas: number;
  replicasByCluster: Record<CloudEnv, number>;
};

const envs: CloudEnv[] = ["AWS", "Azure", "GCP", "On-Prem"];

function initialQ(): QRow[] {
  return envs.map((e) => ({
    state: e,
    actions: {
      AWS: Math.random() * 0.5,
      Azure: Math.random() * 0.5,
      GCP: Math.random() * 0.5,
      "On-Prem": Math.random() * 0.5,
    },
    visits: 1,
  }));
}

function softmaxPick(actions: Record<CloudEnv, number>): CloudEnv {
  const values = envs.map((e) => actions[e]);
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  const r = Math.random() * sum;
  let acc = 0;
  for (let i = 0; i < envs.length; i += 1) {
    acc += exps[i];
    if (r <= acc) return envs[i];
  }
  return envs[envs.length - 1];
}

export function useOrchestrationSimulation() {
  const [qTable, setQTable] = React.useState<QRow[]>(() => initialQ());
  const [clusters, setClusters] = React.useState<FederationCluster[]>([
    { id: "AWS", capacity: 42, utilization: 0.52 },
    { id: "Azure", capacity: 32, utilization: 0.46 },
    { id: "GCP", capacity: 28, utilization: 0.41 },
    { id: "On-Prem", capacity: 18, utilization: 0.63 },
  ]);
  const [services, setServices] = React.useState<FederationService[]>(() => {
    const base: FederationService[] = [
      { id: "api", name: "api-gateway", baseReplicas: 30, replicasByCluster: { AWS: 0, Azure: 0, GCP: 0, "On-Prem": 0 } },
      { id: "ml", name: "ml-inference", baseReplicas: 18, replicasByCluster: { AWS: 0, Azure: 0, GCP: 0, "On-Prem": 0 } },
      { id: "db", name: "event-store", baseReplicas: 12, replicasByCluster: { AWS: 0, Azure: 0, GCP: 0, "On-Prem": 0 } },
    ];
    return base;
  });

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setClusters((prev) =>
        prev.map((c) => {
          const noise = (Math.random() - 0.5) * 8;
          const cap = Math.max(10, Math.min(64, c.capacity + noise));
          const util = Math.max(0.2, Math.min(0.9, c.utilization + (Math.random() - 0.5) * 0.06));
          return { ...c, capacity: cap, utilization: util };
        })
      );

      setQTable((prev) => {
        const next = prev.map((row) => ({ ...row, actions: { ...row.actions } }));
        const stateIndex = Math.floor(Math.random() * next.length);
        const stateRow = next[stateIndex];
        const action = softmaxPick(stateRow.actions);

        const cluster = clusters.find((c) => c.id === action) ?? clusters[0];
        const reward =
          (1 - cluster.utilization) * 0.6 +
          (1 - Math.min(1, cluster.capacity / 64)) * 0.15 +
          (Math.random() - 0.5) * 0.1;

        const alpha = 0.2;
        const gamma = 0.8;
        const oldQ = stateRow.actions[action];
        const maxNext = Math.max(...envs.map((e) => stateRow.actions[e]));
        const updated = oldQ + alpha * (reward + gamma * maxNext - oldQ);
        stateRow.actions[action] = updated;
        stateRow.visits += 1;

        return next;
      });

      setServices((prev) => {
        const totalCapacity = clusters.reduce((sum, c) => sum + c.capacity, 0) || 1;
        return prev.map((svc) => {
          const replicasByCluster = {} as Record<CloudEnv, number>;
          envs.forEach((env) => {
            const c = clusters.find((cl) => cl.id === env)!;
            const share = c.capacity / totalCapacity;
            const ideal = svc.baseReplicas * share;
            replicasByCluster[env] = Math.max(0, Math.round(ideal));
          });
          return { ...svc, replicasByCluster };
        });
      });
    }, 1800);

    return () => window.clearInterval(t);
  }, [clusters]);

  return {
    qTable,
    clusters,
    services,
  };
}

