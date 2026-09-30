import type { FormStatus } from "@/common/lib/db/schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";

export type AdminPackage = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  /** EUR cents. */
  priceCents: number;
  isActive: boolean;
  /** Submissions that chose it; a package with any cannot be deleted. */
  submissionCount: number;
};

export type AdminFormSummary = {
  id: string;
  title: string;
  slug: string;
  status: FormStatus;
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
};

/** Result of saving the builder; issues point at a field index. */
export type SaveFormResult =
  | { ok: true; message: string; version: number }
  | { ok: false; message: string; issues?: { path: (string | number)[]; message: string }[] };
