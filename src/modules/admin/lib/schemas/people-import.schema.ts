import { z } from "zod";

import { emailSchema } from "@/modules/auth/lib/schemas/auth.schema";

/** People sent per request; the dialog splits a long Excel in batches. */
export const PEOPLE_IMPORT_BATCH = 25;

export const importPeopleSchema = z.object({
  eventId: z.uuid(),
  packageId: z.uuid(),
  /** Email each newly enrolled person that their package is waiting in Pagos. */
  notify: z.boolean(),
  people: z
    .array(
      z.object({
        email: emailSchema,
        name: z
          .string()
          .trim()
          .max(160)
          .transform((value) => value || null),
      }),
    )
    .min(1)
    .max(PEOPLE_IMPORT_BATCH),
});

export type ImportPeopleInput = z.infer<typeof importPeopleSchema>;
