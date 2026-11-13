import type { FormKind, FormStatus } from "@/common/lib/db/schema";
import type { FormTexts } from "@/modules/forms/lib/schemas/form-texts.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";

import type { RosterOption } from "./roster.types";

export type AdminPackage = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  /** EUR cents. */
  priceCents: number;
  /** Parts the price can be paid in (abonos); 1 = at once. */
  installments: number;
  isActive: boolean;
  /** Submissions that chose it; a package with any cannot be deleted. */
  submissionCount: number;
};

export type AdminFormSummary = {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
  kind: FormKind;
  updatedAt: Date;
  submissionCount: number;
};

/** What the builder edits. `fields` already passed `formFieldsSchema`. */
export type AdminFormDetail = AdminFormSummary & {
  eventId: string;
  eventName: string;
  description: string | null;
  fields: FormField[];
  version: number;
  /** Active packages of the event: publishing needs at least one. */
  activePackageCount: number;
  /** People list the form prefills from, and the event's lists to choose from. */
  rosterId: string | null;
  rosters: RosterOption[];
  /** Only the texts the admin reworded. */
  texts: FormTexts;
};

/** Result of saving the builder; issues point at a field index. */
export type SaveFormResult =
  | { ok: true; message: string; version: number }
  | { ok: false; message: string; issues?: { path: (string | number)[]; message: string }[] };
