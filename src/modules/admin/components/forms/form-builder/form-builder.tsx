"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { Textarea } from "@/common/components/ui/textarea";
import { FORM_LIMITS, ROSTER_NAME_COLUMN } from "@/modules/forms/lib/constants/forms.constants";
import { formFieldsSchema, validateFieldsForKind } from "@/modules/forms/lib/schemas/form-field.schema";
import type { FormTexts } from "@/modules/forms/lib/schemas/form-texts.schema";
import type { FormField } from "@/modules/forms/lib/types/form.types";
import { createField, type AddableFieldType } from "@/modules/forms/lib/utils/form-fields.util";

import { saveFormAction } from "../../../lib/actions/form.action";
import type { AdminFormDetail } from "../../../lib/types/form-admin.types";
import { AddFieldMenu } from "./add-field-menu";
import { FieldCard } from "./field-card";
import { FormStatusControls } from "./form-status-controls";
import { FormTextsSettings } from "./form-texts-settings";

type Draft = { title: string; description: string; fields: FormField[]; rosterId: string | null; texts: FormTexts };
type Issue = { path: (string | number)[]; message: string };

function toDraft(form: AdminFormDetail): Draft {
  return {
    title: form.title,
    description: form.description ?? "",
    fields: form.fields,
    rosterId: form.rosterId,
    texts: form.texts,
  };
}

/**
 * Splits validation issues into per-field messages (by index) and form
 * level ones. Client issues come from `formFieldsSchema` ([index, ...]);
 * server issues from `saveFormSchema` (["fields", index, ...]).
 */
function groupIssues(issues: Issue[]) {
  const byField = new Map<number, string[]>();
  const general: string[] = [];
  let title: string | undefined;
  for (const issue of issues) {
    if (issue.path[0] === "title") {
      title ??= issue.message;
      continue;
    }
    const path = issue.path[0] === "fields" ? issue.path.slice(1) : issue.path;
    const index = typeof path[0] === "number" ? path[0] : undefined;
    const target = index === undefined ? general : (byField.get(index) ?? []);
    if (!target.includes(issue.message)) target.push(issue.message);
    if (index !== undefined) byField.set(index, target);
  }
  return { byField, general, title };
}

/**
 * The whole form is edited locally and saved in one go; the server
 * validates the same schema again. Status changes are separate actions
 * and wait until the draft is saved.
 */
