import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-[3px] font-head text-[12px] font-medium leading-[1.5]",
  {
    variants: {
      variant: {
        pinned: "bg-accent-soft text-accent-strong [&>.b-dot]:bg-accent",
        confirmed: "bg-success-soft text-success [&>.b-dot]:bg-success",
        progress: "bg-warn-soft text-warn [&>.b-dot]:bg-warn",
        rejected: "bg-danger-soft text-danger [&>.b-dot]:bg-danger",
        pending: "bg-peach-soft text-peach [&>.b-dot]:bg-peach",
        info: "bg-info-soft text-info [&>.b-dot]:bg-info",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** 显示前置小圆点（默认 true） */
  dot?: boolean;
}

function Badge({ className, variant, dot = true, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="b-dot h-1.5 w-1.5 rounded-full" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
