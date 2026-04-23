"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="bottom-center"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast font-body group-[.toaster]:bg-bg-raise group-[.toaster]:text-text group-[.toaster]:border group-[.toaster]:border-line-strong group-[.toaster]:rounded-lg group-[.toaster]:shadow-pop",
          description: "group-[.toast]:text-text-mute",
          actionButton:
            "group-[.toast]:bg-accent group-[.toast]:text-white group-[.toast]:rounded-md",
          cancelButton: "group-[.toast]:bg-bg-sunk group-[.toast]:text-text-mute",
        },
      }}
      {...props}
    />
  );
}
