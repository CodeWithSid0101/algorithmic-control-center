// Gateway / Session types
export type Session = {
  id: string;
  user: string;
  role: "admin" | "operator" | "auditor";
  region: "US" | "EU" | "IN" | "APAC";
  issuedAt: number;
  expiresAt: number;
  token: string;
  kid: string;
};

// Traffic / WRR types
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

// Traffic / Circuit Breaker types
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

// Ledger / Raft types
export type NodeRole = "LEADER" | "FOLLOWER";

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

// Orchestration types
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

// Observability types
export type MetricSample = {
  timestamp: number;
  value: number;
};

export type AnomalyEvent = {
  timestamp: number;
  severity: "info" | "warning" | "critical";
  message: string;
  anomalyScore: number;
};

export type SelfHealingLogEntry = {
  id: string;
  timestamp: number;
  message: string;
  autoResolved: boolean;
};
