"use client";

import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";

import type { AdminPhoto } from "../../lib/types/admin.types";
import { collectTaggedEmails } from "../../lib/utils/email-list.util";
import { PhotoGrid } from "../photo-grid/photo-grid";

type JustUploadedDialogProps = {
  /** Ids from the batch that just finished; empty closes the dialog. */
  photoIds: string[];
  /** Every photo of the event, as the server rendered it after the refresh. */
  photos: AdminPhoto[];
  /** True while the grid is being refreshed and the new rows may be missing. */
  loading: boolean;
  onClose: () => void;
};

/**
 * Opens after a batch upload with only those photos, all selected, so the
 * admin can tag, price or delete the batch right away. It reads from the
 * server list, so every bulk action's revalidation shows up here too.
 */
export function JustUploadedDialog({ photoIds, photos, loading, onClose }: JustUploadedDialogProps) {
  const ids = new Set(photoIds);
  const recent = photos.filter((photo) => ids.has(photo.id));

  return (
    <Dialog open={photoIds.length > 0} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            {photoIds.length === 1 ? "Foto recién subida" : `${photoIds.length} fotos recién subidas`}
          </DialogTitle>
          <DialogDescription>
            Están todas seleccionadas: etiquétalas, cámbiales el precio o elimínalas de una vez, o
            desmarca las que no quieras tocar.
          </DialogDescription>
        </DialogHeader>

        {loading && recent.length === 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            Cargando las fotos…
          </p>
        ) : recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No queda ninguna foto de esta subida.</p>
        ) : (
          // Keyed on the batch so a new upload starts with its own selection.
          <PhotoGrid
            key={photoIds.join(",")}
            photos={recent}
            // From the whole event: the fresh batch has no tags yet.
            taggedEmails={collectTaggedEmails(photos)}
            defaultSelectedIds={photoIds}
            variant="dialog"
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
