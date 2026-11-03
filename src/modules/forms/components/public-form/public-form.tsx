"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { formatEur } from "@/common/lib/utils/money.util";
import { LEGAL_PATHS } from "@/modules/legal/lib/constants/legal.constants";

import { prepareFormUploadAction, submitFormAction } from "../../lib/actions/public-form.action";
import { FORM_HONEYPOT_FIELD } from "../../lib/constants/forms.constants";
import { buildAnswersSchema } from "../../lib/schemas/form-answers.schema";
import type { FormFileAnswer, PrepareUpload } from "../../lib/types/form.types";
import type { PublicForm as PublicFormData, SubmitReceipt } from "../../lib/types/public-form.types";
import { visibleFieldIds } from "../../lib/utils/form-conditions.util";
import { InstallmentPicker } from "../installment-picker/installment-picker";
import { PlanReceipt } from "../plan-receipt/plan-receipt";
import { FormFieldInput } from "./form-field-input";


function firstErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

/** Moves focus to the first question with an error, in form order. */
function focusFirstError(fieldIds: string[], errors: Record<string, string>) {
  const first = fieldIds.find((id) => errors[id]);
  if (!first) return;
  const element =
    document.getElementById(`field-${first}`) ??
    document.querySelector<HTMLElement>(`[id^="field-${first}-"]`);
  element?.focus();
  element?.scrollIntoView({ block: "center", behavior: "smooth" });
}

/**
 * Validates with the same schema the server uses, for instant feedback,
 * then submits. The server's answer is the one that counts. A fresh
 * `draftId` per attempt keeps each submission's files in their own folder.
 */
