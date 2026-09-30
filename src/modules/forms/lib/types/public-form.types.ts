import type { FormStatus } from "@/common/lib/db/schema";

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
  | { ok: true; packageName: string; priceCents: number; reference: string; email: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };
