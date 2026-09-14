import "server-only"

import { eq } from "drizzle-orm"
import { cache } from "react"

import { db } from "@/common/lib/db"
import { profiles } from "@/common/lib/db/schema"

import type { SessionUser } from "../types/auth.types"

/**
 * What a signed-in person may do beyond buying. Read once per request
 * from `profiles`; the flags are set by admins in /admin/users.
 */
export type ViewerAccess = {
  isAdmin: boolean
  /** Sees tagged photos clean without purchase. */
  freeView: boolean
  /** Downloads originals of tagged photos without purchase. */
  freeDownload: boolean
  /** Either free flag: the cart and purchases have no meaning for them. */
  complimentary: boolean
}

const NONE: ViewerAccess = {
  isAdmin: false,
  freeView: false,
  freeDownload: false,
  complimentary: false,
}

export const getViewerAccess = cache(
  async (viewer: SessionUser): Promise<ViewerAccess> => {
    const [row] = await db
      .select({
        isAdmin: profiles.isAdmin,
        freeView: profiles.freeView,
        freeDownload: profiles.freeDownload,
      })
      .from(profiles)
      .where(eq(profiles.id, viewer.id))
      .limit(1)
    if (!row) return NONE
    const freeView = row.freeView || row.freeDownload
    return {
      isAdmin: row.isAdmin,
      freeView,
      freeDownload: row.freeDownload,
      complimentary: freeView,
    }
  },
)