export function PublicForm({ form }: { form: PublicFormData }) {
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [values, setValues] = useState<Record<string, unknown>>({});
  // Parts of the package paid now; back to one whenever the package changes.
  const [installments, setInstallments] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Set<string>>(() => new Set());
  const [honeypot, setHoneypot] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<SubmitReceipt | null>(null);
  const [submitting, startSubmitting] = useTransition();
  // Conditional questions appear as soon as their trigger option is picked.
  const visible = visibleFieldIds(form.fields, values);
  const fieldIds = form.fields
    .filter((field) => visible.has(field.id))
    .flatMap((field) => (field.system === "package" ? [field.id, "installments"] : [field.id]));
  // A hidden file field that was mid-upload must not block sending.
  const busy = [...uploading].some((fieldId) => visible.has(fieldId));

  const setValue = useCallback((fieldId: string, value: unknown) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    if (fieldId === "package") setInstallments(1);
    setErrors((current) => {
      if (!current[fieldId]) return current;
      const next = { ...current };
      delete next[fieldId];
      return next;
    });
  }, []);

  const setFiles = useCallback((fieldId: string, files: FormFileAnswer[]) => {
    setValues((current) => {
      const previous = current[fieldId] as FormFileAnswer[] | undefined;
      if (JSON.stringify(previous ?? []) === JSON.stringify(files)) return current;
      return { ...current, [fieldId]: files };
    });
    if (files.length > 0) {
      setErrors((current) => {
        if (!current[fieldId]) return current;
        const next = { ...current };
        delete next[fieldId];
        return next;
      });
    }
  }, []);

  const prepareUpload = useCallback<PrepareUpload>(
    (input) => prepareFormUploadAction({ slug: form.slug, ...input }),
    [form.slug],
  );
  const chosenPackage = form.packages.find((option) => option.id === values.package);

  const setFieldUploading = useCallback((fieldId: string, busy: boolean) => {
    setUploading((current) => {
      if (current.has(fieldId) === busy) return current;
      const next = new Set(current);
      if (busy) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  }, []);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (busy) {
      setMessage("Espera a que terminen de subir los archivos.");
      return;
    }

    const local = buildAnswersSchema(form.fields, form.packages).safeParse(values);
    if (!local.success) {
      const next = firstErrors(local.error.issues);
      setErrors(next);
      setMessage("Revisa los campos marcados.");
      focusFirstError(fieldIds, next);
      return;
    }

    startSubmitting(async () => {
      const result = await submitFormAction({
        slug: form.slug,
        draftId,
        answers: values,
        installments: chosenPackage ? installments : undefined,
        honeypot,
      });
      if (result.ok) {
        setReceipt(result.receipt);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setMessage(result.message);
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
        focusFirstError(fieldIds, result.fieldErrors);
      }
    });
  }

  function startOver() {
    setDraftId(crypto.randomUUID());
    setValues({});
    setInstallments(1);
    setErrors({});
    setUploading(new Set());
    setMessage(null);
    setReceipt(null);
  }

  if (receipt) {
    const isPayment = receipt.kind === "package_payment";
    return (
      <section aria-live="polite" className="space-y-5 rounded-lg border bg-card p-6">
        <CircleCheck aria-hidden="true" className="size-10 text-primary" />
        <div className="space-y-2">
          <h2 className="text-2xl">{isPayment ? "Recibimos tu comprobante" : "Recibimos tu respuesta"}</h2>
          <p className="text-muted-foreground">
            {isPayment ? "Vamos a verificar tu pago. " : ""}Si falta algún dato te escribimos
            {receipt.email ? (
              <>
                {" "}a <strong className="text-foreground">{receipt.email}</strong>
              </>
            ) : (
              " por los datos de contacto que dejaste"
            )}
            .
          </p>
        </div>
        {receipt.plan ? <PlanReceipt plan={receipt.plan} showLink /> : null}
        {!receipt.plan && (receipt.packageName || receipt.reference) ? (
          <dl className="grid gap-x-6 gap-y-1 rounded-md bg-muted p-4 text-sm sm:grid-cols-[auto_1fr]">
            {receipt.packageName ? (
              <>
                <dt className="text-muted-foreground">Paquete</dt>
                <dd className="font-medium">
                  {receipt.packageName}
                  {receipt.priceCents !== null ? ` · ${formatEur(receipt.priceCents)}` : ""}
                </dd>
              </>
            ) : null}
            {receipt.reference ? (
              <>
                <dt className="text-muted-foreground">Referencia</dt>
                <dd className="font-medium">{receipt.reference}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
        <Button type="button" variant="outline" onClick={startOver}>
          Enviar otra respuesta
        </Button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      {/* Only bots see and fill this; people never reach it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={FORM_HONEYPOT_FIELD}>No llenes este campo</label>
        <input
          id={FORM_HONEYPOT_FIELD}
          name={FORM_HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      {form.fields.map((field) => {
        if (!visible.has(field.id)) return null;
        const input = (
          <FormFieldInput
            key={`${draftId}-${field.id}`}
            field={field}
            value={values[field.id]}
            error={errors[field.id]}
            prepareUpload={prepareUpload}
            draftId={draftId}
            packages={form.packages}
            onValue={setValue}
            onFiles={setFiles}
            onUploadingChange={setFieldUploading}
          />
        );
        const picker =
          field.system === "package" && chosenPackage && chosenPackage.installments > 1 ? (
            <InstallmentPicker
              key={`${draftId}-installments`}
              id="field-installments"
              priceCents={chosenPackage.priceCents}
              installments={chosenPackage.installments}
              reserved={0}
              value={installments}
              onChange={(next) => {
                setInstallments(next);
                setErrors((current) => {
                  if (!current.installments) return current;
                  const rest = { ...current };
                  delete rest.installments;
                  return rest;
                });
              }}
              eurToVes={form.eurToVes}
              error={errors.installments}
            />
          ) : null;
        // Indented under the question that revealed it.
        const block = field.showIf ? (
          <div key={`${draftId}-${field.id}`} className="border-l-2 border-primary/40 pl-4">
            {input}
          </div>
        ) : (
          input
        );
        return picker ? [block, picker] : block;
      })}

      {message ? (
        <Alert role="alert">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button type="submit" size="lg" disabled={submitting || busy}>
          {submitting
            ? "Enviando…"
            : busy
              ? "Subiendo archivos…"
              : form.kind === "package_payment"
                ? "Enviar comprobante"
                : "Enviar respuesta"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Los campos con <span aria-hidden="true">*</span>
          <span className="sr-only">asterisco</span> son obligatorios. Usamos tus datos solo para
          {form.kind === "package_payment" ? " verificar tu pago" : " gestionar tu solicitud"}, como explica la{" "}
          <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-4" target="_blank">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
