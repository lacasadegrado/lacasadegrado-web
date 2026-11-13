"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/common/components/ui/collapsible";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import type { FormKind } from "@/common/lib/db/schema";
import { cn } from "@/common/lib/utils/cn.util";
import { FORM_TEXT_GROUPS, FORM_TEXTS, type FormTextKey } from "@/modules/forms/lib/constants/forms.constants";
import { formText, type FormTexts } from "@/modules/forms/lib/schemas/form-texts.schema";

type FormTextsSettingsProps = {
  kind: FormKind;
  texts: FormTexts;
  /** Without a people list the name-search texts are not shown. */
  hasRoster: boolean;
  onChange: (texts: FormTexts) => void;
};

/**
 * The public page's wording, editable per form. Each box shows the
 * default as its placeholder; leaving it empty keeps the default.
 */
export function FormTextsSettings({ kind, texts, hasRoster, onChange }: FormTextsSettingsProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const changed = Object.values(texts).filter(Boolean).length;
  const groups = (Object.keys(FORM_TEXT_GROUPS) as (keyof typeof FORM_TEXT_GROUPS)[]).filter(
    (group) => hasRoster || group === "submit",
  );

  function update(key: FormTextKey, value: string) {
    const next = { ...texts, [key]: value };
    if (!value) delete next[key];
    onChange(next);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} asChild>
      <section aria-labelledby={`${id}-title`} className="rounded-lg border">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-lg p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>
              <span id={`${id}-title`} className="block font-semibold">
                Textos del formulario
              </span>
              <span className="block text-sm text-muted-foreground">
                {changed > 0
                  ? `${changed} texto${changed === 1 ? "" : "s"} personalizado${changed === 1 ? "" : "s"}.`
                  : "Cambia el tono de los textos que ve la persona (por ejemplo, más formal)."}
              </span>
            </span>
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", open && "rotate-180")}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 border-t p-4">
          <p className="text-sm text-muted-foreground">
            Lo que escribas aquí reemplaza el texto de siempre, que se ve en gris dentro de cada casilla.
            Deja una casilla vacía para usar el de siempre.
          </p>
          {groups.map((group) => (
            <fieldset key={group} className="space-y-3">
              <legend className="font-medium">{FORM_TEXT_GROUPS[group].title}</legend>
              <p className="-mt-2 text-xs text-muted-foreground">{FORM_TEXT_GROUPS[group].hint}</p>
              {(Object.keys(FORM_TEXTS) as FormTextKey[])
                .filter((key) => FORM_TEXTS[key].group === group)
                .map((key) => {
                  const text = FORM_TEXTS[key];
                  const inputId = `${id}-${key}`;
                  const placeholder =
                    formText({}, key, kind) ?? ("placeholder" in text ? text.placeholder : "");
                  const props = {
                    id: inputId,
                    value: texts[key] ?? "",
                    maxLength: text.max,
                    placeholder,
                    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                      update(key, event.target.value),
                  };
                  return (
                    <div key={key} className="space-y-1.5">
                      <Label htmlFor={inputId} className="text-xs">
                        {text.label}
                      </Label>
                      {"multiline" in text && text.multiline ? <Textarea rows={2} {...props} /> : <Input {...props} />}
                    </div>
                  );
                })}
            </fieldset>
          ))}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
