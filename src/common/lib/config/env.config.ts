import { z } from "zod";

/**
 * Environment validation. The public schema is parsed at module load;
 * the server schema is asserted at boot from `src/instrumentation.ts`
 * so a missing variable fails the process before it serves a request.
 *
 * Set SKIP_ENV_VALIDATION=1 only for tooling that must run without
 * secrets (e.g. a CI lint job). Never in a deployed runtime.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  /** Digits only, country code included, no "+" (wa.me format). */
  NEXT_PUBLIC_WHATSAPP_NUMBER: z.string().regex(/^\d{8,15}$/),
  NEXT_PUBLIC_APP_URL: z.url(),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  RESEND_API_KEY: z.string().min(1),
  /** "Nombre <correo@dominio>" or a bare address. */
  RESEND_FROM_EMAIL: z.string().min(3),
  /** Inbox that receives support form messages. */
  SUPPORT_NOTIFY_EMAIL: z.email(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

const skipValidation = process.env.SKIP_ENV_VALIDATION === "1";

function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
  label: string,
): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const lines = result.error.issues.map(
    (issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`,
  );
  throw new Error(
    `Invalid ${label} environment variables:\n${lines.join("\n")}\n` +
      "See .env.example for the full list.",
  );
}

/*
 * NEXT_PUBLIC_* values must be referenced literally so Next.js can inline
 * them into client bundles. Do not loop over process.env here.
 */
const publicInput = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

/** Safe to import from client components. */
export const publicEnv: PublicEnv = skipValidation
  ? (publicInput as PublicEnv)
  : parse(publicSchema, publicInput, "public");

let cachedServerEnv: ServerEnv | undefined;

/**
 * Server-only. Throws if called in the browser or if a variable is
 * missing. Modules that use it should also `import "server-only"`.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() was called in the browser.");
  }
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = skipValidation
    ? (process.env as unknown as ServerEnv)
    : parse(serverSchema, process.env, "server");
  return cachedServerEnv;
}
