import { z } from "zod";

import { emailSchema } from "@/modules/auth/lib/schemas/auth.schema";
import { PLAN_LIMITS } from "@/modules/forms/lib/constants/forms.constants";
import { PLAN_PAYMENT_METHOD_IDS } from "@/modules/plans/lib/constants/plans.constants";

/** People sent per request; the dialog splits a long Excel in batches. */
export const PEOPLE_IMPORT_BATCH = 25;

export const importPeopleSchema = z.object({
  eventId: z.uuid(),
  packageId: z.uuid(),
  /** Email each newly enrolled person that their package is waiting in Pagos. */
  notify: z.boolean(),
  /** How the installments already paid (the "cuotas pagadas" column) were paid. */
  paymentMethod: z.enum(PLAN_PAYMENT_METHOD_IDS),
  people: z
    .array(
      z.object({
        email: emailSchema,
        name: z
          .string()
          .trim()
          .max(160)
          .transform((value) => value || null),
        /** Installments paid before the web existed; recorded as confirmed, never more than the package has. */
        paidInstallments: z.int().min(0).max(PLAN_LIMITS.maxInstallments),
      }),
    )
    .min(1)
    .max(PEOPLE_IMPORT_BATCH),
});

export type ImportPeopleInput = z.infer<typeof importPeopleSchema>;
