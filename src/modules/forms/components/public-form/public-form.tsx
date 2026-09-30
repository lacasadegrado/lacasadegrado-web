"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { formatEur } from "@/common/lib/utils/money.util";
import { LEGAL_PATHS } from "@/modules/legal/lib/constants/legal.constants";

import { submitFormAction } from "../../lib/actions/public-form.action";
import { FORM_HONEYPOT_FIELD } from "../../lib/constants/forms.constants";
import { buildAnswersSchema } from "../../lib/schemas/form-answers.schema";
import type { FormFileAnswer } from "../../lib/types/form.types";
import type { PublicForm as PublicFormData } from "../../lib/types/public-form.types";
import { FormFieldInput } from "./form-field-input";

type Receipt = { packageName: string; priceCents: number; reference: string; email: string };

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Set<string>>(() => new Set());
  const [honeypot, setHoneypot] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [submitting, startSubmitting] = useTransition();
  const fieldIds = form.fields.map((field) => field.id);

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
    if (uploading.size > 0) {
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
      const result = await submitFormAction({ slug: form.slug, draftId, answers: values, honeypot });
      if (result.ok) {
        setReceipt(result);
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
    setErrors({});
    setUploading(new Set());
    setMessage(null);
    setReceipt(null);
  }

  if (receipt) {
    return (
      <section aria-live="polite" className="space-y-5 rounded-lg border bg-card p-6">
        <CircleCheck aria-hidden="true" className="size-10 text-primary" />
        <div className="space-y-2">
          <h2 className="text-2xl">Recibimos tu comprobante</h2>
          <p className="text-muted-foreground">
            Vamos a verificar tu pago. Si falta algún dato te escribimos
            {receipt.email ? (
              <>
                {" "}a <strong className="text-foreground">{receipt.email}</strong>
              </>
            ) : null}
            .
          </p>
        </div>
        {receipt.packageName ? (
          <dl className="grid gap-x-6 gap-y-1 rounded-md bg-muted p-4 text-sm sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">Paquete</dt>
            <dd className="font-medium">
              {receipt.packageName} · {formatEur(receipt.priceCents)}
            </dd>
            <dt className="text-muted-foreground">Referencia</dt>
            <dd className="font-medium">{receipt.reference}</dd>
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

      {form.fields.map((field) => (
        <FormFieldInput
          key={`${draftId}-${field.id}`}
          field={field}
          value={values[field.id]}
          error={errors[field.id]}
          slug={form.slug}
          draftId={draftId}
          packages={form.packages}
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

      <div className="flex flex-wrap items-center gap-3 border-t pt-6">
        <Button type="submit" size="lg" disabled={submitting || uploading.size > 0}>
          {submitting ? "Enviando…" : uploading.size > 0 ? "Subiendo archivos…" : "Enviar comprobante"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Los campos con <span aria-hidden="true">*</span>
          <span className="sr-only">asterisco</span> son obligatorios. Usamos tus datos solo para
          verificar tu pago, como explica la{" "}
          <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-4" target="_blank">
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </form>
  );
}
