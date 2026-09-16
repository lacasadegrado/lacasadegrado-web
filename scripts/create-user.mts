/**
 * Creates a person before their first login, with their access flags set,
 * so a coordinator or teacher sees their tagged photos (or downloads
 * them) the first time they enter. Same as "Agregar persona" in Personas.
 *
 *   npm run user:create -- correo@dominio.com [--view] [--download] [--role "Coordinadora"]
 *
 * --download implies --view. No email is sent; their first OTP login
 * attaches to this account. Reads .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

loadEnv({ path: [".env.local", ".env"], quiet: true });

const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();
const freeDownload = args.includes("--download");
const freeView = freeDownload || args.includes("--view");
const roleIndex = args.indexOf("--role");
const roleLabel = roleIndex >= 0 ? (args[roleIndex + 1]?.trim() ?? null) || null : null;

if (!email || !email.includes("@")) {
  console.error('Usage: tsx scripts/create-user.mts <email> [--view] [--download] [--role "Cargo"]');
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !supabaseUrl || !serviceKey) {
  console.error("DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const [existing] = await sql`select id from profiles where email = ${email}`;
  if (existing) {
    console.error(`${email} already exists (${existing.id}). Change their access in Personas.`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) {
    console.error(`Supabase could not create the account: ${error?.message ?? "unknown error"}`);
    process.exit(1);
  }

  await sql`insert into profiles (id, email, role_label, free_view, free_download)
    values (${data.user.id}, ${email}, ${roleLabel}, ${freeView}, ${freeDownload})
    on conflict (id) do update set role_label = excluded.role_label, free_view = excluded.free_view, free_download = excluded.free_download`;
  console.log(
    `${email} created (${data.user.id}) role=${roleLabel ?? "-"} free_view=${freeView} free_download=${freeDownload}`,
  );
} finally {
  await sql.end();
}
