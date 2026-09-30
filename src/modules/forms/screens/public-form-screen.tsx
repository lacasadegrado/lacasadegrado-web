import { notFound } from "next/navigation";

import { SiteFooter } from "@/common/components/site-footer/site-footer";
import { SiteHeader } from "@/common/components/site-header/site-header";
import { formatDateOnly } from "@/common/lib/utils/date.util";

import { PublicForm } from "../components/public-form/public-form";
import { getPublicForm } from "../lib/services/public-form.service";

/**
 * `/f/<slug>`, no login. Drafts and closed forms keep a page that says so
 * instead of a 404, so a shared link never looks broken.
 */
export async function PublicFormScreen({ slug }: { slug: string }) {
  const form = await getPublicForm(slug);
  if (!form) notFound();

  return (
    <>
      <SiteHeader />
      <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm text-muted-foreground">
          {form.eventName} · {form.institution} · {formatDateOnly(form.eventDate)}
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{form.title}</h1>
        {form.description ? (
          <p className="mt-4 max-w-prose whitespace-pre-line text-base text-muted-foreground">
            {form.description}
          </p>
        ) : null}

        <div className="mt-10">
          {form.status === "open" && form.packages.length > 0 ? (
            <PublicForm form={form} />
          ) : (
            <div className="rounded-lg border border-dashed p-6">
              <h2 className="text-xl">
                {form.status === "closed" ? "Este formulario ya cerró" : "Este formulario todavía no está abierto"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {form.status === "closed"
                  ? "Ya no recibe respuestas. Si necesitas reportar un pago, escríbenos."
                  : "Vuelve más tarde o pregunta a quien te compartió el link."}
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
