"use client";

import * as React from "react";

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

type Options = {
  errorThreshold: number; // avg error rate threshold for tripping
  openTicks: number; // how long OPEN remains before probing
  probeTicks: number; // how long HALF_OPEN probing lasts
};

const defaultOptions: Options = {
  errorThreshold: 0.028,
  openTicks: 8,
  probeTicks: 4,
};

export function useCircuitBreakerSimulation(
  avgErrorRate: number,
  options: Options = defaultOptions
) {
  const optsRef = React.useRef(options);

  const avgErrRef = React.useRef(avgErrorRate);

  React.useEffect(() => {
    optsRef.current = options;
  }, [options]);

  React.useEffect(() => {
    avgErrRef.current = avgErrorRate;
  }, [avgErrorRate]);

  type MachineState = {
    state: CircuitState;
    highErrorStreak: number;
    remainingTicks: number;
    probeSuccessCount: number;
    readiness: number;
    eventLog: Array<{ id: string; at: number; message: string }>;
  };

  const [machine, dispatch] = React.useReducer(
    (
      s: MachineState,
      action: { type: "TICK"; avgErrorRate: number; opts: Options }
    ) => {
      const opts = action.opts;
      const at = Date.now();
      const appendEvent = (next: MachineState, message: string, idSuffix: string) => ({
        ...next,
        eventLog: [
          ...next.eventLog,
          { id: `${at}-${idSuffix}`, at, message },
        ].slice(-60),
      });

      if (s.state === "CLOSED") {
        const nextStreak =
          action.avgErrorRate > opts.errorThreshold ? s.highErrorStreak + 1 : 0;
        const nextReadiness = clamp01(s.readiness + (0.003 - action.avgErrorRate) * 0.08);

        if (nextStreak >= 3) {
          return appendEvent(
            {
              ...s,
              state: "OPEN",
              highErrorStreak: 0,
              remainingTicks: opts.openTicks,
              probeSuccessCount: 0,
              readiness: 0.35,
            },
            "Circuit tripped: errors spiking. Routing traffic away.",
            "open"
          );
        }

        return {
          ...s,
          highErrorStreak: nextStreak,
          readiness: nextReadiness,
        };
      }

      if (s.state === "OPEN") {
        const nextRemaining = s.remainingTicks - 1;
        const duration = opts.openTicks;
        const nextReadiness = clamp01(0.25 + (1 - nextRemaining / duration) * 0.75);

        if (nextRemaining <= 0) {
          return appendEvent(
            {
              ...s,
              state: "HALF_OPEN",
              remainingTicks: opts.probeTicks,
              probeSuccessCount: 0,
              readiness: nextReadiness,
            },
            "Probing state: HALF_OPEN. Sending limited canary traffic.",
            "probe"
          );
        }

        return {
          ...s,
          remainingTicks: nextRemaining,
          readiness: nextReadiness,
        };
      }

      // HALF_OPEN
      const successChance = clamp01(0.84 - action.avgErrorRate * 10);
      const success = Math.random() < successChance;
      const nextProbeRemaining = s.remainingTicks - 1;
      const nextProbeSuccessCount = s.probeSuccessCount + (success ? 1 : 0);
      const nextReadiness = clamp01(s.readiness * 0.985 + (success ? 0.004 : 0.001));

      if (nextProbeRemaining <= 0) {
        if (nextProbeSuccessCount >= 2) {
          return appendEvent(
            {
              ...s,
              state: "CLOSED",
              highErrorStreak: 0,
              remainingTicks: opts.openTicks,
              probeSuccessCount: 0,
              readiness: 0.995,
            },
            "HALF_OPEN successful. Restoring full routing (CLOSED).",
            "close"
          );
        }

        return appendEvent(
          {
            ...s,
            state: "OPEN",
            remainingTicks: opts.openTicks,
            probeSuccessCount: 0,
            readiness: 0.4,
            highErrorStreak: 0,
          },
          "HALF_OPEN failed. Keeping circuit OPEN and rerouting.",
          "reopen"
        );
      }

      return {
        ...s,
        remainingTicks: nextProbeRemaining,
        probeSuccessCount: nextProbeSuccessCount,
        readiness: nextReadiness,
      };
    },
    {
      state: "CLOSED",
      highErrorStreak: 0,
      remainingTicks: options.openTicks,
      probeSuccessCount: 0,
      readiness: 0.98,
      eventLog: [],
    } satisfies MachineState
  );

  React.useEffect(() => {
    const t = window.setInterval(() => {
      dispatch({
        type: "TICK",
        avgErrorRate: avgErrRef.current,
        opts: optsRef.current,
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  const phaseProgress = React.useMemo(() => {
    if (machine.state === "CLOSED") return 1;
    const duration = machine.state === "OPEN" ? options.openTicks : options.probeTicks;
    return clamp01((duration - machine.remainingTicks) / duration);
  }, [machine.state, machine.remainingTicks, options.openTicks, options.probeTicks]);

  return {
    state: machine.state,
    readiness: machine.readiness,
    phaseProgress,
    eventLog: machine.eventLog.slice(-40),
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

