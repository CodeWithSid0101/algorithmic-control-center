"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Activity,
  Brain,
  LayoutDashboard,
  Shield,
  Route,
  Server,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { label: "Gateway", href: "/", icon: LayoutDashboard },
  { label: "Traffic Router", href: "/traffic", icon: Route },
  { label: "AI Orchestration", href: "/orchestration", icon: Brain },
  { label: "Governance & Security", href: "/governance", icon: Shield },
  { label: "Observability & Resilience", href: "/observability", icon: Activity },
  { label: "Cloud Ledger (Raft)", href: "/ledger", icon: Server },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(1200px_800px_at_20%_-10%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(900px_600px_at_80%_0%,rgba(167,139,250,0.16),transparent_50%),radial-gradient(700px_500px_at_50%_110%,rgba(34,197,94,0.08),transparent_55%)]" />

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-0 h-screen w-[290px] border-r border-white/10">
          <div className="flex h-full flex-col p-5">
            <div className="mb-5">
              <Link href="/" className="group flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-2xl bg-white/5 ring-1 ring-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] backdrop-blur-xl overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.65),transparent_55%),radial-gradient(circle_at_80%_60%,rgba(167,139,250,0.5),transparent_60%)]" />
                </div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold tracking-wide text-zinc-100">
                    Algorithmic Control
                  </div>
                  <div className="text-xs text-zinc-400">Multi-Cloud Zero-Downtime</div>
                </div>
              </Link>
            </div>

            <Card className="flex-1 bg-white/3 p-2 backdrop-blur-xl border-white/10">
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                        "ring-1 ring-transparent",
                        active ? "bg-white/10 text-zinc-50 ring-cyan-300/30" : "text-zinc-300 hover:bg-white/5 hover:text-zinc-50"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5 opacity-90" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </Card>

            <div className="mt-4 text-xs text-zinc-400">
              <div className="rounded-xl border border-white/10 bg-white/3 backdrop-blur-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300">Zero-Downtime</span>
                  <span className="font-semibold text-emerald-200">99.999%</span>
                </div>
                <div className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
                  Live control plane simulations with mocked algorithms and real-time telemetry.
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-h-screen flex-1 p-6">
          <div className="mx-auto w-full max-w-[1220px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

