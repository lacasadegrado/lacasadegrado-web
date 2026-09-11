# La Casa de Grado — Build Brief (Public Web, Phase 1)

You are building the public-facing web app for **La Casa de Grado**, a graduation-photography business in Venezuela. Students log in, find the photos taken of them at their graduation, buy the ones they want, and download clean high-resolution files. Everything they see before paying is blurred and watermarked.

Read this whole brief before writing any code. Ask me about anything in "Open decisions" that blocks you.

---

## 1. Stack (locked, do not substitute)

| Concern | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript, `src/` dir) |
| Styling | Tailwind CSS + shadcn/ui |
| DB | Supabase Postgres |
| ORM / migrations | Drizzle |
| Auth | Supabase Auth, email OTP (6-digit code, no password, no magic link) |
| Transactional email | Resend, wired as Supabase custom SMTP |
| File storage | Cloudflare R2 (S3-compatible SDK) |
| Image processing | `sharp` |
| Client data fetching | TanStack Query |
| Client state | Zustand |
| Validation | Zod |

---

## 2. Architecture conventions (non-negotiable)

Screaming Architecture. `src/app/` holds **thin route files only** — they import a screen from `src/modules/`. No business logic, data fetching, or component definitions in `app/`.

```
src/
├── app/                        ← route files only
├── modules/
│   └── <module-name>/
│       ├── lib/
│       │   ├── types/          ← <name>.types.ts
│       │   ├── constants/      ← <name>.constants.ts
│       │   ├── schemas/        ← <name>.schema.ts (Zod)
│       │   ├── services/       ← <name>.service.ts (DB / R2 / external calls)
│       │   ├── actions/        ← <name>.action.ts ("use server")
│       │   ├── hooks/          ← use-<name>.hook.ts ("use client")
│       │   ├── utils/          ← <name>.util.ts
│       │   └── stores/         ← <name>.store.ts ("use client")
│       ├── components/
│       └── screens/            ← <name>-screen.tsx
└── common/
    ├── assets/
    ├── lib/{hooks,providers,utils,config,stores,db,constants}/
    └── components/{ui,...}
```

Rules:
- Folders and file base names are **kebab-case**. Component exports are PascalCase.
- Every non-component file carries its typed suffix (`.hook.ts`, `.service.ts`, `.action.ts`, `.schema.ts`, `.types.ts`, `.store.ts`, `.util.ts`, `.provider.tsx`).
- `constants/` and `types/` inside any `lib/` are **always folders**, even for one file.
- A component with sub-components gets its own folder, and the root file matches the folder name (`photo-card/photo-card.tsx`, `photo-card/photo-card-overlay.tsx`).
- Default to Server Components. Add `"use client"` only for browser APIs, event handlers, or state.
- Server Actions validate with Zod, then call a service. Actions never contain DB logic. `revalidatePath` goes in the action, not the service.
- Query keys are never inlined. They live in `src/common/lib/constants/<module>/index.ts` as `<MODULE>_QUERY_KEYS` (SCREAMING_SNAKE_CASE, `as const`), aggregated into `QUERY_KEYS` in `src/common/lib/constants/index.ts`.
- Never edit generated files in `common/components/ui/`. Wrap them instead.

Modules for phase 1: `landing`, `auth`, `gallery`, `cart`, `checkout`, `orders`, `purchases`, `support`, `admin`.

---

## 3. Data model

Users live in Supabase `auth.users`. Everything else is ours, via Drizzle. Money is stored as **integer cents in USD**; Bolívar amounts are derived at display time from a stored rate.

**`profiles`** — `id` (uuid, PK, references auth.users), `email` (citext, unique), `full_name`, `phone`, `created_at`

**`events`** — `id`, `name`, `institution`, `event_date`, `slug` (unique), `is_active`, `created_at`

**`photos`** — `id`, `event_id` → events, `original_key` (R2 key, **server-only, never leaves the server**), `preview_key` (R2 key), `width`, `height`, `price_cents`, `created_at`

**`photo_tags`** — `id`, `photo_id` → photos, `email` (citext, normalized lowercase), `student_id` (nullable), `created_at`, unique(`photo_id`, `email`)
> This is how a photo reaches a person. Admin tags each photo with one or more emails. A user's gallery is every photo tagged with their email.

**`orders`** — `id`, `profile_id` → profiles, `status` enum(`pending_payment`, `pending_verification`, `paid`, `rejected`, `cancelled`), `payment_method` enum(`pago_movil`, `bank_transfer`, `binance`, `paypal`, `card`), `subtotal_cents`, `total_cents`, `currency` (default `USD`), `exchange_rate` (numeric, nullable — the USD→VES rate snapshotted at checkout), `created_at`, `paid_at`

**`order_items`** — `id`, `order_id` → orders, `photo_id` → photos, `unit_price_cents` (snapshot, do not read live price), unique(`order_id`, `photo_id`)

