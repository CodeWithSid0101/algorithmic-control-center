export type PolicyRuleId =
  | "data_residency_india"
  | "encryption_aes256"
  | "mfa_admin_only"
  | "deny_high_risk_geo"
  | "pii_masking_enabled";

export type PolicyRule = {
  id: PolicyRuleId;
  label: string;
  description: string;
};

export type AccessRequest = {
  id: string;
  principal: string;
  role: "admin" | "operator" | "auditor";
  geo: "IN" | "US" | "EU" | "APAC";
  encryption: "TLS1.3" | "TLS1.2";
  auditTrail: boolean;
};

export type AccessStep = "Identity" | "RBAC" | "Geo" | "Encryption" | "Audit";

export type AccessEvaluation = {
  request: AccessRequest;
  currentStepIndex: number;
  stepResult: Record<AccessStep, "pending" | "pass" | "fail">;
  allowed: boolean;
  finalized: boolean;
};

