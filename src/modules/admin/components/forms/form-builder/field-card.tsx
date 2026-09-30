"use client";

import { ArrowDown, ArrowUp, ChevronDown, Lock, Trash2 } from "lucide-react";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/common/components/ui/collapsible";
import { cn } from "@/common/lib/utils/cn.util";
import { FORM_FIELD_TYPE_LABELS } from "@/modules/forms/lib/constants/forms.constants";
import type { FormField } from "@/modules/forms/lib/types/form.types";

import { FieldSettings } from "./field-settings";

type FieldCardProps = {
  field: FormField;
  index: number;
  total: number;
  expanded: boolean;
  errors: string[];
  onExpandedChange: (expanded: boolean) => void;
  onChange: (field: FormField) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

export function FieldCard({
  field,
  index,
  total,
  expanded,
  errors,
  onExpandedChange,
  onChange,
  onMove,
  onRemove,
}: FieldCardProps) {
  const title = field.label.trim() || "Pregunta sin título";

  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange} asChild>
      <li
        className={cn(
          "rounded-lg border bg-card",
          errors.length > 0 && "border-destructive",
          expanded && "ring-2 ring-amber",
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <span className="w-6 shrink-0 text-center text-sm text-muted-foreground tabular-nums">
            {index + 1}
          </span>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${expanded ? "Cerrar" : "Editar"} ${title}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {title}
                  {field.required ? <span aria-hidden="true"> *</span> : null}
                </span>
                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {FORM_FIELD_TYPE_LABELS[field.type]}
                  {field.system ? (
                    <Badge variant="outline" className="gap-1 text-[0.65rem]">
                      <Lock aria-hidden="true" className="size-3" /> Del sistema
                    </Badge>
                  ) : null}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={index === 0}
              onClick={() => onMove(-1)}
              aria-label={`Subir ${title}`}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={index === total - 1}
              onClick={() => onMove(1)}
              aria-label={`Bajar ${title}`}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={Boolean(field.system)}
              onClick={onRemove}
              aria-label={`Quitar ${title}`}
              title={field.system ? "Los campos del sistema no se pueden quitar." : "Quitar campo"}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        </div>

        {errors.length > 0 ? (
          <ul className="space-y-0.5 px-3 pb-3 pl-11 text-sm font-medium text-destructive">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ) : null}

        <CollapsibleContent className="border-t p-4 pl-11">
          <FieldSettings field={field} onChange={onChange} />
        </CollapsibleContent>
      </li>
    </Collapsible>
  );
}
