"use client";

import * as React from "react";
import { Globe2, KeyRound, Shield, Timer } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "./useSessionSimulation";
import { formatCountdown } from "./useSessionSimulation";

export function SessionTable({ sessions, now }: { sessions: Session[]; now: number }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Active Sessions</CardTitle>
          <p className="mt-1 text-sm text-zinc-400">
            Simulated RS256 JWTs with role, geo, and live 60-minute expiry / silent refresh.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-100">
          <Shield className="h-3.5 w-3.5" />
          TLS 1.3 Termination
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>JWT (RS256, truncated)</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="text-right">Expires In</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => {
              const secondsLeft = Math.max(0, Math.floor((s.expiresAt - now) / 1000));
              const critical = secondsLeft < 5 * 60;
              const warning = !critical && secondsLeft < 15 * 60;
              return (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                        <KeyRound className="h-4 w-4 text-cyan-200" />
                      </div>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold text-zinc-100">{s.user}</div>
                        <div className="text-[11px] text-zinc-500">kid={s.kid}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs text-xs text-zinc-300/90">
                    <code className="block truncate font-mono text-[11px]">{s.token}</code>
                  </TableCell>
                  <TableCell className="text-xs capitalize text-zinc-200/90">
                    {s.role}
                  </TableCell>
                  <TableCell>
                    <div className="inline-flex items-center gap-1 text-xs text-zinc-300/90">
                      <Globe2 className="h-3.5 w-3.5 text-emerald-300" />
                      {s.region}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-2 text-xs tabular-nums">
                      <Timer
                        className={
                          critical
                            ? "h-3.5 w-3.5 text-red-300"
                            : warning
                              ? "h-3.5 w-3.5 text-amber-300"
                              : "h-3.5 w-3.5 text-emerald-300"
                        }
                      />
                      <span
                        className={
                          critical
                            ? "text-red-300"
                            : warning
                              ? "text-amber-300"
                              : "text-emerald-300"
                        }
                      >
                        {formatCountdown(s.expiresAt, now)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!sessions.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-xs text-zinc-500">
                  No active sessions. Issue a new JWT using the login modal.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

