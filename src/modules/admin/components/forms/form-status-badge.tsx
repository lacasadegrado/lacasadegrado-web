import { Badge } from "@/common/components/ui/badge";
import type { FormStatus } from "@/common/lib/db/schema";
import { FORM_STATUS_LABELS } from "@/modules/forms/lib/constants/forms.constants";

/** Open is the only "live" state, so it is the only one in amber. */
export function FormStatusBadge({ status }: { status: FormStatus }) {
  return (
    <Badge
      variant={status === "closed" ? "outline" : "secondary"}
      className={status === "open" ? "bg-amber text-teal-950" : undefined}
    >
      {FORM_STATUS_LABELS[status]}
    </Badge>
  );
}
