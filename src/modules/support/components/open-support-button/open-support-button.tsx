"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/common/components/ui/button";

import { OPEN_SUPPORT_EVENT } from "../../lib/constants/support.constants";

/** Opens the help dialog in place of the floating "Ayuda" button. */
export function OpenSupportButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={() => window.dispatchEvent(new Event(OPEN_SUPPORT_EVENT))}
    >
      <CircleHelp aria-hidden="true" />
      Ayuda
    </Button>
  );
}
