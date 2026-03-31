"use client";

import { CheckCircle2, Lock, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { availableRules, useGovernanceSimulation } from "@/components/governance/useGovernanceSimulation";
import type { AccessStep } from "@/components/governance/types";

export default function GovernancePlaceholder() {
  const { enabledRules, toggleRule, compiled, activeEval, history, steps } = useGovernanceSimulation();

  const stepState = (step: AccessStep) => {
    if (!activeEval) return "pending";
    return activeEval.stepResult[step];
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Governance & Security (The Shield)
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Intent-driven policy to cloud-specific controls, plus conjunctive access validation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Compliance checks active</Badge>
          <Badge variant="neutral">OPA-style policy engine</Badge>
          <Badge variant="success">Encryption guardrails</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Intent-Driven Policy Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2">
              {availableRules.map((rule) => {
                const enabled = enabledRules.includes(rule.id);
                return (
                  <button
                    key={rule.id}
                    onClick={() => toggleRule(rule.id)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition-colors",
                      enabled
                        ? "border-cyan-400/40 bg-cyan-500/10"
                        : "border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-cyan-500/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-zinc-100">{rule.label}</div>
                        <div className="mt-1 text-xs text-zinc-400">{rule.description}</div>
                      </div>
                      {enabled ? (
                        <CheckCircle2 className="h-4 w-4 text-cyan-300" />
                      ) : (
                        <Lock className="h-4 w-4 text-zinc-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <CodePanel title="Rego (compiled)" body={compiled.rego} />
              <CodePanel title="AWS / Azure / GCP mappings" body={`${compiled.aws}\n\n${compiled.azure}\n\n${compiled.gcp}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Conjunctive Access Evaluation Log</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              Reset Stream
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
              <div className="text-xs text-zinc-500">Current Request</div>
              {activeEval ? (
                <div className="mt-2 text-xs text-zinc-300 space-y-1">
                  <div>
                    <span className="text-zinc-500">principal:</span> {activeEval.request.principal}
                  </div>
                  <div>
                    <span className="text-zinc-500">role:</span> {activeEval.request.role} |{" "}
                    <span className="text-zinc-500">geo:</span> {activeEval.request.geo} |{" "}
                    <span className="text-zinc-500">transport:</span> {activeEval.request.encryption}
                  </div>
                </div>
              ) : (
                <div className="mt-2 text-xs text-zinc-500">Waiting for request...</div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2">
              {steps.map((s) => {
                const state = stepState(s);
                return (
                  <div
                    key={s}
                    className={cn(
                      "rounded-xl border p-2 text-center text-xs",
                      state === "pass"
                        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                        : state === "fail"
                          ? "border-red-400/30 bg-red-500/10 text-red-200"
                          : "border-white/10 bg-white/5 text-zinc-400"
                    )}
                  >
                    <div>{s}</div>
                    <div className="mt-1 uppercase">{state}</div>
                  </div>
                );
              })}
            </div>

            <div className="max-h-64 space-y-2 overflow-auto pr-1">
              {history.map((h) => (
                <div key={h.request.id} className="rounded-xl border border-white/10 bg-white/3 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">{h.request.principal}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5",
                        h.allowed ? "bg-emerald-500/10 text-emerald-200" : "bg-red-500/10 text-red-200"
                      )}
                    >
                      {h.allowed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {h.allowed ? "Allowed" : "Denied"}
                    </span>
                  </div>
                  <div className="mt-1 text-zinc-500">
                    {h.request.role} | {h.request.geo} | {h.request.encryption}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CodePanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
      <div className="mb-2 text-xs text-zinc-500">{title}</div>
      <pre className="overflow-auto text-[11px] leading-relaxed text-zinc-300 whitespace-pre-wrap">
        {body}
      </pre>
    </div>
  );
}

