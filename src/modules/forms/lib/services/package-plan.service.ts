import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import { getServerEnv } from "@/common/lib/config/env.config";
import { type Db, type DbTransaction } from "@/common/lib/db";
import { formSubmissions, packagePlans } from "@/common/lib/db/schema";
import { PLANS_PATHS } from "@/modules/plans/lib/constants/plans.constants";

type Executor = Db | DbTransaction;

/**
 * `package_plans.token_hash` predates "Pagos": plans used to be reached
 * through a private link. People now sign in, so the hash is just a random
 * unique value nobody can turn back into a link.
 */
export function newPlanTokenHash(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

/** Where people see and pay their plans: "Pagos", behind login. */
export function plansUrl(): string {
  return `${getServerEnv().NEXT_PUBLIC_APP_URL}${PLANS_PATHS.list}`;
}

export type PlanBalance = { confirmedCents: number; pendingCents: number; reservedInstallments: number };

/** Confirmed and under-review money, and the parts they cover. Rejected payments free their parts. */
export async function planBalance(executor: Executor, planId: string): Promise<PlanBalance> {
  const [row] = await executor
    .select({
      confirmedCents: sql<number>`coalesce(sum(${formSubmissions.amountCents}) filter (where ${formSubmissions.paymentStatus} = 'confirmed'), 0)::int`,
      pendingCents: sql<number>`coalesce(sum(${formSubmissions.amountCents}) filter (where ${formSubmissions.paymentStatus} = 'pending'), 0)::int`,
      reservedInstallments: sql<number>`coalesce(sum(${formSubmissions.installmentsCovered}) filter (where ${formSubmissions.paymentStatus} in ('pending', 'confirmed')), 0)::int`,
    })
    .from(formSubmissions)
    .where(eq(formSubmissions.planId, planId));
  return row ?? { confirmedCents: 0, pendingCents: 0, reservedInstallments: 0 };
}

/**
 * Inside the form submission's transaction: signs the person up for the
 * package. Their open plan for the same package and email is reused (they
 * filled the form twice); otherwise a new one starts with nothing paid.
 * The installments are paid later, from "Pagos".
 */
export async function enrollInPlan(
  tx: DbTransaction,
  input: {
    eventId: string;
    formId: string;
    pkg: { id: string; name: string; priceCents: number; installments: number };
    email: string;
    personName: string | null;
  },
): Promise<{ planId: string; created: boolean }> {
  const [existing] = await tx
    .select({ id: packagePlans.id })
    .from(packagePlans)
    .where(
      and(eq(packagePlans.packageId, input.pkg.id), eq(packagePlans.email, input.email), eq(packagePlans.status, "open")),
    )
    .orderBy(desc(packagePlans.createdAt))
    .limit(1)
    .for("update");

  if (existing) {
    if (input.personName) {
      await tx.update(packagePlans).set({ personName: input.personName }).where(eq(packagePlans.id, existing.id));
    }
    return { planId: existing.id, created: false };
  }

  const [created] = await tx
    .insert(packagePlans)
    .values({
      eventId: input.eventId,
      packageId: input.pkg.id,
      formId: input.formId,
      email: input.email,
      personName: input.personName,
      packageName: input.pkg.name,
      priceCents: input.pkg.priceCents,
      installments: Math.max(1, input.pkg.installments),
      tokenHash: newPlanTokenHash(),
    })
    .returning({ id: packagePlans.id });
  return { planId: created.id, created: true };
}
