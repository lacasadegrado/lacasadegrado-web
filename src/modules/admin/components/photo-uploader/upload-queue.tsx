"use client";

export type QueueItem = {
  id: number;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

const STATUS_LABEL: Record<QueueItem["status"], string> = {
  pending: "En espera",
  uploading: "Subiendo…",
  done: "Lista",
  error: "Error",
};

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadQueue({ items }: { items: QueueItem[] }) {
  const done = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "error").length;

  return (
    <div className="rounded-md border">
      <p className="border-b px-3 py-2 text-sm" aria-live="polite">
        {done} de {items.length} subidas
        {failed > 0 ? `, ${failed} con error` : ""}
      </p>
      <ul className="max-h-72 divide-y overflow-y-auto text-sm">
        {items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.file.name}</p>
              <p className="text-muted-foreground">
                {formatSize(item.file.size)}
                {item.error ? ` · ${item.error}` : ""}
              </p>
            </div>
            <span
              className={
                item.status === "error"
                  ? "shrink-0 font-semibold"
                  : "shrink-0 text-muted-foreground"
              }
            >
              {STATUS_LABEL[item.status]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
