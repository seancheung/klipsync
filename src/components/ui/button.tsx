import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-head text-[13px] font-medium leading-[1.2] [transition:background_120ms,border-color_120ms,color_120ms,transform_120ms] ease-crisp active:translate-y-[0.5px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "border border-accent bg-accent text-white hover:bg-accent-strong hover:border-accent-strong dark:text-[#0F0F14]",
        secondary:
          "border border-line-strong bg-bg-raise text-text hover:bg-bg-sunk hover:border-text-dim",
        ghost: "text-text-mute hover:bg-bg-sunk hover:text-text",
        accent:
          "border border-[color-mix(in_srgb,var(--c-accent)_35%,transparent)] bg-accent-soft text-accent-strong hover:border-accent",
        danger: "text-danger hover:bg-danger-soft",
        "danger-fill":
          "border border-danger bg-danger text-white hover:bg-[color-mix(in_srgb,var(--c-danger)_85%,#000)]",
      },
      size: {
        sm: "h-7 px-2.5 text-[12px]",
        default: "h-8 px-3",
        lg: "h-10 px-[18px] text-[14px]",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
