import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 disabled:pointer-events-none disabled:opacity-50 ring-1 ring-inset ring-white/10 bg-white/5 hover:bg-white/10",
  {
    variants: {
      variant: {
        default: "bg-white/5 hover:bg-white/10",
        secondary: "bg-white/10 hover:bg-white/15",
        ghost: "bg-transparent hover:bg-white/10 ring-white/10",
        outline: "bg-transparent hover:bg-white/10 ring-white/15",
        danger: "bg-red-500/10 hover:bg-red-500/15 ring-red-500/20",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

