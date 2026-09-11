import { Button } from "@/common/components/ui/button";
import { SUPPORT_MESSAGES } from "@/modules/support/lib/constants/support.constants";
import { buildWhatsAppUrl } from "@/modules/support/lib/utils/whatsapp.util";

type GalleryEmptyStateProps = {
  email: string;
};

export function GalleryEmptyState({ email }: GalleryEmptyStateProps) {
  return (
    <section className="max-w-xl rounded-md border border-dashed p-6 sm:p-8">
      <h2 className="text-xl font-bold">Todavía no hay fotos para este correo</h2>
      <p className="mt-3 text-base text-muted-foreground">
        Tus fotos aparecen aquí cuando el fotógrafo termina de subirlas y las
        asocia al correo que diste en tu graduación. Eso puede tardar unos días
        después del acto.
      </p>
      <p className="mt-3 text-base text-muted-foreground">
        Entraste con{" "}
        <span className="font-medium text-foreground">{email}</span>. Si diste
        otro correo ese día, sal y vuelve a entrar con ese.
      </p>
      <div className="mt-6">
        <Button asChild>
          <a
            href={buildWhatsAppUrl(SUPPORT_MESSAGES.noPhotos(email))}
            target="_blank"
            rel="noopener noreferrer"
          >
            Escribir por WhatsApp
          </a>
        </Button>
      </div>
    </section>
  );
}
