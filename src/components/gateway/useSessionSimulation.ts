"use client";

import * as React from "react";

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

const SESSION_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const SILENT_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // refresh when < 10 minutes left

function randomHex(len: number) {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function base64UrlEncodeJson(input: Record<string, unknown>) {
  const json = JSON.stringify(input);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeJwt(user: string, role: Session["role"], region: Session["region"]): Session {
  const header = base64UrlEncodeJson({
    alg: "RS256",
    typ: "JWT",
    kid: `kid-${randomHex(6)}`,
  });

  const now = Date.now();
  const payload = base64UrlEncodeJson({
    sub: user,
    role,
    region,
    iss: "https://auth.algorithmic-control",
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + SESSION_DURATION_MS) / 1000),
  });

  const signature = randomHex(64); // mock RS256 signature fragment
  const token = `${header}.${payload}.${signature.slice(0, 24)}…${signature.slice(-8)}`;

  const kid = `kid-${signature.slice(0, 8)}`;

  return {
    id: `${now}-${randomHex(4)}`,
    user,
    role,
    region,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_MS,
    token,
    kid,
  };
}

export function useSessionSimulation() {
  // Important: keep initial SSR markup deterministic (no Date.now / Math.random in initial render)
  // We seed sessions only after mount to avoid hydration mismatches.
  const [sessions, setSessions] = React.useState<Session[]>([]);
  const [clock, setClock] = React.useState(0);

  React.useEffect(() => {
    const now = Date.now();
    setClock(now);
    setSessions([
      makeJwt("sre@corp", "admin", "US"),
      makeJwt("ops@corp", "operator", "IN"),
      makeJwt("audit@corp", "auditor", "EU"),
    ]);
  }, []);

  React.useEffect(() => {
    const t = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (!clock) return;
    setSessions((prev) => {
      const now = clock;
      const refreshed: Session[] = [];
      for (const s of prev) {
        if (s.expiresAt <= now) continue;
        const timeLeft = s.expiresAt - now;
        if (timeLeft < SILENT_REFRESH_THRESHOLD_MS) {
          // silent refresh: re-issue token with new exp but same identity + role + region
          const refreshedSession = makeJwt(s.user, s.role, s.region);
          refreshed.push(refreshedSession);
        } else {
          refreshed.push(s);
        }
      }
      return refreshed;
    });
  }, [clock]);

  const createSession = React.useCallback(
    (user: string, role: Session["role"], region: Session["region"]) => {
      setSessions((prev) => [...prev, makeJwt(user, role, region)]);
    },
    []
  );

  return {
    sessions,
    clock,
    createSession,
  };
}

export function formatCountdown(expiresAt: number, now: number) {
  const delta = Math.max(0, expiresAt - now);
  const totalSeconds = Math.floor(delta / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