**`payments`** — `id`, `order_id` → orders, `method`, `reference` (Pago Móvil confirmation number / transfer ref), `payer_name`, `payer_phone`, `payer_bank`, `amount_cents`, `proof_key` (R2 key of the uploaded screenshot, nullable), `status` enum(`submitted`, `verified`, `rejected`), `submitted_at`, `verified_at`, `verified_by`, `rejection_reason`

**`entitlements`** — `id`, `profile_id`, `photo_id`, `order_id`, `granted_at`, unique(`profile_id`, `photo_id`)
> Created when an order is marked paid. This is the single source of truth for "can this user download this file". Never derive download rights by joining orders at request time.

**`support_messages`** — `id`, `profile_id` (nullable), `name`, `email`, `phone`, `message`, `channel` enum(`form`, `whatsapp`), `status` enum(`new`, `answered`, `closed`), `created_at`

**`exchange_rates`** — `id`, `usd_to_ves` (numeric), `effective_at`, `created_by`
> Admin-set. Checkout reads the latest row and snapshots it onto the order.

**`download_logs`** — `id`, `profile_id`, `photo_id`, `downloaded_at`, `ip`, `user_agent`

The cart is **not** a table. It's a Zustand store persisted to `localStorage`, holding photo IDs only. Prices are re-fetched and re-validated server-side at checkout.

---

## 4. Security rules (these are the point of the product)

1. **All DB access is server-side**, through Drizzle over a direct Postgres connection. The browser uses `supabase-js` for authentication only, never for data.
2. Enable **RLS on every table** with a default-deny posture, as defense in depth. Write read-own policies for `profiles`, `orders`, `order_items`, `entitlements`.
3. **`original_key` never appears in any client payload**, server component prop, API response, or React state. Grep for it before you consider a slice done.
4. **Previews**: served through `GET /api/photos/[id]/preview`. The handler verifies the session, verifies a `photo_tags` row matches the session email, then redirects to a presigned R2 URL with a ~15 minute TTL.
5. **Downloads**: served through `GET /api/photos/[id]/download`. The handler verifies the session, verifies an `entitlements` row exists for (profile, photo), writes a `download_logs` row, then redirects to a presigned R2 URL with a **60 second** TTL and a `Content-Disposition: attachment` response override.
6. The R2 bucket is **private**. No public bucket, no public base URL, no CDN caching of originals.
7. Previews are generated once at upload time by the admin ingest pipeline, never on request: resize longest edge to 1400px, apply `sharp.blur(12)`, composite a tiled diagonal watermark, output WebP at quality 70. Original is uploaded untouched.
8. Rate-limit OTP requests per email and per IP on our side too, not only Supabase's built-in limit.
9. Order totals are always recomputed on the server from `photos.price_cents`. Never trust a total sent from the client.

---

## 5. Flows

### 5.1 Auth (`auth` module)
- `/login`: single email field → `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`.
- Second step in the same screen: 6-digit code input → `verifyOtp({ email, token, type: 'email' })`.
- Use `@supabase/ssr` with cookie-based sessions and a middleware that refreshes them and protects `/dashboard`, `/cart`, `/checkout`, `/purchases`, `/orders`.
- On first successful verification, upsert a `profiles` row.
- Supabase email template must render `{{ .Token }}`, not a magic link. Supabase SMTP is pointed at Resend (`smtp.resend.com:465`, user `resend`, password = Resend API key).
- Handle these states explicitly in the UI: code expired, code wrong, too many attempts, resend cooldown (60s countdown).
- Logout returns to `/`.

### 5.2 Gallery (`gallery` module)
- `/dashboard`: server component fetches every photo tagged with the session user's email, grouped by event.
- Each photo renders as a blurred, watermarked preview with an "Add to cart" control. Already-purchased photos show as owned and link to `/purchases` instead.
- Empty state: explain that photos appear once the photographer has uploaded and matched them, and link to support. Do not show a generic "no data".

### 5.3 Cart (`cart` module)
- `/cart`: list of selected photos with thumbnails, unit prices, remove buttons, subtotal.
- Prevent adding a photo the user already owns, or the same photo twice.
- Persist across reloads.

### 5.4 Checkout (`checkout` module)
- `/checkout`: order summary, total in USD with the Bolívar equivalent, and payment method selection. **Phase 1 ships Pago Móvil and Bank Transfer only.** Render the other methods as visibly disabled with a "coming soon" state.
- Selecting a method creates an order with status `pending_payment` and redirects to `/checkout/[orderId]/payment`.
- That page shows the business's payment details for the chosen method (from config), the exact amount in Bs, and a form for: reference number, payer name, payer phone, payer bank, and an optional screenshot upload (goes to R2 under `proofs/`).
- Submitting the form creates a `payments` row and moves the order to `pending_verification`. Send the user a Resend confirmation email and show a clear "we're verifying, this usually takes X hours" state.
- No entitlements are granted until an admin verifies.

