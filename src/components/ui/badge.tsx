import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "success" | "danger" | "warning" | "neutral";

const variantStyles: Record<Variant, string> = {
  success: "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20",
  danger: "bg-red-500/10 text-red-200 ring-red-500/20",
  warning: "bg-amber-500/10 text-amber-200 ring-amber-500/20",
  neutral: "bg-white/5 text-zinc-200 ring-white/10",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

