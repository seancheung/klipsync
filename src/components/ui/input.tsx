import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex w-full rounded-md border border-line-strong bg-bg-raise px-3 py-[9px] text-sm text-text outline-none [transition:border-color_120ms,box-shadow_120ms] ease-crisp placeholder:text-text-dim hover:border-text-mute focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_var(--c-accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:shadow-[0_0_0_3px_var(--c-danger-soft)]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
