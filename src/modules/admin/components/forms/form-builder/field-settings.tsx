"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/common/components/ui/checkbox";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/common/components/ui/native-select";
import { Textarea } from "@/common/components/ui/textarea";
import {
  FORM_FILE_ACCEPT_LABELS,
  FORM_LIMITS,
} from "@/modules/forms/lib/constants/forms.constants";
import type { FormField } from "@/modules/forms/lib/types/form.types";

type FieldSettingsProps = {
  field: FormField;
  onChange: (field: FormField) => void;
};

/** "" clears an optional bound; anything else is parsed as a number. */
function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function NumberSetting({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(event) => onChange(parseOptionalNumber(event.target.value))}
        className="h-8 tabular-nums"
      />
    </div>
  );
}

/**
 * One option per line. Keeps its own text so blank lines survive while
 * typing; the field only receives the non-empty, trimmed lines.
 */
function OptionsSetting({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const id = useId();
  const [text, setText] = useState(options.join("\n"));
  return (
    <div className="space-y-1.5 sm:col-span-2">
      <Label htmlFor={id} className="text-xs">
        Opciones, una por línea
      </Label>
      <Textarea
        id={id}
        rows={Math.min(Math.max(options.length + 1, 3), 10)}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange(
            event.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          );
        }}
      />
      <p className="text-xs text-muted-foreground">
        {options.length} opci{options.length === 1 ? "ón" : "ones"} (máximo {FORM_LIMITS.maxOptions}).
      </p>
    </div>
  );
}

export function FieldSettings({ field, onChange }: FieldSettingsProps) {
  const id = useId();
  const update = (patch: Partial<FormField>) => onChange({ ...field, ...patch } as FormField);
  const system = Boolean(field.system);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-label`}>Pregunta</Label>
        <Input
          id={`${id}-label`}
          value={field.label}
          maxLength={FORM_LIMITS.labelMax}
          placeholder="¿Qué quieres preguntar?"
          onChange={(event) => update({ label: event.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${id}-help`}>Ayuda (opcional)</Label>
        <Input
          id={`${id}-help`}
          value={field.helpText ?? ""}
          maxLength={FORM_LIMITS.helpTextMax}
          placeholder="Un ejemplo o una aclaración bajo la pregunta"
          onChange={(event) => update({ helpText: event.target.value || undefined })}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`${id}-required`}
          checked={field.required}
          disabled={system}
          onCheckedChange={(checked) => update({ required: checked === true })}
        />
        <Label htmlFor={`${id}-required`}>
          Obligatorio{system ? " (siempre, es un campo del sistema)" : ""}
        </Label>
      </div>

      <TypeSettings field={field} update={update} />
    </div>
  );
}

function TypeSettings({
  field,
  update,
}: {
  field: FormField;
  update: (patch: Partial<FormField>) => void;
}) {
  const id = useId();

  switch (field.type) {
    case "short_text":
    case "long_text": {
      const hardMax = field.type === "short_text" ? FORM_LIMITS.shortTextMax : FORM_LIMITS.longTextMax;
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberSetting
            label="Mínimo de caracteres"
            value={field.minLength}
            min={0}
            max={hardMax}
            onChange={(minLength) => update({ minLength })}
          />
          <NumberSetting
            label="Máximo de caracteres"
            value={field.maxLength}
            min={1}
            max={hardMax}
            placeholder={String(hardMax)}
            onChange={(maxLength) => update({ maxLength })}
          />
        </div>
      );
    }
    case "number":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberSetting label="Valor mínimo" value={field.min} step="any" onChange={(min) => update({ min })} />
          <NumberSetting label="Valor máximo" value={field.max} step="any" onChange={(max) => update({ max })} />
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox
              id={`${id}-integer`}
              checked={field.integer ?? false}
              onCheckedChange={(checked) => update({ integer: checked === true || undefined })}
            />
            <Label htmlFor={`${id}-integer`}>Solo números enteros</Label>
          </div>
        </div>
      );
    case "date":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-min`} className="text-xs">
              Fecha mínima
            </Label>
            <Input
              id={`${id}-min`}
              type="date"
              value={field.min ?? ""}
              onChange={(event) => update({ min: event.target.value || undefined })}
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-max`} className="text-xs">
              Fecha máxima
            </Label>
            <Input
              id={`${id}-max`}
              type="date"
              value={field.max ?? ""}
              onChange={(event) => update({ max: event.target.value || undefined })}
              className="h-8"
            />
          </div>
        </div>
      );
    case "select":
    case "radio":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionsSetting options={field.options} onChange={(options) => update({ options })} />
        </div>
      );
    case "checkboxes":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <OptionsSetting options={field.options} onChange={(options) => update({ options })} />
          <NumberSetting
            label="Mínimo a marcar"
            value={field.minSelected}
            min={0}
            max={FORM_LIMITS.maxOptions}
            onChange={(minSelected) => update({ minSelected })}
          />
          <NumberSetting
            label="Máximo a marcar"
            value={field.maxSelected}
            min={1}
            max={FORM_LIMITS.maxOptions}
            onChange={(maxSelected) => update({ maxSelected })}
          />
        </div>
      );
    case "file":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-accept`} className="text-xs">
              Tipo de archivo
            </Label>
            <NativeSelect
              id={`${id}-accept`}
              value={field.accept}
              onChange={(event) =>
                update({ accept: event.target.value as keyof typeof FORM_FILE_ACCEPT_LABELS })
              }
              className="h-8"
            >
              {Object.entries(FORM_FILE_ACCEPT_LABELS).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <NumberSetting
            label="Máximo de archivos"
            value={field.maxFiles}
            min={1}
            max={FORM_LIMITS.maxFilesPerField}
            onChange={(maxFiles) => update({ maxFiles: maxFiles ?? 1 })}
          />
          <NumberSetting
            label="Peso máximo (MB)"
            value={field.maxSizeMb}
            min={1}
            max={FORM_LIMITS.maxFileMb}
            onChange={(maxSizeMb) => update({ maxSizeMb: maxSizeMb ?? FORM_LIMITS.maxFileMb })}
          />
        </div>
      );
    case "package":
      return (
        <p className="text-sm text-muted-foreground">
          Las opciones son los paquetes activos del evento, con su precio. Se editan en la lista de
          paquetes.
        </p>
      );
    case "email":
      return (
        <p className="text-sm text-muted-foreground">
          Se valida como correo y se guarda en minúsculas.
        </p>
      );
    case "phone":
      return (
        <p className="text-sm text-muted-foreground">
          Acepta teléfonos venezolanos (0414…, +58 414…) y los guarda como 04141234567.
        </p>
      );
    case "id_number":
      return (
        <p className="text-sm text-muted-foreground">
          Acepta V, E, J, P o G seguida de 5 a 9 dígitos, y la guarda como V-12345678.
        </p>
      );
  }
}
