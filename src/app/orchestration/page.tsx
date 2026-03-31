"use client";

import { BrainCircuit } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { QTable } from "@/components/orchestration/QTable";
import { FederationGrid } from "@/components/orchestration/FederationGrid";
import { useOrchestrationSimulation } from "@/components/orchestration/useOrchestrationSimulation";

export default function OrchestrationView() {
  const { qTable, clusters, services } = useOrchestrationSimulation();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <BrainCircuit className="h-5 w-5 text-violet-200" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
              AI Orchestration Plane (The Brain)
            </h1>
            <p className="text-sm text-zinc-400">
              Q-learning placement agent and federated replica distribution across AWS, Azure, GCP, and On-Prem.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Policy-driven placement</Badge>
          <Badge variant="neutral">Cross-cloud federation</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_1fr]">
        <QTable rows={qTable} />
        <FederationGrid clusters={clusters} services={services} />
      </div>
    </div>
  );
}

