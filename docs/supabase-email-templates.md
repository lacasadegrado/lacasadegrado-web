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

Same frame as the app's own emails. The logo is served by the app, so
replace `https://lacasadegrado.com` with the deployed origin if it differs.

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Tu código para entrar</title></head>
<body style="margin:0;padding:0;background:#F1ECE8;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F1ECE8;">Tu código: {{ .Token }}. Vence en 10 minutos.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#F1ECE8;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;">
      <tr><td style="background:#135065;border-radius:16px 16px 0 0;padding:24px 32px;">
        <img src="https://lacasadegrado.com/brand/logo-cream.png" width="200" height="62" alt="La Casa de Grado" style="display:block;width:200px;height:auto;border:0;">
      </td></tr>
      <tr><td style="background:#FBF8F5;border-radius:0 0 16px 16px;padding:32px;font-family:'Fira Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:700;color:#135065;">Tu código para entrar</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:25px;color:#0F2F3A;">Escríbelo en la pantalla de inicio de sesión:</p>
        <p style="margin:0 0 20px;font-size:34px;line-height:40px;font-weight:700;letter-spacing:0.2em;color:#135065;">{{ .Token }}</p>
        <p style="margin:0 0 16px;font-size:16px;line-height:25px;color:#4B6772;">Vence en 10 minutos y solo sirve una vez.</p>
        <p style="margin:0;font-size:16px;line-height:25px;color:#4B6772;">Si no pediste este código, puedes ignorar este correo. Nadie puede entrar sin él.</p>
      </td></tr>
      <tr><td style="padding:20px 8px 0;font-family:'Fira Sans',-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#4B6772;">
        Recibes este correo porque alguien pidió entrar a La Casa de Grado con esta dirección.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
```

The same frame (teal header with the logo, cream page, one button) is
what the app's own emails use, so the inbox reads as one sender.

## After changing any of the above

Nothing in the app needs to be redeployed. Templates and SMTP apply to
the next email Supabase sends.
