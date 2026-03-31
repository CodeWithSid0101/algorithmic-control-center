"use client";

import * as React from "react";
import { KeyRound, ShieldCheck, LogIn } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSessionSimulation } from "@/components/gateway/useSessionSimulation";
import { GatewayAuthModal } from "@/components/gateway/GatewayAuthModal";
import { SessionTable } from "@/components/gateway/SessionTable";

export default function GatewayView() {
  const { sessions, clock, createSession } = useSessionSimulation();
  const [open, setOpen] = React.useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
              <KeyRound className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
                Gateway (User Interaction & Auth)
              </h1>
              <p className="text-sm text-zinc-400">
                OAuth 2.0 / JWT lifecycle with RS256 signatures, RBAC, geo, and TLS 1.3 termination (simulated).
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">TLS 1.3 Termination</Badge>
          <Badge variant="neutral">
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              Guarded Sessions
            </span>
          </Badge>
          <Button size="sm" onClick={() => setOpen(true)}>
            <LogIn className="mr-2 h-3.5 w-3.5" />
            Launch OAuth Login
          </Button>
        </div>
      </div>

      <SessionTable sessions={sessions} now={clock} />

      <GatewayAuthModal
        open={open}
        onClose={() => setOpen(false)}
        onLogin={({ user, role, region }) => createSession(user, role, region)}
      />
    </div>
  );
}
