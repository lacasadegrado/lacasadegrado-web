"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

import { ADMIN_PATHS, PHOTO_FOLDERS } from "../../lib/constants/admin.constants";
import type { PersonPhotoFolder } from "../../lib/types/admin.types";
import { foldSearchText } from "../../lib/utils/search-text.util";
import { FolderCard, photoCountLabel } from "./folder-card";

type PersonFolderListProps = {
  eventId: string;
  folders: PersonPhotoFolder[];
  untaggedCount: number;
  totalPhotos: number;
  coverPhotoId: string | null;
};

/**
 * An event's folders: "Sin etiquetar" first (it still needs work), one per
 * person, "Todas las fotos" last. The search box narrows the people as the
 * admin types; the folders are all loaded already.
 */
export function PersonFolderList({
  eventId,
  folders,
  untaggedCount,
  totalPhotos,
  coverPhotoId,
}: PersonFolderListProps) {
  const [rawQuery, setRawQuery] = useState("");
  const query = foldSearchText(rawQuery);
  const visible = query
    ? folders.filter(
        (folder) => folder.email.includes(query) || (folder.name ? foldSearchText(folder.name).includes(query) : false),
      )
    : folders;

  return (
    <div className="space-y-4">
      <div role="search" className="max-w-md space-y-2">
        <Label htmlFor="person-folder-search">Buscar persona en este evento</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="person-folder-search"
              type="search"
              value={rawQuery}
              onChange={(event) => setRawQuery(event.target.value)}
              placeholder="Nombre o correo"
              className="pl-8"
            />
          </div>
          {rawQuery ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setRawQuery("")} aria-label="Limpiar búsqueda">
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      {query ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visible.length === 0
            ? `Nadie con “${rawQuery.trim()}” tiene fotos en este evento. Revisa “Sin etiquetar”: puede que sus fotos aún no tengan su correo.`
            : `${visible.length} persona${visible.length === 1 ? "" : "s"} con “${rawQuery.trim()}”.`}
        </p>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {untaggedCount > 0 ? (
          <li>
            <FolderCard
              href={ADMIN_PATHS.photoFolder(eventId, PHOTO_FOLDERS.untagged)}
              title="Sin etiquetar"
              subtitle="Fotos que aún no tienen a nadie"
              detail={photoCountLabel(untaggedCount)}
              coverPhotoId={null}
              tone="attention"
            />
          </li>
        ) : null}
        {visible.map((folder) => (
          <li key={folder.email}>
            <FolderCard
              href={ADMIN_PATHS.photoFolder(eventId, folder.email)}
              title={folder.name ?? folder.email}
              subtitle={folder.name ? folder.email : undefined}
              detail={photoCountLabel(folder.photoCount)}
              coverPhotoId={folder.coverPhotoId}
            >
              {folder.plan === "paid" ? <Badge variant="secondary">Paquete pagado</Badge> : null}
              {folder.plan === "open" ? <Badge variant="outline">Pagando paquete</Badge> : null}
              {folder.boughtCount > 0 ? (
                <Badge variant="secondary">
                  Compró {folder.boughtCount}
                </Badge>
              ) : null}
            </FolderCard>
          </li>
        ))}
        {totalPhotos > 0 ? (
          <li>
            <FolderCard
              href={ADMIN_PATHS.photoFolder(eventId, PHOTO_FOLDERS.all)}
              title="Todas las fotos"
              subtitle="Todo el evento junto"
              detail={photoCountLabel(totalPhotos)}
              coverPhotoId={coverPhotoId}
              icon="all"
            />
          </li>
        ) : null}
      </ul>
    </div>
  );
}