### 5.5 Orders and purchases (`orders`, `purchases` modules)
- `/orders/[id]`: order status timeline — submitted, under review, approved or rejected. Rejected shows the reason and a way to resubmit payment details.
- `/dashboard/purchases`: every photo the user has an entitlement for, unblurred preview, individual download buttons, and a "download all" that streams a zip built server-side.

### 5.6 Support (`support` module)
- A persistent floating button on authenticated pages.
- Two paths: "Chat on WhatsApp" (a `wa.me` deep link with a prefilled message including the user's email and, if relevant, the order ID) and "Send us a message" (a form that writes a `support_messages` row and notifies the business by Resend).
- Both paths write a `support_messages` row so nothing is lost.

### 5.7 Minimal admin (`admin` module)
Build this early — the public app shows nothing without it. Gate it behind an `is_admin` flag on `profiles`, checked server-side in middleware and again in every admin action.
- `/admin/events`: create and list events.
- `/admin/photos`: multi-file upload to an event. On upload, generate the preview derivative, write both objects to R2, insert the `photos` row. Then tag photos with emails — support both per-photo tagging and a bulk CSV paste (`filename,email`).
- `/admin/payments`: queue of orders in `pending_verification` with the submitted reference and proof image. Approve grants entitlements and sends the "your photos are ready" email. Reject captures a reason and emails the user.
- `/admin/rates`: set the current USD→VES rate.

---

## 6. Visual direction

There is no branding yet. The app is **strictly monochrome** until there is.

- Palette: true black `#000000`, true white `#FFFFFF`, and a deliberate grey ramp between them. Do not use tinted near-blacks like `#0B0B0B` or `#111`. Define every value as a CSS custom property so a future brand color drops in as a single token.
- The photographs are the only color in the product. Keep every piece of chrome quiet so the images carry all the visual weight.
- Logo: build a `<LogoPlaceholder />` component in `common/components/`, used in the header, footer, login screen, and the photo watermark. One component, one future swap.
- Type: pick one family with real weight contrast and set a deliberate scale. Avoid the generated-page tells — no tracked-out all-caps eyebrow labels above headings, no `→` glued to button text, no identical rounded cards with the same soft grey shadow for every piece of content, no accenting one word in a headline.
- Motion: one considered moment (the reveal when a purchased photo loses its blur is the obvious candidate). No fade-and-slide on every section, no hover transitions on every card.
- Responsive is a requirement, not a pass at the end. Design the gallery mobile-first — most students will open this on a phone, likely on a slow connection. Lazy-load previews and use a masonry or aspect-ratio-preserving grid that doesn't reflow as images arrive.
- Copy is in **Spanish** (Venezuelan audience). Plain, active, sentence case. Buttons say what happens: "Agregar al carrito", "Pagar", "Descargar". Empty and error states explain what to do next.
- Quality floor: visible keyboard focus, respects reduced motion, accessible contrast, real loading and error states everywhere.

---

## 7. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

NEXT_PUBLIC_WHATSAPP_NUMBER=
NEXT_PUBLIC_APP_URL=
```

Validate all of these with Zod in `src/common/lib/config/env.config.ts` and fail fast at boot. Commit a `.env.example`.

---

## 8. Build order

Work in these slices and stop for review after each. Don't scaffold all nine modules up front.

1. Project scaffold, Tailwind, shadcn, design tokens, root layout, logo placeholder, env validation, Drizzle setup and the full schema with a first migration.
2. Auth: `/login` OTP flow, session middleware, protected route group, logout.
3. Minimal admin: events, photo upload with preview generation to R2, email tagging.
4. Gallery: `/dashboard` with gated preview streaming.
5. Cart and checkout through to `pending_verification`, Pago Móvil and Bank Transfer only.
6. Admin payment verification, entitlement granting, notification emails.
7. Purchases and the secure download endpoint.
8. Support: WhatsApp deep link and message form.
9. Landing page.

---

## 9. Out of scope for phase 1

Binance, PayPal, Google Pay, Apple Pay. Build the payment method layer as a discriminated union so adding an automated provider later is an added case, not a rewrite. Also out: in-app chat inbox, discount codes, print products, refunds.

---

## 10. Open decisions — ask me before you need them

1. **Pricing**: flat price per photo, or bundles (3-pack, full set)? Assume a flat per-photo price for now and keep price on the `photos` row so it can vary per event.
2. **Currency shown at checkout**: USD with a Bs equivalent, or Bs primary? Assume USD primary.
3. The business's Pago Móvil details, bank account details, and WhatsApp number — placeholders in config until I give you real ones.
4. Whether a student can be tagged in a photo they aren't in (group shots, family shots) and how the photographer wants to handle those.

If you hit a decision I haven't covered, state your assumption in a comment and keep moving rather than blocking.
