"use client";

import * as React from "react";

type NodeRole = "LEADER" | "FOLLOWER";

export type RaftNode = {
  id: string;
  cloud: "AWS" | "Azure" | "GCP" | "On-Prem" | "Edge";
  role: NodeRole;
  term: number;
  logIndex: number;
  healthy: boolean;
};

export type ConflictEvent = {
  id: string;
  key: string;
  source: RaftNode["cloud"];
  oldValue: string;
  newValue: string;
  hlc: string;
  resolution: "LWW_APPLIED" | "NO_CONFLICT";
};

const clouds: RaftNode["cloud"][] = ["AWS", "Azure", "GCP", "On-Prem", "Edge"];

function hlcNow(counter: number) {
  const physical = Date.now();
  return `${physical}-${counter.toString().padStart(4, "0")}`;
}

export function useLedgerSimulation() {
  const [nodes, setNodes] = React.useState<RaftNode[]>(() =>
    clouds.map((cloud, i) => ({
      id: `node-${i + 1}`,
      cloud,
      role: i === 0 ? "LEADER" : "FOLLOWER",
      term: 41,
      logIndex: 1200 + i,
      healthy: true,
    }))
  );
  const [quorumWrites, setQuorumWrites] = React.useState(0);
  const [feed, setFeed] = React.useState<ConflictEvent[]>([]);
  const counterRef = React.useRef(1);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setNodes((prev) => {
        const next = prev.map((n) => ({ ...n }));
        // occasional leader rotation
        if (Math.random() < 0.08) {
          const currentLeaderIdx = next.findIndex((n) => n.role === "LEADER");
          const nextLeaderIdx = (currentLeaderIdx + 1) % next.length;
          next.forEach((n) => (n.role = "FOLLOWER"));
          next[nextLeaderIdx].role = "LEADER";
          next.forEach((n) => (n.term += 1));
        }

        next.forEach((n) => {
          n.healthy = Math.random() > 0.03;
          if (n.healthy) n.logIndex += Math.random() < 0.8 ? 1 : 0;
        });
        return next;
      });

      // quorum write simulation
      const successes = 3 + Math.floor(Math.random() * 2);
      if (successes >= 3) setQuorumWrites((q) => q + 1);

      // conflict + LWW resolution feed
      const key = ["tenant/config", "policy/geo", "routing/weights", "service/replicas"][
        Math.floor(Math.random() * 4)
      ];
      const oldValue = `v${Math.floor(Math.random() * 20)}`;
      const newValue = `v${Math.floor(Math.random() * 20) + 20}`;
      const source = clouds[Math.floor(Math.random() * clouds.length)];
      const resolution: ConflictEvent["resolution"] =
        Math.random() < 0.65 ? "LWW_APPLIED" : "NO_CONFLICT";
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const hlc = hlcNow(counterRef.current++);
      setFeed((prev) => [
        { id, key, source, oldValue, newValue, hlc, resolution },
        ...prev,
      ].slice(0, 40));
    }, 1800);

    return () => window.clearInterval(t);
  }, []);

  const leader = nodes.find((n) => n.role === "LEADER") ?? nodes[0];
  const healthyCount = nodes.filter((n) => n.healthy).length;

  return {
    nodes,
    leader,
    quorumWrites,
    healthyCount,
    feed,
  };
}

