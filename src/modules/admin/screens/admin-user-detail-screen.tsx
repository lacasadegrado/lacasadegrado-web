import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/common/components/ui/button"
import { formatDateTime } from "@/common/lib/utils/date.util"

import { UserMessages, UserOrders, UserPhotos } from "../components/users/user-activity"
import { UserPermissionsForm } from "../components/users/user-permissions-form"
import { AccessBadges } from "../components/users/users-table"
import { ADMIN_PATHS } from "../lib/constants/admin.constants"
import { requireAdmin } from "../lib/services/admin-access.service"
import { getUserDetail } from "../lib/services/user.service"

export async function AdminUserDetailScreen({ profileId }: { profileId: string }) {
  const admin = await requireAdmin()
  const detail = await getUserDetail(profileId)
  if (!detail) notFound()
  const { profile } = detail

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="link" size="sm" className="mb-1 px-0">
            <Link href={ADMIN_PATHS.users}>← Personas</Link>
          </Button>
          <h1 className="text-2xl">{profile.fullName ?? profile.email}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile.fullName ? `${profile.email} · ` : ""}
            {profile.phone ? `${profile.phone} · ` : ""}
            desde {formatDateTime(profile.createdAt)} · {detail.downloads} descarga
            {detail.downloads === 1 ? "" : "s"}
          </p>
        </div>
        <AccessBadges user={profile} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <section aria-labelledby="perm-heading" className="space-y-4">
          <h2 id="perm-heading" className="text-lg">
            Permisos
          </h2>
          <UserPermissionsForm profile={profile} isSelf={profile.id === admin.id} />
        </section>

        <div className="space-y-8">
          <section aria-labelledby="photos-heading" className="space-y-3">
            <h2 id="photos-heading" className="text-lg">
              {detail.photos.length} foto{detail.photos.length === 1 ? "" : "s"} etiquetada
              {detail.photos.length === 1 ? "" : "s"}
            </h2>
            <UserPhotos photos={detail.photos} />
          </section>

          <section aria-labelledby="orders-heading" className="space-y-3">
            <h2 id="orders-heading" className="text-lg">
              Pedidos
            </h2>
            <UserOrders orders={detail.orders} />
          </section>

          <section aria-labelledby="messages-heading" className="space-y-3">
            <h2 id="messages-heading" className="text-lg">
              Mensajes de soporte
            </h2>
            <UserMessages messages={detail.messages} />
          </section>
        </div>
      </div>
    </div>
  )
}
