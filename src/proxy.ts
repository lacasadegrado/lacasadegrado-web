import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/common/lib/config/env.config";
import { ADMIN_PATHS } from "@/modules/admin/lib/constants/admin.constants";
import { isAdminUser } from "@/modules/admin/lib/services/admin-access.service";
import { AUTH_PATHS } from "@/modules/auth/lib/constants/auth.constants";
import { buildLoginUrl, isProtectedPath } from "@/modules/auth/lib/utils/auth.util";

/**
 * Runs before every non-static request. Refreshes the Supabase session
 * cookie and applies optimistic route protection. This is a fast redirect
 * layer only: every Server Action and Server Component re-checks the
 * session itself, since a matcher change would otherwise silently drop
 * coverage.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Verifies the JWT signature and refreshes the token when expired.
  // Do not replace with getSession(): that trusts the cookie unverified.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims.sub);

  const { pathname, search } = request.nextUrl;

  if (!isAuthenticated && isProtectedPath(pathname)) {
    return NextResponse.redirect(
      new URL(buildLoginUrl(`${pathname}${search}`), request.url),
    );
  }

  if (isAuthenticated && pathname === AUTH_PATHS.login) {
    return NextResponse.redirect(new URL(AUTH_PATHS.afterLogin, request.url));
  }

  // Admin gate, first pass. The admin layout and every admin action and
  // handler check `profiles.is_admin` again themselves.
  if (isAuthenticated && isProtectedPath(pathname, [ADMIN_PATHS.root])) {
    const admin = await isAdminUser(String(data?.claims.sub));
    if (!admin) return new NextResponse(null, { status: 404 });
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
