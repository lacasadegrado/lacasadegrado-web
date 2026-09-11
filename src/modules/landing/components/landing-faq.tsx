import { Button } from "@/common/components/ui/button";
import { SUPPORT_MESSAGES } from "@/modules/support/lib/constants/support.constants";
import { buildWhatsAppUrl } from "@/modules/support/lib/utils/whatsapp.util";

import { LANDING_FAQ } from "../lib/constants/landing.constants";

export function LandingFaq() {
  return (
    <section aria-labelledby="faq-heading" className="border-t">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <h2 id="faq-heading" className="text-2xl font-bold sm:text-3xl">
            Preguntas frecuentes
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            ¿Otra duda? Escríbenos y te contestamos en horario de oficina.
          </p>
          <Button asChild variant="outline" className="mt-5 h-10">
            <a href={buildWhatsAppUrl(SUPPORT_MESSAGES.public)} target="_blank" rel="noopener noreferrer">
              Escribir por WhatsApp
            </a>
          </Button>
        </div>
        <dl className="divide-y border-y">
          {LANDING_FAQ.map((item) => (
            <div key={item.question} className="py-5">
              <dt className="text-base font-semibold">{item.question}</dt>
              <dd className="mt-2 max-w-prose text-base text-muted-foreground">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