export function FormBuilder({ form }: { form: AdminFormDetail }) {
  const router = useRouter();
  const id = useId();
  const [saved, setSaved] = useState<Draft>(() => toDraft(form));
  const [draft, setDraft] = useState<Draft>(saved);
  // Remounts the field cards on discard so their local text resets.
  const [resetKey, setResetKey] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [issues, setIssues] = useState<Issue[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const { byField, general: formIssues, title: titleIssue } = groupIssues(issues);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function setFields(update: (fields: FormField[]) => FormField[]) {
    setDraft((current) => ({ ...current, fields: update(current.fields) }));
    setMessage(null);
  }

  const roster = form.rosters.find((item) => item.id === draft.rosterId) ?? null;
  // The name first, then the list's own columns: what "Rellenar con" offers.
  const rosterColumns = roster
    ? [{ key: ROSTER_NAME_COLUMN, label: "Nombre (del listado)" }, ...roster.columns]
    : null;

  /** Links a list (or none); questions keep only the columns the new list has. */
  function setRoster(rosterId: string | null) {
    const next = form.rosters.find((item) => item.id === rosterId);
    const keys = new Set([ROSTER_NAME_COLUMN, ...(next?.columns.map((column) => column.key) ?? [])]);
    setDraft((current) => ({
      ...current,
      rosterId,
      fields: current.fields.map((field) =>
        field.rosterColumn && (!next || !keys.has(field.rosterColumn))
          ? ({ ...field, rosterColumn: undefined } as FormField)
          : field,
      ),
    }));
    setMessage(null);
  }

  /** One short-text question per list column nobody uses yet, the name first. */
  function addRosterQuestions() {
    if (!rosterColumns) return;
    const used = new Set(draft.fields.map((field) => field.rosterColumn).filter(Boolean));
    const room = FORM_LIMITS.maxFields - draft.fields.length;
    const missing = rosterColumns.filter((column) => !used.has(column.key)).slice(0, Math.max(0, room));
    if (missing.length === 0) return;
    const hasName = draft.fields.some((field) => field.personName);
    const added = missing.map((column) => {
      const field = createField("short_text");
      const isName = column.key === ROSTER_NAME_COLUMN;
      return {
        ...field,
        label: isName ? "Nombre y apellido" : column.label,
        rosterColumn: column.key,
        ...(isName ? { required: true, ...(hasName ? {} : { personName: true }) } : {}),
      } as FormField;
    });
    setFields((fields) => [...fields, ...added]);
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
    setFields((fields) => [...fields, field]);
    toggleExpanded(field.id, true);
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((fields) => {
      const next = [...fields];
      const target = index + direction;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setIssues([]);
  }

  function save() {
    setMessage(null);
    const title = draft.title.trim();
    const local = formFieldsSchema.safeParse(draft.fields);
    const localIssues: Issue[] = [];
    if (title.length < 3) localIssues.push({ path: ["title"], message: "Escribe un título de al menos 3 caracteres." });
    if (local.success) {
      localIssues.push(...validateFieldsForKind(local.data, form.kind));
    } else {
      localIssues.push(
        ...local.error.issues.map((issue) => ({
          path: issue.path.map((part) => (typeof part === "number" ? part : String(part))),
          message: issue.message,
        })),
      );
    }
    if (localIssues.length > 0) {
      setIssues(localIssues);
      setExpanded((current) => {
        const next = new Set(current);
        for (const issue of localIssues) {
          if (typeof issue.path[0] === "number") next.add(draft.fields[issue.path[0]]?.id ?? "");
        }
        return next;
      });
      setMessage({ ok: false, text: "Hay campos por corregir antes de guardar." });
      return;
    }

    startSaving(async () => {
      const result = await saveFormAction({
        formId: form.id,
        title,
        description: draft.description,
        fields: draft.fields,
        rosterId: draft.rosterId,
        texts: draft.texts,
      });
      if (result.ok) {
        setSaved(draft);
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
    setDraft(saved);
    setIssues([]);
    setMessage(null);
    setResetKey((key) => key + 1);
  }

  return (
    <div className="space-y-6 pb-24">
      <FormStatusControls
        formId={form.id}
        slug={form.slug}
        status={form.status}
        activePackageCount={form.activePackageCount}
        kind={form.kind}
        dirty={dirty}
      />

      {form.submissionCount > 0 ? (
        <Alert>
          <AlertTitle>
            Este formulario ya tiene {form.submissionCount} respuesta{form.submissionCount === 1 ? "" : "s"}.
          </AlertTitle>
          <AlertDescription>
            Puedes seguir editándolo: cada respuesta guarda los campos tal como la persona los vio.
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby={`${id}-details`} className="space-y-4 rounded-lg border p-4">
        <h2 id={`${id}-details`} className="sr-only">
          Título y descripción
        </h2>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-title`}>Título</Label>
          <Input
            id={`${id}-title`}
            value={draft.title}
            maxLength={FORM_LIMITS.titleMax}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            aria-invalid={Boolean(titleIssue) || undefined}
            aria-describedby={titleIssue ? `${id}-title-error` : undefined}
            className="text-base font-medium"
          />
          {titleIssue ? (
            <p id={`${id}-title-error`} className="text-sm font-medium text-destructive">
              {titleIssue}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-description`}>Descripción (opcional)</Label>
          <Textarea
            id={`${id}-description`}
            rows={3}
            value={draft.description}
            maxLength={FORM_LIMITS.descriptionMax}
            placeholder="Explica para qué es el formulario, qué datos pide y cuándo lo revisan."
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-roster`}>Rellenar con un listado (opcional)</Label>
          {form.rosters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este evento no tiene listados de personas. Impórtalos en la página de formularios del
              evento para que cada persona vea sus datos ya llenos.
            </p>
          ) : (
            <>
              <NativeSelect
                id={`${id}-roster`}
                value={draft.rosterId ?? ""}
                onChange={(event) => setRoster(event.target.value || null)}
              >
                <NativeSelectOption value="">Sin listado</NativeSelectOption>
                {form.rosters.map((option) => (
                  <NativeSelectOption key={option.id} value={option.id}>
                    {option.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {roster ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted p-3 text-sm">
                  <p className="max-w-prose">
                    Arriba del formulario cada persona busca su nombre en «{roster.name}» y las preguntas
                    enlazadas a una columna aparecen llenas para confirmarlas, corregirlas o completarlas.
                  </p>
                  <Button type="button" size="sm" variant="outline" onClick={addRosterQuestions}>
                    Crear preguntas desde el listado
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <FormTextsSettings
        kind={form.kind}
        texts={draft.texts}
        hasRoster={Boolean(draft.rosterId)}
        onChange={(texts) => setDraft((current) => ({ ...current, texts }))}
      />

      <section aria-labelledby={`${id}-fields`} className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id={`${id}-fields`} className="text-lg font-semibold">
              Campos
            </h2>
            <p className="text-sm text-muted-foreground">
              {form.kind === "package_payment"
                ? "El correo y el paquete siempre están y son obligatorios: con ese correo la persona entra a Pagos y paga sus cuotas (la referencia y el comprobante se piden ahí). Puedes cambiarles el texto y el orden."
                : "El correo es el campo del sistema: siempre está, pero puedes cambiarle el texto, el orden y si es obligatorio."}
            </p>
          </div>
          <p className="text-sm text-muted-foreground tabular-nums">
            {draft.fields.length} de {FORM_LIMITS.maxFields}
          </p>
        </div>

        {formIssues.length > 0 ? (
          <Alert role="alert">
            <AlertDescription>
              <ul className="list-disc pl-5">
                {formIssues.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <ol key={resetKey} className="space-y-2">
          {draft.fields.map((field, index) => (
            <FieldCard
              key={field.id}
              field={field}
              previousFields={draft.fields.slice(0, index)}
              rosterColumns={rosterColumns}
              index={index}
              total={draft.fields.length}
              expanded={expanded.has(field.id)}
              errors={byField.get(index) ?? []}
              onExpandedChange={(open) => toggleExpanded(field.id, open)}
              onChange={(next) =>
                setFields((fields) =>
                  fields.map((item, i) => {
                    if (i === index) return next;
                    let updated = item;
                    // Only one field can be the person's name.
                    if (next.personName && updated.personName) updated = { ...updated, personName: undefined } as FormField;
                    // Conditions on this question keep only options it still has.
                    if (updated.showIf?.fieldId === next.id && "options" in next) {
                      const values = updated.showIf.values.filter((value) => next.options.includes(value));
                      if (values.length !== updated.showIf.values.length) {
                        updated = { ...updated, showIf: { ...updated.showIf, values } } as FormField;
                      }
                    }
                    return updated;
                  }),
                )
              }
              onMove={(direction) => moveField(index, direction)}
              onRemove={() => {
                // Questions that depended on this one become always visible.
                setFields((fields) =>
                  fields
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

        <AddFieldMenu
          disabled={draft.fields.length >= FORM_LIMITS.maxFields}
          onAdd={addField}
        />
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
