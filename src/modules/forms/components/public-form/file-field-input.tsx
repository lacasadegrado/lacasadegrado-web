"use client";

import { FileText, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";

import { prepareFormUploadAction } from "../../lib/actions/public-form.action";
import { FORM_FILE_ACCEPT, FORM_FILE_ACCEPT_LABELS } from "../../lib/constants/forms.constants";
import type { FormFieldOf, FormFileAnswer } from "../../lib/types/form.types";

type UploadItem = {
  localId: number;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  key?: string;
  error?: string;
};

type FileFieldInputProps = {
  field: FormFieldOf<"file">;
  slug: string;
  draftId: string;
  inputId: string;
  describedBy?: string;
  invalid: boolean;
  /** Stable callbacks (the parent's useCallback); they get the field id. */
  onChange: (fieldId: string, files: FormFileAnswer[]) => void;
  onUploadingChange: (fieldId: string, uploading: boolean) => void;
};

let nextLocalId = 0;

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Each chosen file goes straight to R2 through a presigned PUT, never
 * through a server function. The field's value is the list of files that
 * finished; the form waits while any is still uploading.
 */
export function FileFieldInput({
  field,
  slug,
  draftId,
  inputId,
  describedBy,
  invalid,
  onChange,
  onUploadingChange,
}: FileFieldInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const accepted: readonly string[] = FORM_FILE_ACCEPT[field.accept];
  const maxBytes = field.maxSizeMb * 1024 * 1024;
  const remaining = field.maxFiles - items.filter((item) => item.status !== "error").length;

  // Report after render, never from inside a state updater.
  useEffect(() => {
    onChange(
      field.id,
      items
        .filter((item) => item.status === "done" && item.key)
        .map((item) => ({ key: item.key as string, name: item.name })),
    );
    onUploadingChange(field.id, items.some((item) => item.status === "uploading"));
  }, [items, field.id, onChange, onUploadingChange]);

  function patch(localId: number, update: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.localId === localId ? { ...item, ...update } : item)));
  }

  async function upload(localId: number, file: File) {
    try {
      const prepared = await prepareFormUploadAction({
        slug,
        draftId,
        fieldId: field.id,
        name: file.name,
        type: file.type,
        size: file.size,
      });
      if (!prepared.ok) {
        patch(localId, { status: "error", error: prepared.message });
        return;
      }
      const put = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) {
        patch(localId, { status: "error", error: "No se pudo subir. Intenta de nuevo." });
        return;
      }
      patch(localId, { status: "done", key: prepared.key });
    } catch {
      patch(localId, { status: "error", error: "Se perdió la conexión. Intenta de nuevo." });
    }
  }

  function handleFiles(list: FileList | null) {
    setNotice(null);
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    if (inputRef.current) inputRef.current.value = "";

    // A single-file field replaces its file, so a rejected proof is fixed
    // by simply choosing another one.
    const replacing = field.maxFiles === 1;
    if (replacing) {
      if (items.some((item) => item.status === "uploading")) {
        setNotice("Espera a que termine de subir el archivo actual.");
        return;
      }
      setItems([]);
    } else if (files.length > remaining) {
      setNotice(
        remaining <= 0
          ? `Ya adjuntaste el máximo de ${field.maxFiles}. Quita uno para cambiarlo.`
          : `Puedes adjuntar ${remaining} archivo${remaining === 1 ? "" : "s"} más.`,
      );
      return;
    }

    for (const file of replacing ? files.slice(0, 1) : files) {
      const localId = nextLocalId++;
      const base = { localId, name: file.name, size: file.size };
      if (!accepted.includes(file.type)) {
        setItems((current) => [
          ...current,
          { ...base, status: "error", error: `Solo se acepta ${FORM_FILE_ACCEPT_LABELS[field.accept].toLowerCase()}.` },
        ]);
        continue;
      }
      if (file.size > maxBytes) {
        setItems((current) => [
          ...current,
          { ...base, status: "error", error: `Pesa más de ${field.maxSizeMb} MB.` },
        ]);
        continue;
      }
      setItems((current) => [...current, { ...base, status: "uploading" }]);
      void upload(localId, file);
    }
  }

  return (
    <div className="space-y-2">
      <Input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accepted.join(",")}
        multiple={field.maxFiles > 1}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        onChange={(event) => handleFiles(event.target.files)}
        className="h-auto cursor-pointer py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background"
      />
      <p className="text-xs text-muted-foreground">
        {FORM_FILE_ACCEPT_LABELS[field.accept]}, hasta {field.maxSizeMb} MB
        {field.maxFiles > 1 ? `, máximo ${field.maxFiles} archivos` : ""}.
      </p>
      {notice ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {notice}
        </p>
      ) : null}
      {items.length > 0 ? (
        <ul className="divide-y rounded-md border text-sm" aria-live="polite">
          {items.map((item) => (
            <li key={item.localId} className="flex items-center gap-3 px-3 py-2">
              {item.status === "uploading" ? (
                <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
              ) : (
                <FileText aria-hidden="true" className="size-4 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className={item.status === "error" ? "font-medium text-destructive" : "text-muted-foreground"}>
                  {item.status === "uploading"
                    ? `Subiendo… ${formatSize(item.size)}`
                    : item.status === "done"
                      ? `Listo · ${formatSize(item.size)}`
                      : item.error}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={item.status === "uploading"}
                onClick={() => setItems((current) => current.filter((entry) => entry.localId !== item.localId))}
                aria-label={`Quitar ${item.name}`}
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
