"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Eye, MinusCircle } from "lucide-react";

import type { CircuitState } from "@/types/simulation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CircuitBreaker({
  state,
  readiness,
  phaseProgress,
  eventLog,
}: {
  state: CircuitState;
  readiness: number;
  phaseProgress: number;
  eventLog: Array<{ id: string; at: number; message: string }>;
}) {
  const meta = React.useMemo(() => {
    if (state === "CLOSED") {
      return {
        badgeVariant: "success" as const,
        label: "CLOSED",
        icon: CheckCircle2,
        help: "Healthy: route traffic normally.",
        dot: "bg-emerald-400",
        glow: "shadow-[0_0_30px_rgba(52,211,153,0.55)]",
      };
    }
    if (state === "OPEN") {
      return {
        badgeVariant: "danger" as const,
        label: "OPEN",
        icon: AlertTriangle,
        help: "Unhealthy: route traffic away (failover protection).",
        dot: "bg-red-400",
        glow: "shadow-[0_0_30px_rgba(248,113,113,0.55)]",
      };
    }
    return {
      badgeVariant: "warning" as const,
      label: "HALF_OPEN",
      icon: Eye,
      help: "Probing with limited canary traffic.",
      dot: "bg-amber-400",
      glow: "shadow-[0_0_30px_rgba(251,191,36,0.55)]",
    };
  }, [state]);

  const Icon = meta.icon;
  const knobLeft =
    state === "CLOSED" ? "12%" : state === "HALF_OPEN" ? "50%" : "88%";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Automatic Failover Circuit Breaker</CardTitle>
          <div className="mt-2 text-sm text-zinc-400">{meta.help}</div>
        </div>
        <Badge variant={meta.badgeVariant}>
          <span className="inline-flex items-center gap-2">
            <Icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative rounded-2xl border border-white/10 bg-white/3 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400" aria-hidden="true">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              CLOSED
            </span>
            <span className="inline-flex items-center gap-2">
              <MinusCircle className="h-3.5 w-3.5 text-amber-300" />
              HALF-OPEN
            </span>
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-300" />
              OPEN
            </span>
          </div>

          {/* Track */}
          <div className="mt-3 h-2 rounded-full bg-white/5 ring-1 ring-inset ring-white/10 relative overflow-hidden">
            <motion.div
              className="absolute inset-0 bg-[linear-gradient(90deg,rgba(56,189,248,0.0),rgba(56,189,248,0.45),rgba(167,139,250,0.35),rgba(56,189,248,0.0))]"
              initial={{ x: "-60%" }}
              animate={{ x: "60%" }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
          </div>

          {/* Knob */}
          <AnimatePresence mode="wait">
            <motion.div
              key={state}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 340, damping: 22 }}
              className="absolute top-8 -translate-x-1/2"
              style={{ left: knobLeft }}
              aria-label={`Circuit state: ${meta.label}`}
              role="status"
            >
              <div
                className={`relative h-7 w-7 rounded-full ${meta.dot} ${meta.glow} ring-1 ring-white/30`}
              >
                <div className="absolute inset-0 rounded-full bg-white/15 backdrop-blur-sm" aria-hidden="true" />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Zero-Downtime Failover Readiness</span>
            <span className="font-medium text-zinc-200" aria-live="polite">{Math.round(readiness * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 ring-1 ring-inset ring-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(phaseProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400/70 via-violet-400/60 to-emerald-400/60"
              style={{ width: `${Math.round(phaseProgress * 100)}%` }}
              initial={false}
              animate={{ width: `${Math.round(phaseProgress * 100)}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>State Transition Events</span>
            <span className="tabular-nums text-zinc-500" aria-live="polite" aria-atomic="true">
              {eventLog.length ? `${eventLog.length} recent` : "waiting..."}
            </span>
          </div>
          <div className="mt-2 max-h-36 space-y-2 overflow-auto pr-1" role="log" aria-live="polite" aria-label="Circuit breaker state transition log">
            {eventLog.length ? (
              eventLog
                .slice()
                .reverse()
                .map((e) => (
                  <div key={e.id} className="text-xs text-zinc-300/90">
                    <span className="text-zinc-500 mr-2 tabular-nums">
                      {new Date(e.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    {e.message}
                  </div>
                ))
            ) : (
              <div className="text-xs text-zinc-500/90">No transitions yet. Circuit is monitoring telemetry.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

