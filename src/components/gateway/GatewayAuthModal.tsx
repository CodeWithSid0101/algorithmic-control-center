"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogin: (payload: { user: string; role: "admin" | "operator" | "auditor"; region: "US" | "EU" | "IN" | "APAC" }) => void;
};

const roles: Array<{ id: "admin" | "operator" | "auditor"; label: string }> = [
  { id: "admin", label: "SRE Admin" },
  { id: "operator", label: "Cloud Operator" },
  { id: "auditor", label: "Security Auditor" },
];

const regions: Array<{ id: "US" | "EU" | "IN" | "APAC"; label: string }> = [
  { id: "US", label: "US" },
  { id: "EU", label: "EU" },
  { id: "IN", label: "India" },
  { id: "APAC", label: "APAC" },
];

export function GatewayAuthModal({ open, onClose, onLogin }: Props) {
  const [user, setUser] = React.useState("sre@corp");
  const [role, setRole] = React.useState<"admin" | "operator" | "auditor">("admin");
  const [region, setRegion] = React.useState<"US" | "EU" | "IN" | "APAC">("IN");
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);

  // Focus management: trap focus in modal when open
  React.useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ user, role, region });
    onClose();
  };

  // Keyboard: close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 p-6 shadow-[0_0_80px_rgba(15,23,42,0.9)]"
            role="alertdialog"
            aria-labelledby="auth-modal-title"
            aria-describedby="auth-modal-description"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-400/40">
                  <KeyRound className="h-5 w-5 text-cyan-200" aria-hidden="true" />
                </div>
                <div>
                  <div id="auth-modal-title" className="text-sm font-semibold tracking-wide text-zinc-100">
                    OAuth 2.0 / JWT Login
                  </div>
                  <div id="auth-modal-description" className="text-xs text-zinc-400">
                    Simulated RS256 token issuance via cloud identity provider.
                  </div>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="rounded-full p-1 text-zinc-500 hover:bg-white/10 hover:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/60"
                onClick={onClose}
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="user-input" className="text-xs font-medium text-zinc-400">
                  User Principal (sub)
                </label>
                <input
                  id="user-input"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  className="w-full rounded-2xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-transparent focus:ring-cyan-400/60"
                  placeholder="you@corp"
                  aria-label="User principal (email or username)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-zinc-400">Role (RBAC)</legend>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Role selection">
                      {roles.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRole(r.id)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-950",
                            role === r.id
                              ? "border-cyan-400/70 bg-cyan-500/10 text-cyan-100 focus:ring-cyan-400/60"
                              : "border-white/10 bg-white/5 text-zinc-300 hover:border-cyan-400/60 hover:text-cyan-100 focus:ring-cyan-400/60"
                          )}
                          aria-pressed={role === r.id}
                          aria-label={`Select ${r.label} role`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
                <div className="space-y-1.5">
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-zinc-400">Region (Geo)</legend>
                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Region selection">
                      {regions.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRegion(r.id)}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-950",
                            region === r.id
                              ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-100 focus:ring-emerald-400/60"
                              : "border-white/10 bg-white/5 text-zinc-300 hover:border-emerald-400/60 hover:text-emerald-100 focus:ring-emerald-400/60"
                          )}
                          aria-pressed={region === r.id}
                          aria-label={`Select ${r.label} region`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-zinc-400">
                <div className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                  <span>
                    Scopes: <span className="text-zinc-200">openid profile offline_access</span>
                  </span>
                </div>
                <span className="text-zinc-500">Response type: code + PKCE</span>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button size="sm" type="submit">
                  Issue JWT
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

