"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { usdToCents } from "@/common/lib/utils/money.util";

import { PHOTO_UPLOAD } from "../../lib/constants/admin.constants";
import type { UploadResponse } from "../../lib/types/admin.types";
import { UploadQueue, type QueueItem } from "./upload-queue";

type PhotoUploaderProps = {
  eventId: string;
  defaultPriceCents: number;
};

let nextItemId = 0;

/**
 * Multi-file upload with a small parallel queue. Each file is its own
 * request, so one bad file does not fail the batch and every row shows
 * its own outcome. When a batch finishes the server-rendered grid is
 * refreshed.
 */
export function PhotoUploader({ eventId, defaultPriceCents }: PhotoUploaderProps) {
  const router = useRouter();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [priceUsd, setPriceUsd] = useState((defaultPriceCents / 100).toFixed(2));
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  const priceCents = usdToCents(Number(priceUsd.replace(",", ".")) || 0);
  const priceValid = Number.isFinite(priceCents) && priceCents >= 0;

  function updateItem(id: number, patch: Partial<QueueItem>) {
    setQueue((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function uploadOne(item: QueueItem) {
    updateItem(item.id, { status: "uploading" });
    const body = new FormData();
    body.set("file", item.file);
    body.set("eventId", eventId);
    body.set("priceCents", String(priceCents));

    try {
      const response = await fetch("/api/admin/photos/upload", { method: "POST", body });
      const data = (await response.json()) as UploadResponse;
      if (data.ok) {
        updateItem(item.id, { status: "done" });
      } else {
        updateItem(item.id, { status: "error", error: data.error });
      }
    } catch {
      updateItem(item.id, { status: "error", error: "Se perdió la conexión. Intenta de nuevo." });
    }
  }

  async function uploadBatch(items: QueueItem[]) {
    setBusy(true);
    const pending = [...items];
    const workers = Array.from({ length: PHOTO_UPLOAD.concurrency }, async () => {
      while (pending.length > 0) {
        const next = pending.shift();
        if (next) await uploadOne(next);
      }
    });
    await Promise.all(workers);
    setBusy(false);
    router.refresh();
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const items: QueueItem[] = Array.from(files).map((file) => ({
      id: nextItemId++,
      file,
      status: "pending",
    }));
    setQueue((existing) => [...existing, ...items]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    void uploadBatch(items);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="space-y-2">
          <Label htmlFor={inputId}>Archivos</Label>
          <Input
            id={inputId}
            ref={fileInputRef}
            type="file"
            multiple
            accept={PHOTO_UPLOAD.accept}
            disabled={busy || !priceValid}
            onChange={(event) => handleFiles(event.target.files)}
            className="h-auto cursor-pointer py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-background"
          />
          <p className="text-sm text-muted-foreground">
            JPG, PNG o WebP, hasta {Math.round(PHOTO_UPLOAD.maxBytes / 1024 / 1024)} MB
            cada uno. Puedes seleccionar muchos a la vez. La subida empieza al
            elegirlos.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${inputId}-price`}>Precio por foto (USD)</Label>
          <Input
            id={`${inputId}-price`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={priceUsd}
            onChange={(event) => setPriceUsd(event.target.value)}
            disabled={busy}
            aria-invalid={!priceValid || undefined}
            className="tabular-nums"
          />
          <p className="text-sm text-muted-foreground">Se aplica a este lote.</p>
        </div>
      </div>

      {queue.length > 0 ? (
        <div className="space-y-3">
          <UploadQueue items={queue} />
          {!busy ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setQueue([])}>
              Limpiar lista
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
