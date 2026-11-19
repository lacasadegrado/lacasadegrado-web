import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireSessionUser } from "@/modules/auth/lib/services/session.service";

import { PackageReceipt } from "../components/package-receipt/package-receipt";
import { PrintReceiptButton } from "../components/package-receipt/print-receipt-button";
import { PLANS_PATHS } from "../lib/constants/plans.constants";
import { getPlanReceipt } from "../lib/services/plan-receipt.service";

/**
 * `/dashboard/payments/<planId>/receipt` and the admin's copy: the receipt
 * of a fully paid package with "Descargar recibo (PDF)". `admin` passes
 * the admin's back link and skips the owner check (the admin layout guards).
 */
export async function PlanReceiptScreen({
  planId,
  admin,
}: {
  planId: string;
  admin?: { backHref: string; backLabel: string };
}) {
  if (!z.uuid().safeParse(planId).success) notFound();
  const owner = admin ? null : { email: (await requireSessionUser(PLANS_PATHS.receipt(planId))).email };
  const receipt = await getPlanReceipt(planId, owner);
  if (!receipt) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={admin?.backHref ?? PLANS_PATHS.plan(planId)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden="true" className="size-4" /> {admin?.backLabel ?? "Mi paquete"}
        </Link>
      </div>
      <PackageReceipt receipt={receipt} />
      <div className="space-y-2">
        <PrintReceiptButton />
        <p className="text-sm text-muted-foreground">
          Se abre la ventana de imprimir: elige «Guardar como PDF» para guardarlo en tu teléfono o computadora.
        </p>
      </div>
    </div>
  );
}
