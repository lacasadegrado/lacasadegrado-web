"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { Button } from "@/common/components/ui/button";

import type { AdminPhoto, EmailSuggestion } from "../../lib/types/admin.types";
import { PhotoUploader } from "../photo-uploader/photo-uploader";

type UploadPhotosPanelProps = {
  eventId: string;
  eventName: string;
  /** The folder's photos, for the dialog that opens after a batch. */
  photos: AdminPhoto[];
  emailSuggestions: EmailSuggestion[];
  defaultPriceCents: number;
  defaultPrintPriceCents: number;
  /** Inside a person's folder: every uploaded photo is tagged with them. */
  person?: { email: string; name: string | null };
  /** Open on first render (e.g. an event with no photos yet). */
  defaultOpen?: boolean;
};

/** "Subir fotos" stays a button until the admin needs it. */
export function UploadPhotosPanel({ person, defaultOpen = false, eventName, ...uploader }: UploadPhotosPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const target = person ? (person.name ?? person.email) : eventName;

  if (!open) {
    return (
      <Button type="button" size="lg" onClick={() => setOpen(true)}>
        <Upload aria-hidden="true" />
        {person ? `Subir fotos de ${target}` : "Subir fotos"}
      </Button>
    );
  }

  return (
    <section aria-labelledby="upload-heading" className="space-y-4 rounded-md border p-4 sm:p-6">
      <div>
        <h2 id="upload-heading" className="text-lg font-semibold">
            Subir fotos de {target}
          </h2>
          <p className="text-sm text-muted-foreground">
            {person
              ? `Cada foto que subas aquí queda etiquetada con ${person.email}.`
              : "Las fotos quedan en “Sin etiquetar” hasta que les pongas el correo de la persona."}
          </p>
      </div>
      <PhotoUploader {...uploader} tagEmail={person?.email} />
    </section>
  );
}
