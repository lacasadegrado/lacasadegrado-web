import type { FormKind, FormStatus } from "@/common/lib/db/schema";

import type { FormField, FormPackageOption } from "./form.types";

/**
 * Everything the public page receives. No ids beyond the slug and the
 * package ids the select needs; nothing about other submissions.
 */
export type PublicForm = {
  slug: string;
  title: string;
  description: string | null;
  status: FormStatus;
  kind: FormKind;
  eventName: string;
  institution: string;
  /** YYYY-MM-DD */
  eventDate: string;
  fields: FormField[];
  packages: (FormPackageOption & { description: string | null })[];
};

export type PrepareFormUploadResult =
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; message: string };

export type SubmitFormResult =
  | { ok: true; receipt: SubmitReceipt }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/** What the success screen shows; each part is null when that field was left empty. */
export type SubmitReceipt = {
  kind: FormKind;
  packageName: string | null;
  priceCents: number | null;
  reference: string | null;
  email: string | null;
};
