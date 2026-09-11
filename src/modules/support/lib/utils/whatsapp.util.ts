import { publicEnv } from "@/common/lib/config/env.config";

/** wa.me deep link to the business number with a prefilled message. */
export function buildWhatsAppUrl(message: string): string {
  const number = publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
