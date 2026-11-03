import "server-only";

import { randomUUID } from "node:crypto";

import { getPresignedPutUrl, headObject } from "@/common/lib/storage/storage.service";

import { FORM_FILE_ACCEPT, FORM_FILE_EXTENSIONS, FORM_UPLOAD, FORM_UPLOAD_PREFIX } from "../constants/forms.constants";
import type { FormField, FormFileAnswer } from "../types/form.types";

type FileField = Extract<FormField, { type: "file" }>;

/** Every file of one submission attempt sits under this prefix, per field. */
export function draftPrefix(formId: string, draftId: string, fieldId: string): string {
  return `${FORM_UPLOAD_PREFIX}/${formId}/${draftId}/${fieldId}/`;
}

function acceptedTypes(field: FileField): readonly string[] {
  return FORM_FILE_ACCEPT[field.accept];
}

export type PresignFileOutcome =
  | { ok: true; key: string; uploadUrl: string }
  | { ok: false; reason: "bad_field" | "bad_type" | "too_large" };

/** Presigned PUT for one file of a file field; the caller checks access and limits. */
export async function presignFormFile(input: {
  formId: string;
  draftId: string;
  field: FormField | undefined;
  type: string;
  size: number;
}): Promise<PresignFileOutcome> {
  const { field } = input;
  if (!field || field.type !== "file") return { ok: false, reason: "bad_field" };
  if (!acceptedTypes(field).includes(input.type)) return { ok: false, reason: "bad_type" };
  if (input.size > field.maxSizeMb * 1024 * 1024) return { ok: false, reason: "too_large" };

  const extension = FORM_FILE_EXTENSIONS[input.type] ?? "bin";
  const key = `${draftPrefix(input.formId, input.draftId, field.id)}${randomUUID()}.${extension}`;
  const uploadUrl = await getPresignedPutUrl(key, {
    contentType: input.type,
    expiresInSeconds: FORM_UPLOAD.uploadUrlTtlSeconds,
  });
  return { ok: true, key, uploadUrl };
}

/**
 * A file answer is only accepted when its key sits under this draft's
 * prefix for that field (so nobody can claim another upload) and the
 * stored object has an allowed type and size.
 */
async function verifyFiles(formId: string, draftId: string, field: FileField, files: FormFileAnswer[]): Promise<boolean> {
  const prefix = draftPrefix(formId, draftId, field.id);
  const maxBytes = field.maxSizeMb * 1024 * 1024;
  for (const file of files) {
    if (!file.key.startsWith(prefix) || file.key.includes("..")) return false;
    const info = await headObject(file.key);
    if (!info || info.size === 0 || info.size > maxBytes) return false;
    if (!acceptedTypes(field).includes(info.contentType ?? "")) return false;
  }
  return true;
}

/** Field errors for every file answer that fails the checks; empty when all pass. */
export async function verifyFileAnswers(
  formId: string,
  draftId: string,
  fields: FormField[],
  answers: Record<string, unknown>,
): Promise<Record<string, string>> {
  const fieldErrors: Record<string, string> = {};
  for (const field of fields) {
    const value = answers[field.id];
    if (field.type !== "file" || !Array.isArray(value)) continue;
    if (!(await verifyFiles(formId, draftId, field, value as FormFileAnswer[]))) {
      fieldErrors[field.id] = "No pudimos verificar el archivo. Vuelve a adjuntarlo.";
    }
  }
  return fieldErrors;
}
