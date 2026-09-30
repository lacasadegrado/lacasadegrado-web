import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/common/components/ui/button";

import { FormBuilder } from "../components/forms/form-builder/form-builder";
import { ADMIN_PATHS } from "../lib/constants/admin.constants";
import { getFormForBuilder } from "../lib/services/form.service";

export async function AdminFormBuilderScreen({ formId }: { formId: string }) {
  // A malformed id would make Postgres throw instead of returning nothing.
  if (!z.uuid().safeParse(formId).success) notFound();
  const form = await getFormForBuilder(formId);
  if (!form) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <Link
          href={ADMIN_PATHS.eventFormsFor(form.eventId)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> Formularios de {form.eventName}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Editar formulario</h1>
          {form.submissionCount > 0 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`${ADMIN_PATHS.packagePayments}?event=${form.eventId}&form=${form.id}`}>
                Ver {form.submissionCount === 1 ? "1 respuesta" : `${form.submissionCount} respuestas`}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <FormBuilder form={form} />
    </div>
  );
}
