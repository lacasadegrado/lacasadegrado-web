"use client";

import { CircleCheck } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";

import { preparePlanUploadAction, submitPlanPaymentAction } from "../../lib/actions/plan.action";
import { buildAnswersSchema } from "../../lib/schemas/form-answers.schema";
import type { FormField, FormFileAnswer, PrepareUpload } from "../../lib/types/form.types";
import type { PlanReceipt as PlanReceiptData } from "../../lib/types/public-form.types";
import { InstallmentPicker } from "../installment-picker/installment-picker";
import { PlanReceipt } from "../plan-receipt/plan-receipt";
import { FormFieldInput } from "../public-form/form-field-input";

type PlanPaymentFormProps = {
  token: string;
  fields: FormField[];
  priceCents: number;
  installments: number;
  reserved: number;
  eurToVes: number | null;
};

function firstErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return errors;
}

/** The next abono: how many parts, the reference and the proof. Nothing else is asked again. */
export function PlanPaymentForm({ token, fields, priceCents, installments, reserved, eurToVes }: PlanPaymentFormProps) {
  const [draftId] = useState(() => crypto.randomUUID());
  const [count, setCount] = useState(1);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<PlanReceiptData | null>(null);
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
  const prepareUpload = useCallback<PrepareUpload>((input) => preparePlanUploadAction({ token, ...input }), [token]);

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
      const result = await submitPlanPaymentAction({ token, draftId, installments: count, answers: values });
      if (result.ok) {
        setReceipt(result.receipt);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setMessage(result.message);
      if (result.fieldErrors) setErrors(result.fieldErrors);
    });
  }

  if (receipt) {
    return (
      <section aria-live="polite" className="space-y-5 rounded-lg border bg-card p-6">
        <CircleCheck aria-hidden="true" className="size-10 text-primary" />
        <div className="space-y-2">
          <h2 className="text-2xl">Recibimos tu abono</h2>
          <p className="text-muted-foreground">
            Vamos a verificarlo. Cuando lo confirmemos, aparece como confirmado en esta página.
          </p>
        </div>
        <PlanReceipt plan={receipt} showLink={false} />
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          Ver mi plan actualizado
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <InstallmentPicker
        id="field-installments"
        priceCents={priceCents}
        installments={installments}
        reserved={reserved}
        value={count}
        onChange={setCount}
        eurToVes={eurToVes}
        error={errors.installments}
      />
      {fields.map((field) => (
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
      {message ? (
        <Alert role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={submitting || uploading.size > 0}>
        {submitting ? "Enviando…" : uploading.size > 0 ? "Subiendo archivos…" : "Enviar abono"}
      </Button>
    </form>
  );
}
