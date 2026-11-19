"use client";

import { Download } from "lucide-react";

import { Button } from "@/common/components/ui/button";

/** The browser's print dialog, where phones and computers offer "Guardar como PDF". */
export function PrintReceiptButton() {
  return (
    <Button type="button" size="lg" className="h-12 w-full text-base sm:w-auto" onClick={() => window.print()}>
      <Download aria-hidden="true" />
      Descargar recibo (PDF)
    </Button>
  );
}
