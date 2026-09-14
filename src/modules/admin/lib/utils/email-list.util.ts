import { emailSchema } from "@/modules/auth/lib/schemas/auth.schema";

export type EmailListParse = {
  /** Unique, normalized. */
  emails: string[];
  invalid: string[];
};

/** "ana@x.com, LUIS@y.com\npepe" -> emails [ana, luis], invalid [pepe]. */
export function parseEmailList(text: string): EmailListParse {
  const emails = new Set<string>();
  const invalid: string[] = [];
  for (const token of text.split(/[\s,;]+/)) {
    if (!token) continue;
    const parsed = emailSchema.safeParse(token);
    if (parsed.success) emails.add(parsed.data);
    else invalid.push(token);
  }
  return { emails: [...emails], invalid };
}
