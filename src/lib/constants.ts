/**
 * Centralized constants and configuration values for the Algorithmic Control Center
 */

// ============================================================================
// GATEWAY / SESSION CONSTANTS
// ============================================================================

export const SESSION_DURATION_MS = 60 * 60 * 1000; // 60 minutes
export const SILENT_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // refresh when < 10 minutes left

export const SESSION_ROLES = ["admin", "operator", "auditor"] as const;
export const SESSION_REGIONS = ["US", "EU", "IN", "APAC"] as const;

// ============================================================================
// SIMULATION TIMING INTERVALS (milliseconds)
// ============================================================================

export const SIMULATION_INTERVALS = {
  GATEWAY: 1000,
  TRAFFIC_WRR: 1000,
  TRAFFIC_CIRCUIT_BREAKER: 1000,
  GOVERNANCE: 1500,
  OBSERVABILITY_ANOMALY: 1500,
  OBSERVABILITY_LOG: 1500,
  LEDGER_RAFT: 1800,
  ORCHESTRATION_Q_LEARNING: 1800,
} as const;

// ============================================================================
// TRAFFIC / WEIGHTED ROUND ROBIN CONSTANTS
// ============================================================================

// WRR Weight Score Calculation
export const WRR_WEIGHT_COEFFICIENTS = {
  capacity: 0.45,
  latency: 0.35,
  error: 0.2,
} as const;

// Latency normalization baseline (ms)
export const WRR_LATENCY_BASELINE = 220;

// Error rate baseline (normalized to 1.0)
export const WRR_ERROR_BASELINE = 0.06;

// Weight floor to prevent starvation
export const WRR_WEIGHT_FLOOR = 0.04;

// Weight multiplier for final calculation
export const WRR_WEIGHT_MULTIPLIER = 10;

// Noise amplitude for latency jitter
export const WRR_LATENCY_NOISE_AMPLITUDE = 16;

// Noise amplitude for capacity variations
export const WRR_CAPACITY_NOISE_AMPLITUDE = 10;

// Noise amplitude for error rate jitter
export const WRR_ERROR_NOISE_AMPLITUDE = 0.012;

// Probability of latency spike
export const WRR_SPIKE_PROBABILITY = 0.06;

// Spike multiplier
export const WRR_SPIKE_MULTIPLIER = 1.6;

// Clamp ranges
export const WRR_LATENCY_RANGE = { min: 18, max: 250 } as const;
export const WRR_CAPACITY_RANGE = { min: 22, max: 98 } as const;
export const WRR_ERROR_RANGE = { min: 0.002, max: 0.09 } as const;

// History/tick recording size
export const WRR_MAX_TICKS = 50;

export const WRR_CLOUD_REGIONS = ["US", "EU", "APAC", "LOCAL"] as const;

// ============================================================================
// CIRCUIT BREAKER CONSTANTS
// ============================================================================

export const CIRCUIT_BREAKER_DEFAULTS = {
  errorThreshold: 0.028,
  openTicks: 8,
  probeTicks: 4,
} as const;

// ============================================================================
// LEDGER / RAFT CONSENSUS CONSTANTS
// ============================================================================

export const RAFT_NODE_CLOUDS = ["AWS", "Azure", "GCP", "On-Prem", "Edge"] as const;

export const RAFT_NODE_ROLES = ["LEADER", "FOLLOWER"] as const;

export const RAFT_MAX_CONFLICT_EVENTS = 30;

export const RAFT_LOG_ROTATION_INTERVAL_MS = 1800000; // 30 minutes

// ============================================================================
// ORCHESTRATION / Q-LEARNING CONSTANTS
// ============================================================================

export const ORCHESTRATION_CLOUD_ENVS = ["AWS", "Azure", "GCP", "On-Prem"] as const;

// Q-Learning hyperparameters
export const Q_LEARNING = {
  learningRate: 0.1,
  discountFactor: 0.95,
  explorationRate: 0.15,
} as const;

// Cluster capacity defaults
export const ORCHESTRATION_CLUSTERS = {
  AWS: { capacity: 42, baseUtilization: 0.52 },
  Azure: { capacity: 32, baseUtilization: 0.46 },
  GCP: { capacity: 28, baseUtilization: 0.41 },
  "On-Prem": { capacity: 18, baseUtilization: 0.63 },
} as const;

// Service defaults
export const ORCHESTRATION_SERVICES = [
  { id: "api", name: "api-gateway", baseReplicas: 30 },
  { id: "ml", name: "ml-inference", baseReplicas: 18 },
  { id: "db", name: "event-store", baseReplicas: 12 },
] as const;

// ============================================================================
// GOVERNANCE / ACCESS CONTROL CONSTANTS
// ============================================================================

export const GOVERNANCE_ACCESS_STEPS = ["Identity", "RBAC", "Geo", "Encryption", "Audit"] as const;

export const GOVERNANCE_STEP_TIMING_MS = 600; // time per step

export const GOVERNANCE_POLICY_RULES = {
  data_residency_india: { label: "Data Residency (India)", description: "All data must reside in India" },
  encryption_aes256: { label: "AES-256 Encryption", description: "Mandatory AES-256 encryption" },
  mfa_admin_only: { label: "MFA (Admin Only)", description: "MFA required for admin roles" },
  deny_high_risk_geo: { label: "Deny High-Risk Geo", description: "Deny access from high-risk geographies" },
  pii_masking_enabled: { label: "PII Masking", description: "Mask PII in audit logs" },
} as const;

// ============================================================================
// OBSERVABILITY / MONITORING CONSTANTS
// ============================================================================

export const OBSERVABILITY_MAX_SAMPLES = 100; // Max metric samples in history

export const OBSERVABILITY_ANOMALY_WINDOW = 20; // lookback for anomaly detection

export const OBSERVABILITY_ANOMALY_THRESHOLD = 2.0; // std deviations for anomaly flag

export const OBSERVABILITY_LOG_PAGE_SIZE = 15; // logs per page

export const OBSERVABILITY_AUTO_HEAL_PROBABILITY = 0.4; // probability of auto-heal on warn

export const OBSERVABILITY_METRIC_BASELINE = {
  cpuUsage: 0.35, // 35%
  memoryUsage: 0.45, // 45%
  requestLatency: 80, // ms
  errorRate: 0.001, // 0.1%
  queueDepth: 12, // requests
} as const;

// ============================================================================
// CLOUD INTEGRATION CONSTANTS
// ============================================================================

export const AWS_ASSUME_ROLE_DURATION_SECONDS = 900; // 15 minutes

export const AZURE_DEFAULT_SUBSCRIPTION_ID = "default-subscription";

export const CLOUD_PROVIDERS = ["aws", "azure"] as const;

// ============================================================================
// UI / FORMATTING CONSTANTS
// ============================================================================

export const COUNTDOWN_FORMAT = {
  CRITICAL_THRESHOLD_MS: 60000, // 1 minute - show in red
  WARNING_THRESHOLD_MS: 300000, // 5 minutes - show in amber
} as const;

// ============================================================================
// ACCESSIBILITY / ARIA CONSTANTS
// ============================================================================

export const ARIA_LIVE_REGIONS = {
  polite: "polite",
  assertive: "assertive",
} as const;
