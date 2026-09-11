"use client";

import { Button } from "@/common/components/ui/button";

type ErrorScreenProps = {
  reset: () => void;
};

/** Route-level error boundary body. Never shows the raw error to the user. */
export function ErrorScreen({ reset }: ErrorScreenProps) {
  return (
    <section className="max-w-xl rounded-md border border-dashed p-6 sm:p-8">
      <h1 className="text-xl font-bold">Algo salió mal</h1>
      <p className="mt-3 text-base text-muted-foreground">
        No pudimos cargar esta página. Suele ser algo momentáneo.
      </p>
      <div className="mt-6">
        <Button type="button" onClick={reset}>
          Intentar de nuevo
        </Button>
      </div>
    </section>
  );
}
