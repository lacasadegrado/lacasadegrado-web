import type { z } from "zod";

import type { FORM_FIELD_TYPES, FORM_SYSTEM_FIELDS } from "../constants/forms.constants";
import type { formFieldSchema } from "../schemas/form-field.schema";

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];
export type FormSystemRole = keyof typeof FORM_SYSTEM_FIELDS;
export type FormField = z.infer<typeof formFieldSchema>;
export type FormFieldOf<T extends FormFieldType> = Extract<FormField, { type: T }>;

/** A file answer: the R2 key (server-only) and the name the person uploaded. */
export type FormFileAnswer = { key: string; name: string };

/** Asks the server for a presigned PUT for one file of one field. */
export type PrepareUpload = (input: {
  draftId: string;
  fieldId: string;
  name: string;
  type: string;
  size: number;
}) => Promise<{ ok: true; key: string; uploadUrl: string } | { ok: false; message: string }>;

/** One answer per field id; absent when an optional field was left empty. */
export type FormAnswerValue = string | number | string[] | FormFileAnswer[];
export type FormAnswers = Record<string, FormAnswerValue | undefined>;

/** What the package select needs; never more than the public page shows. */
export type FormPackageOption = {
  id: string;
  name: string;
  priceCents: number;
  /** Parts the price can be paid in; 1 = all at once. */
  installments: number;
};
