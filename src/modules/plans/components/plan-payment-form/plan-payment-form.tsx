"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import type { PlanPaymentMethod } from "@/common/lib/db/schema";
import { FormFieldInput } from "@/modules/forms/components/public-form/form-field-input";
import { buildAnswersSchema } from "@/modules/forms/lib/schemas/form-answers.schema";
import type { FormField, FormFileAnswer, PrepareUpload } from "@/modules/forms/lib/types/form.types";
import { visibleFieldIds } from "@/modules/forms/lib/utils/form-conditions.util";

import { preparePlanUploadAction, submitPlanPaymentAction } from "../../lib/actions/plans.action";
import { PLANS_PATHS } from "../../lib/constants/plans.constants";

type PlanPaymentFormProps = {
  planId: string;
  fields: FormField[];
  /** Chosen in step 1. */
  count: number;
  /** Chosen in step 2. */
  method: PlanPaymentMethod;
};

function firstErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return errors;
}

/**
 * Step 4 of "Pagar": the admin's payment questions (reference, proof and
 * any extra). Sent, the person lands on the package with the confirmation.
 */
export function PlanPaymentForm({ planId, fields, count, method }: PlanPaymentFormProps) {
  const router = useRouter();
  const [draftId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, startSubmitting] = useTransition();

  const setValue = useCallback((fieldId: string, value: unknown) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }, []);
  const setFiles = useCallback((fieldId: string, files: FormFileAnswer[]) => {
    setValues((current) => {
      if (JSON.stringify(current[fieldId] ?? []) === JSON.stringify(files)) return current;
      return { ...current, [fieldId]: files };
    });
  }, []);
  const setFieldUploading = useCallback((fieldId: string, busy: boolean) => {
    setUploading((current) => {
      if (current.has(fieldId) === busy) return current;
      const next = new Set(current);
      if (busy) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  }, []);
  const visible = visibleFieldIds(fields, values);
  const prepareUpload = useCallback<PrepareUpload>((input) => preparePlanUploadAction({ planId, ...input }), [planId]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (uploading.size > 0) {
      setMessage("Espera a que terminen de subir los archivos.");
      return;
    }
    const local = buildAnswersSchema(fields, []).safeParse(values);
    if (!local.success) {
      setErrors(firstErrors(local.error.issues));
      setMessage("Revisa los campos marcados.");
      return;
    }
    startSubmitting(async () => {
      const result = await submitPlanPaymentAction({ planId, draftId, installments: count, method, answers: values });
      if (result.ok) {
        router.push(PLANS_PATHS.plan(planId, true));
        return;
      }
      setMessage(result.message);
      if (result.fieldErrors) setErrors(result.fieldErrors);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      {fields
        .filter((field) => visible.has(field.id))
        .map((field) => (
          <FormFieldInput
            key={field.id}
            field={field}
            value={values[field.id]}
            error={errors[field.id]}
            prepareUpload={prepareUpload}
            draftId={draftId}
            packages={[]}
            onValue={setValue}
            onFiles={setFiles}
            onUploadingChange={setFieldUploading}
          />
        ))}
      {errors.installments || errors.method ? (
        <Alert role="alert">
          <AlertDescription>{errors.installments ?? errors.method}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={submitting || uploading.size > 0}>
        {submitting ? "Enviando…" : uploading.size > 0 ? "Subiendo archivos…" : "Enviar pago"}
      </Button>
    </form>
  );
}
