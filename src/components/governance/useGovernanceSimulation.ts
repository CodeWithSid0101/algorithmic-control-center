"use client";

import * as React from "react";
import type {
  AccessEvaluation,
  AccessRequest,
  AccessStep,
  PolicyRule,
  PolicyRuleId,
} from "./types";

export const availableRules: PolicyRule[] = [
  {
    id: "data_residency_india",
    label: "Data must stay in India",
    description: "All sensitive workloads and storage must be pinned to India region.",
  },
  {
    id: "encryption_aes256",
    label: "Enforce encryption-at-rest (AES-256)",
    description: "Storage accounts and block volumes require AES-256 encryption.",
  },
  {
    id: "mfa_admin_only",
    label: "MFA required for admin actions",
    description: "Admin role actions are denied if MFA proof is missing.",
  },
  {
    id: "deny_high_risk_geo",
    label: "Deny high-risk geolocations",
    description: "Requests from restricted regions are denied by geo policy.",
  },
  {
    id: "pii_masking_enabled",
    label: "Enable PII tokenization/masking",
    description: "PII fields must be masked in logs and analytics pipelines.",
  },
];

const steps: AccessStep[] = ["Identity", "RBAC", "Geo", "Encryption", "Audit"];

function compilePolicy(rules: PolicyRuleId[]) {
  const has = (id: PolicyRuleId) => rules.includes(id);

  const rego = [
    "package governance.access",
    "",
    "default allow := false",
    "",
    "allow if {",
    "  input.identity.verified == true",
    "  role_allowed",
    has("data_residency_india") ? '  input.request.region == "IN"' : "  true",
    has("deny_high_risk_geo") ? "  not blocked_geo" : "  true",
    '  input.transport.tls == "TLS1.3"',
    "  input.audit.enabled == true",
    "}",
  ].join("\n");

  const aws = [
    "AWS Policy Mapping",
    has("data_residency_india")
      ? "- SCP: deny resource creation outside ap-south-1"
      : "- SCP: region unrestricted",
    has("encryption_aes256")
      ? "- KMS + EBS encryption required"
      : "- Encryption optional",
    has("mfa_admin_only")
      ? "- IAM Condition: aws:MultiFactorAuthPresent = true for admin"
      : "- MFA optional for admin",
  ].join("\n");

  const azure = [
    "Azure Policy Mapping",
    has("data_residency_india")
      ? "- Deny locations not in India regions"
      : "- Region policy relaxed",
    has("encryption_aes256")
      ? "- Disk encryption set enforcement (AES-256)"
      : "- Encryption not enforced",
    has("pii_masking_enabled")
      ? "- Purview masking policy mandatory"
      : "- Masking policy informational",
  ].join("\n");

  const gcp = [
    "GCP Policy Mapping",
    has("data_residency_india")
      ? "- Org Policy: restrict locations to asia-south1"
      : "- Locations unrestricted",
    has("encryption_aes256")
      ? "- CMEK-backed disk/storage encryption required"
      : "- CMEK optional",
    has("deny_high_risk_geo")
      ? "- Cloud Armor geo-blocklist enabled"
      : "- Geo blocklist disabled",
  ].join("\n");

  return { rego, aws, azure, gcp };
}

// Global counter for unique request IDs
let requestCounter = 0;

function randomRequest(): AccessRequest {
  const roles: AccessRequest["role"][] = ["admin", "operator", "auditor"];
  const geos: AccessRequest["geo"][] = ["IN", "US", "EU", "APAC"];
  const enc: AccessRequest["encryption"][] = ["TLS1.3", "TLS1.2"];
  const i = Math.floor(Math.random() * 10000);
  requestCounter++;
  return {
    id: `req-${requestCounter}-${Date.now()}`,
    principal: `user${i}@corp`,
    role: roles[Math.floor(Math.random() * roles.length)],
    geo: geos[Math.floor(Math.random() * geos.length)],
    encryption: enc[Math.random() < 0.85 ? 0 : 1],
    auditTrail: Math.random() > 0.1,
  };
}

function evaluateStep(
  step: AccessStep,
  req: AccessRequest,
  enabledRules: PolicyRuleId[]
): "pass" | "fail" {
  switch (step) {
    case "Identity":
      return req.principal.includes("@corp") ? "pass" : "fail";
    case "RBAC":
      if (enabledRules.includes("mfa_admin_only") && req.role === "admin") {
        return Math.random() < 0.8 ? "pass" : "fail";
      }
      return "pass";
    case "Geo":
      if (enabledRules.includes("data_residency_india")) return req.geo === "IN" ? "pass" : "fail";
      if (enabledRules.includes("deny_high_risk_geo")) return req.geo === "APAC" ? "fail" : "pass";
      return "pass";
    case "Encryption":
      return req.encryption === "TLS1.3" ? "pass" : "fail";
    case "Audit":
      return req.auditTrail ? "pass" : "fail";
    default:
      return "fail";
  }
}

export function useGovernanceSimulation() {
  const [enabledRules, setEnabledRules] = React.useState<PolicyRuleId[]>([
    "data_residency_india",
    "encryption_aes256",
    "mfa_admin_only",
  ]);

  const [activeEval, setActiveEval] = React.useState<AccessEvaluation | null>(null);
  const [history, setHistory] = React.useState<AccessEvaluation[]>([]);

  const compiled = React.useMemo(() => compilePolicy(enabledRules), [enabledRules]);

  const toggleRule = React.useCallback((id: PolicyRuleId) => {
    setEnabledRules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  React.useEffect(() => {
    const t = window.setInterval(() => {
      setActiveEval((current) => {
        if (!current || current.finalized) {
          const req = randomRequest();
          return {
            request: req,
            currentStepIndex: 0,
            stepResult: {
              Identity: "pending",
              RBAC: "pending",
              Geo: "pending",
              Encryption: "pending",
              Audit: "pending",
            },
            allowed: false,
            finalized: false,
          };
        }

        const step = steps[current.currentStepIndex];
        const result = evaluateStep(step, current.request, enabledRules);
        const nextStepResult = { ...current.stepResult, [step]: result };
        const failed = result === "fail";
        const nextIndex = current.currentStepIndex + 1;
        const done = failed || nextIndex >= steps.length;

        const nextEval: AccessEvaluation = {
          ...current,
          currentStepIndex: done ? current.currentStepIndex : nextIndex,
          stepResult: nextStepResult,
          allowed: done ? !failed : false,
          finalized: done,
        };

        if (done) {
          setHistory((prev) => [nextEval, ...prev].slice(0, 24));
        }

        return nextEval;
      });
    }, 1500);

    return () => window.clearInterval(t);
  }, [enabledRules]);

  return {
    enabledRules,
    toggleRule,
    compiled,
    activeEval,
    history,
    steps,
  };
}

