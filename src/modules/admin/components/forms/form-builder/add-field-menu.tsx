"use client";

import { Plus } from "lucide-react";

import { Button } from "@/common/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { FORM_FIELD_TYPE_LABELS, FORM_FIELD_TYPES } from "@/modules/forms/lib/constants/forms.constants";
import type { AddableFieldType } from "@/modules/forms/lib/utils/form-fields.util";

const ADDABLE_TYPES = FORM_FIELD_TYPES.filter((type): type is AddableFieldType => type !== "package");

export function AddFieldMenu({ disabled, onAdd }: { disabled?: boolean; onAdd: (type: AddableFieldType) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          <Plus aria-hidden="true" /> Agregar campo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {ADDABLE_TYPES.map((type) => (
          <DropdownMenuItem key={type} onSelect={() => onAdd(type)}>
            {FORM_FIELD_TYPE_LABELS[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
