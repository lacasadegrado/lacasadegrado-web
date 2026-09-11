# Supabase Auth configuration for the OTP flow

Everything here is set in the Supabase dashboard for project
`ynitvsccuxyxbjdfeyuj`. The app sends codes, never links, so both
templates must render `{{ .Token }}`.

## Auth > Providers > Email

| Setting | Value |
|---|---|
| Enable email provider | on |
| Confirm email | on |
| Secure email change | on |
| Email OTP length | 6 |
| Email OTP expiration | 600 seconds (must match `OTP_TTL_SECONDS` in `src/modules/auth/lib/constants/auth.constants.ts`) |

## Auth > Rate Limits

| Setting | Value |
|---|---|
| Rate limit for sending emails | 10 per hour (our own limit is 5 per email per 15 min, 20 per IP per hour) |
| Rate limit for token verifications | 30 per 5 min (default) |

## Auth > SMTP Settings

| Setting | Value |
|---|---|
| Enable custom SMTP | on |
| Sender email | the address in `RESEND_FROM_EMAIL`, on the verified domain |
| Sender name | La Casa de Grado |
| Host | `smtp.resend.com` |
| Port | 465 |
| Username | `resend` |
| Password | the Resend API key (same value as `RESEND_API_KEY`) |

## Auth > Email Templates

Both "Magic Link" and "Confirm signup" are used by `signInWithOtp`:
Magic Link for returning users, Confirm signup for a first login. Give
them the same body.

### Subject

```
Tu código para entrar a La Casa de Grado
```

### Body (paste into both templates)

```html
<div style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #135065; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <p style="font-size: 20px; font-weight: 700; margin: 0 0 24px;">La Casa de Grado</p>

  <p style="font-size: 16px; line-height: 24px; margin: 0 0 16px;">
    Tu código para entrar es:
  </p>

  <p style="font-size: 36px; font-weight: 700; letter-spacing: 0.25em; margin: 0 0 24px; font-variant-numeric: tabular-nums;">
    {{ .Token }}
  </p>

  <p style="font-size: 14px; line-height: 22px; color: #4B6772; margin: 0 0 8px;">
    Escríbelo en la pantalla de inicio de sesión. Vence en 10 minutos y solo sirve una vez.
  </p>

  <p style="font-size: 14px; line-height: 22px; color: #4B6772; margin: 0;">
    Si no pediste este código, puedes ignorar este correo. Nadie puede entrar sin él.
  </p>
</div>
```

The email is intentionally monochrome and text-first: it renders in
every client, and the code is the only thing the reader needs.

## After changing any of the above

Nothing in the app needs to be redeployed. Templates and SMTP apply to
the next email Supabase sends.
