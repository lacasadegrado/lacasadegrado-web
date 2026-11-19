import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { getServerEnv } from "@/common/lib/config/env.config";
import { db } from "@/common/lib/db";
import { events, forms, photoPackages, profiles } from "@/common/lib/db/schema";
import { sendEmail } from "@/common/lib/email/email.service";
import { enrollInPlan, plansUrl } from "@/modules/forms/lib/services/package-plan.service";
import { buildPlanEnrolledEmail } from "@/modules/forms/lib/utils/form-email.util";

import type { ImportPeopleInput } from "../schemas/people-import.schema";
import { createForm } from "./form.service";
import { createUserWithAccess } from "./user.service";

/** Events with their active packages, for the import dialog's two selects. */
export async function listEventsWithPackages(): Promise<
  { id: string; name: string; packages: { id: string; name: string; priceCents: number; installments: number }[] }[]
> {
  const rows = await db
    .select({
      eventId: events.id,
      eventName: events.name,
      id: photoPackages.id,
      name: photoPackages.name,
      priceCents: photoPackages.priceCents,
      installments: photoPackages.installments,
    })
    .from(photoPackages)
    .innerJoin(events, eq(events.id, photoPackages.eventId))
    .where(eq(photoPackages.isActive, true))
    .orderBy(desc(events.createdAt), asc(photoPackages.sortOrder), asc(photoPackages.name));

  const byEvent = new Map<string, { id: string; name: string; packages: typeof rows }>();
  for (const row of rows) {
    const event = byEvent.get(row.eventId) ?? { id: row.eventId, name: row.eventName, packages: [] };
    event.packages.push(row);
    byEvent.set(row.eventId, event);
  }
  return [...byEvent.values()].map((event) => ({
    id: event.id,
    name: event.name,
    packages: event.packages.map(({ id, name, priceCents, installments }) => ({ id, name, priceCents, installments })),
  }));
}

/**
 * Every plan points at a package form (its payments' files live under the
 * form's prefix). Imports use the event's newest package form, or create
 * a draft one nobody has to share or fill.
 */
async function formForImport(eventId: string, adminId: string): Promise<string> {
  const [existing] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(eq(forms.eventId, eventId), eq(forms.kind, "package_payment")))
    .orderBy(desc(forms.createdAt))
    .limit(1);
  if (existing) return existing.id;
  const created = await createForm({
    eventId,
    title: "Inscripciones importadas",
    kind: "package_payment",
    createdBy: adminId,
  });
  return created.id;
}

export type ImportPersonResult = {
  email: string;
  /** enrolled: new plan; already: an open plan for this package existed; failed: see message. */
  status: "enrolled" | "already" | "failed";
  accountCreated: boolean;
  emailed: boolean;
  message?: string;
};

export type ImportPeopleOutcome =
  { ok: true; results: ImportPersonResult[] } | { ok: false; reason: "package_not_found" };

/**
 * "Importar personas": for each row, the account (created if new, so they
 * show in Personas and their first code attaches to it) and the plan for
 * the chosen package (reused when an open one exists). Optionally emails
 * the newly enrolled. One person failing never stops the rest.
 */
export async function importPeopleToPackage(input: ImportPeopleInput, adminId: string): Promise<ImportPeopleOutcome> {
  const [pkg] = await db
    .select({
      id: photoPackages.id,
      name: photoPackages.name,
      priceCents: photoPackages.priceCents,
      installments: photoPackages.installments,
      eventName: events.name,
    })
    .from(photoPackages)
    .innerJoin(events, eq(events.id, photoPackages.eventId))
    .where(and(eq(photoPackages.id, input.packageId), eq(photoPackages.eventId, input.eventId)))
    .limit(1);
  if (!pkg) return { ok: false, reason: "package_not_found" };

  const formId = await formForImport(input.eventId, adminId);
  const appUrl = getServerEnv().NEXT_PUBLIC_APP_URL;
  const results: ImportPersonResult[] = [];

  for (const person of input.people) {
    try {
      const account = await createUserWithAccess({
        email: person.email,
        roleLabel: null,
        freeView: false,
        freeDownload: false,
      });
      // An auth user without a profile yet ("already registered") still gets the plan: Pagos goes by email.
      if (!account.ok && account.reason !== "exists" && !/already/i.test(account.message)) {
        results.push({
          email: person.email,
          status: "failed",
          accountCreated: false,
          emailed: false,
          message: account.message,
        });
        continue;
      }
      if (person.name) {
        // Only fills an empty name; never overwrites what the person or the admin set.
        await db
          .update(profiles)
          .set({ fullName: person.name })
          .where(and(eq(profiles.email, person.email), isNull(profiles.fullName)));
      }

      const { created } = await db.transaction((tx) =>
        enrollInPlan(tx, {
          eventId: input.eventId,
          formId,
          pkg: { id: pkg.id, name: pkg.name, priceCents: pkg.priceCents, installments: pkg.installments },
          email: person.email,
          personName: person.name,
        }),
      );

      let emailed = false;
      if (created && input.notify) {
        emailed = await sendEmail({
          to: person.email,
          ...buildPlanEnrolledEmail({
            personName: person.name,
            eventName: pkg.eventName,
            packageName: pkg.name,
            priceCents: pkg.priceCents,
            installments: Math.max(1, pkg.installments),
            plansUrl: plansUrl(),
            appUrl,
          }),
        });
        // Resend allows a few requests per second; stay under it.
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
      results.push({
        email: person.email,
        status: created ? "enrolled" : "already",
        accountCreated: account.ok,
        emailed,
      });
    } catch (error) {
      console.error("[people-import] row failed", { message: error instanceof Error ? error.message : String(error) });
      results.push({
        email: person.email,
        status: "failed",
        accountCreated: false,
        emailed: false,
        message: "Error inesperado.",
      });
    }
  }
  return { ok: true, results };
}
