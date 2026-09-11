import { z } from "zod";

import { AUTH_MESSAGES, OTP_LENGTH } from "../constants/auth.constants";

/** Normalized (trimmed, lowercased) so it matches `photo_tags.email`. */
export const emailSchema = z
  .string({ error: AUTH_MESSAGES.invalid_email })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: AUTH_MESSAGES.invalid_email }));

const nextPathSchema = z.string().max(2048).optional();

export const requestOtpSchema = z.object({
  email: emailSchema,
});

export const verifyOtpSchema = z.object({
  email: emailSchema,
  token: z
    .string({ error: AUTH_MESSAGES.invalid_code })
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), { error: AUTH_MESSAGES.invalid_code }),
  next: nextPathSchema,
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
