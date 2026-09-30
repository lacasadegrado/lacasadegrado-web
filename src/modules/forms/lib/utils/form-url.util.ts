import { publicEnv } from "@/common/lib/config/env.config";

import { FORMS_PATHS } from "../constants/forms.constants";

/** Absolute link the admin shares, e.g. https://lacasadegrado.com/f/abc123xyz9. */
export function publicFormUrl(slug: string): string {
  return new URL(FORMS_PATHS.public(slug), publicEnv.NEXT_PUBLIC_APP_URL).toString();
}
