"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/common/components/ui/button";

type CopyAllButtonProps = {
  /** Multi-line text, one "Etiqueta: valor" per line. */
  text: string;
};

/**
 * One tap copies every value the bank app asks for. Venezuelan banking
 * apps read a pasted block like this and fill destination, id and amount
 * in one go.
 */
export function CopyAllButton({ text }: CopyAllButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      size="lg"
      className="h-11 w-full"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard unavailable (insecure context); values remain visible above.
        }
      }}
    >
      <Copy aria-hidden="true" />
      {copied ? "Datos copiados" : "Copiar todos los datos"}
    </Button>
  );
}
