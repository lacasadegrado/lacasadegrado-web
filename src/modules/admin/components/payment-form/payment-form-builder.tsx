"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { FORM_LIMITS } from "@/modules/forms/lib/constants/forms.constants";
import { formFieldsSchema, validatePlanPaymentFields } from "@/modules/forms/lib/schemas/form-field.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import { createField, type AddableFieldType } from "@/modules/forms/lib/utils/form-fields.util";

import { savePlanPaymentFormAction } from "../../lib/actions/plan-payment-form.action";
import { AddFieldMenu } from "../forms/form-builder/add-field-menu";
import { FieldCard } from "../forms/form-builder/field-card";

type Issue = { path: (string | number)[]; message: string };

/** Per-field messages by index, and the ones about the whole form. */
function groupIssues(issues: Issue[]) {
  const byField = new Map<number, string[]>();
  const general: string[] = [];
  for (const issue of issues) {
    const index = typeof issue.path[0] === "number" ? issue.path[0] : undefined;
    const target = index === undefined ? general : (byField.get(index) ?? []);
    if (!target.includes(issue.message)) target.push(issue.message);
    if (index !== undefined) byField.set(index, target);
  }
  return { byField, general };
}

/**
 * Configuración › Formulario de pagos: the questions of every installment
 * in "Pagos". The same field cards as the event forms; edited locally and
 * saved in one go, and the server checks the same rules again.
 */
export function PaymentFormBuilder({ initialFields }: { initialFields: FormField[] }) {
  const router = useRouter();
  const id = useId();
  const [saved, setSaved] = useState<FormField[]>(initialFields);
  const [fields, setFieldsState] = useState<FormField[]>(initialFields);
  const [resetKey, setResetKey] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [issues, setIssues] = useState<Issue[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const dirty = JSON.stringify(fields) !== JSON.stringify(saved);
  const { byField, general } = groupIssues(issues);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setFields(update: (current: FormField[]) => FormField[]) {
    setFieldsState(update);
    setMessage(null);
  }

  function toggleExpanded(fieldId: string, open: boolean) {
    setExpanded((current) => {
      const next = new Set(current);
      if (open) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  }

  function addField(type: AddableFieldType) {
    const field = createField(type);
    setFields((current) => [...current, field]);
    toggleExpanded(field.id, true);
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const next = [...current];
      const target = index + direction;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setIssues([]);
  }

  function save() {
    setMessage(null);
    const local = formFieldsSchema.safeParse(fields);
    const localIssues: Issue[] = local.success
      ? validatePlanPaymentFields(local.data)
      : local.error.issues.map((issue) => ({
          path: issue.path.map((part) => (typeof part === "number" ? part : String(part))),
          message: issue.message,
        }));
    if (localIssues.length > 0) {
      setIssues(localIssues);
      setExpanded((current) => {
        const next = new Set(current);
        for (const issue of localIssues) {
          if (typeof issue.path[0] === "number") next.add(fields[issue.path[0]]?.id ?? "");
        }
        return next;
      });
      setMessage({ ok: false, text: "Hay campos por corregir antes de guardar." });
      return;
    }

    startSaving(async () => {
      const result = await savePlanPaymentFormAction({ fields });
      if (result.ok) {
        setSaved(fields);
        setIssues([]);
        setMessage({ ok: true, text: result.message });
        router.refresh();
      } else {
        setIssues(result.issues ?? []);
        setMessage({ ok: false, text: result.message });
      }
    });
  }

  function discard() {
    setFieldsState(saved);
    setIssues([]);
    setMessage(null);
    setResetKey((key) => key + 1);
  }

  return (
    <div className="space-y-6 pb-24">
      <section aria-labelledby={`${id}-fields`} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id={`${id}-fields`} className="text-lg font-semibold">
              Preguntas
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              La referencia y el comprobante son del sistema: siempre están, pero puedes cambiarles el texto, el orden y
              si son obligatorios. Arriba de estas preguntas la persona ya eligió el método de pago y cuántas cuotas
              paga, así que no hace falta preguntarlo.
            </p>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {fields.length} de {FORM_LIMITS.maxFields}
          </p>
        </div>

        {general.length > 0 ? (
          <Alert role="alert">
            <AlertDescription>
              <ul className="list-disc pl-5">
                {general.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <ol key={resetKey} className="space-y-2">
          {fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              previousFields={fields.slice(0, index)}
              rosterColumns={null}
              personNameAllowed={false}
              index={index}
              total={fields.length}
              expanded={expanded.has(field.id)}
              errors={byField.get(index) ?? []}
              onExpandedChange={(open) => toggleExpanded(field.id, open)}
              onChange={(next) =>
                setFields((current) =>
                  current.map((item, i) => {
                    if (i === index) return next;
                    // Conditions on this question keep only options it still has.
                    if (item.showIf?.fieldId === next.id && "options" in next) {
                      const values = item.showIf.values.filter((value) => next.options.includes(value));
                      if (values.length !== item.showIf.values.length) {
                        return { ...item, showIf: { ...item.showIf, values } } as FormField;
                      }
                    }
                    return item;
                  }),
                )
              }
              onMove={(direction) => moveField(index, direction)}
              onRemove={() => {
                // Questions that depended on this one become always visible.
                setFields((current) =>
                  current
                    .filter((_, i) => i !== index)
                    .map((item) =>
                      item.showIf?.fieldId === field.id ? ({ ...item, showIf: undefined } as FormField) : item,
                    ),
                );
                setIssues([]);
              }}
            />
          ))}
        </ol>

        <AddFieldMenu disabled={fields.length >= FORM_LIMITS.maxFields} onAdd={addField} />
      </section>

      <div
        role="region"
        aria-label="Guardar cambios"
        className="sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-[0_2px_12px_rgba(19,80,101,0.12)]"
      >
        <p
          className={message && !message.ok ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"}
          role={message ? (message.ok ? "status" : "alert") : undefined}
        >
          {message ? message.text : dirty ? "Tienes cambios sin guardar." : "Todo está guardado."}
        </p>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="outline" onClick={discard} disabled={!dirty || saving}>
            Descartar
          </Button>
          <Button type="button" onClick={save} disabled={!dirty || saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
