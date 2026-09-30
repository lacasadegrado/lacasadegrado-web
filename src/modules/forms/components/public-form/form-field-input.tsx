"use client";

import { Checkbox } from "@/common/components/ui/checkbox";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/common/components/ui/radio-group";
import { Textarea } from "@/common/components/ui/textarea";
import { formatEur } from "@/common/lib/utils/money.util";

import type { FormField, FormFileAnswer } from "../../lib/types/form.types";
import type { PublicForm } from "../../lib/types/public-form.types";
import { FileFieldInput } from "./file-field-input";

type FormFieldInputProps = {
  field: FormField;
  value: unknown;
  error?: string;
  slug: string;
  draftId: string;
  packages: PublicForm["packages"];
  onValue: (fieldId: string, value: unknown) => void;
  onFiles: (fieldId: string, files: FormFileAnswer[]) => void;
  onUploadingChange: (fieldId: string, uploading: boolean) => void;
};

const TEXT_INPUTS: Partial<Record<FormField["type"], { type: string; inputMode?: "email" | "tel" | "decimal"; autoComplete?: string; placeholder?: string }>> = {
  short_text: { type: "text" },
  email: { type: "email", inputMode: "email", autoComplete: "email", placeholder: "nombre@correo.com" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "0414 1234567" },
  id_number: { type: "text", placeholder: "V-12345678" },
  number: { type: "number", inputMode: "decimal" },
  date: { type: "date" },
};

/**
 * One question: label, help, control and error, wired together with ids
 * so screen readers read the help and the error with the control.
 */
export function FormFieldInput({
  field,
  value,
  error,
  slug,
  draftId,
  packages,
  onValue,
  onFiles,
  onUploadingChange,
}: FormFieldInputProps) {
  const inputId = `field-${field.id}`;
  const helpId = field.helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const invalid = Boolean(error);
  const groupLabelId = `${inputId}-label`;
  const isGroup = field.type === "radio" || field.type === "checkboxes";

  function control() {
    switch (field.type) {
      case "long_text":
        return (
          <Textarea
            id={inputId}
            rows={4}
            value={(value as string) ?? ""}
            maxLength={field.maxLength}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(event) => onValue(field.id, event.target.value)}
          />
        );
      case "select":
        return (
          <NativeSelect
            id={inputId}
            value={(value as string) ?? ""}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(event) => onValue(field.id, event.target.value)}
          >
            <NativeSelectOption value="">Elige una opción…</NativeSelectOption>
            {field.options.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {option}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        );
      case "package": {
        const chosen = packages.find((option) => option.id === value);
        return (
          <div className="space-y-2">
            <NativeSelect
              id={inputId}
              value={(value as string) ?? ""}
              required
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              onChange={(event) => onValue(field.id, event.target.value)}
            >
              <NativeSelectOption value="">Elige tu paquete…</NativeSelectOption>
              {packages.map((option) => (
                <NativeSelectOption key={option.id} value={option.id}>
                  {option.name} · {formatEur(option.priceCents)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {chosen?.description ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm">{chosen.description}</p>
            ) : null}
          </div>
        );
      }
      case "radio":
        return (
          <RadioGroup
            aria-labelledby={groupLabelId}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            value={(value as string) ?? ""}
            onValueChange={(next) => onValue(field.id, next)}
            className="gap-2.5"
          >
            {field.options.map((option, index) => (
              <div key={option} className="flex items-center gap-2">
                <RadioGroupItem id={`${inputId}-${index}`} value={option} />
                <Label htmlFor={`${inputId}-${index}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkboxes": {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div
            role="group"
            aria-labelledby={groupLabelId}
            aria-describedby={describedBy}
            className="space-y-2.5"
          >
            {field.options.map((option, index) => (
              <div key={option} className="flex items-center gap-2">
                <Checkbox
                  id={`${inputId}-${index}`}
                  checked={selected.includes(option)}
                  aria-invalid={invalid || undefined}
                  onCheckedChange={(checked) =>
                    onValue(
                      field.id,
                      checked === true
                        ? field.options.filter((item) => item === option || selected.includes(item))
                        : selected.filter((item) => item !== option),
                    )
                  }
                />
                <Label htmlFor={`${inputId}-${index}`} className="font-normal">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );
      }
      case "file":
        return (
          <FileFieldInput
            field={field}
            slug={slug}
            draftId={draftId}
            inputId={inputId}
            describedBy={describedBy}
            invalid={invalid}
            onChange={onFiles}
            onUploadingChange={onUploadingChange}
          />
        );
      default: {
        const config = TEXT_INPUTS[field.type] ?? { type: "text" };
        const bounds =
          field.type === "short_text"
            ? { maxLength: field.maxLength }
            : field.type === "number"
              ? { min: field.min, max: field.max, step: field.integer ? 1 : "any" }
              : field.type === "date"
                ? { min: field.min, max: field.max }
                : {};
        return (
          <Input
            id={inputId}
            type={config.type}
            inputMode={config.inputMode}
            autoComplete={config.autoComplete ?? "off"}
            placeholder={config.placeholder}
            value={(value as string) ?? ""}
            required={field.required}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(event) => onValue(field.id, event.target.value)}
            className={field.type === "number" ? "max-w-48 tabular-nums" : field.type === "date" ? "max-w-48" : undefined}
            {...bounds}
          />
        );
      }
    }
  }

  return (
    <div className="space-y-2">
      {isGroup ? (
        <p id={groupLabelId} className="text-sm font-medium">
          {field.label}
          {field.required ? <RequiredMark /> : null}
        </p>
      ) : (
        <Label htmlFor={inputId} className="block">
          {field.label}
          {field.required ? <RequiredMark /> : null}
        </Label>
      )}
      {field.helpText ? (
        <p id={helpId} className="text-sm text-muted-foreground">
          {field.helpText}
        </p>
      ) : null}
      {control()}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-destructive">
        {" "}
        *
      </span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  );
}
