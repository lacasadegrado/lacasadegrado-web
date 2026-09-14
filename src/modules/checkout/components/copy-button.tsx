"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Button } from "@/common/components/ui/button";

type CopyButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
  /** Exactly what lands on the clipboard. */
  text: string;
  /** Idle label. */
  label: string;
  /** Label shown for two seconds after a successful copy. */
  copiedLabel: string;
  /** Screen-reader context, e.g. "Copiar teléfono". Defaults to the label. */
  ariaLabel?: string;
};

/**
 * Copies `text` and confirms in place. Venezuelan banking apps read a
 * pasted value (or a whole "Etiqueta: valor" block) and fill the field.
 */
export function CopyButton({ text, label, copiedLabel, ariaLabel, ...buttonProps }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-live="polite"
      {...buttonProps}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard unavailable (insecure context); the value stays visible next to the button.
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
