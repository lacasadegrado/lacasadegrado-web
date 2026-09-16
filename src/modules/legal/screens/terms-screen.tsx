import Link from "next/link";

import { BUSINESS } from "@/common/lib/config/business.config";
import { publicEnv } from "@/common/lib/config/env.config";

import { LegalPage, LegalSection } from "../components/legal-page";
import { LEGAL_PATHS } from "../lib/constants/legal.constants";

/**
 * Terms of service in plain Spanish. Numbers (verification SLA, print
 * delivery and responsibility windows) come from the business config so
 * the page never contradicts the app. Reviewed by a lawyer before launch.
 */
export function TermsScreen() {
  return (
    <LegalPage
      title="Términos y condiciones"
      intro={`Estas condiciones regulan el uso de ${BUSINESS.name} y la compra de fotografías a través de este sitio. Al crear un pedido las aceptas.`}
    >
      <LegalSection title="1. Quiénes somos">
        <p>
          {BUSINESS.legalName}, RIF {BUSINESS.rif}, en adelante «{BUSINESS.name}». Puedes
          escribirnos por WhatsApp al +{publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER} o desde el botón
          de ayuda dentro del sitio.
        </p>
      </LegalSection>

      <LegalSection title="2. El servicio">
        <p>
          Fotografiamos actos de grado y ponemos las fotos a disposición de las personas que
          aparecen en ellas. Entras con el correo que diste el día del acto; verás únicamente
          las fotos asociadas a ese correo, en vista previa borrosa y con marca de agua hasta que
          confirmemos tu pago.
        </p>
        <p>
          Para cada foto puedes comprar la versión <strong>digital</strong> (archivo en alta
          resolución, sin marca de agua) o la versión <strong>impresa</strong>, que incluye la
          digital sin costo adicional. Solo se elige una de las dos por foto.
        </p>
      </LegalSection>

      <LegalSection title="3. Precios y pago">
        <p>
          Los precios se muestran en euros (EUR). El monto a pagar en bolívares se calcula con la
          tasa oficial del Banco Central de Venezuela para el euro vigente al momento de crear el
          pedido, y queda fijado en el pedido. Debes pagar el monto exacto indicado.
        </p>
        <p>
          Aceptamos Pago Móvil y transferencia bancaria en bolívares. Tras pagar, reportas la
          referencia y, si quieres, una captura del comprobante. Verificamos el pago manualmente
          en un plazo aproximado de {BUSINESS.verificationSlaHours} horas y te avisamos por correo.
          Si no podemos confirmarlo, te indicamos el motivo y puedes enviar nuevos datos.
        </p>
        <p>
          Un pedido sin pago reportado no reserva precio ni fotos. Si pagas de más o por error,
          escríbenos con la referencia para resolverlo.
        </p>
      </LegalSection>

      <LegalSection title="4. Entrega de fotos digitales">
        <p>
          Cuando aprobamos el pago, las fotos quedan disponibles para descargar desde tu cuenta,
          en su resolución original y sin marca de agua. Puedes volver a descargarlas mientras el
          servicio siga activo; de todos modos te recomendamos guardar una copia.
        </p>
      </LegalSection>

      <LegalSection title="5. Fotos impresas">
        <p>
          Las fotos impresas se entregan en la institución donde se realizó el acto en un plazo
          aproximado de {BUSINESS.print.deliveryDays} días desde la aprobación del pago. La
          institución se encarga de hacértela llegar. Te avisamos por correo el día que la
          entregamos.
        </p>
        <p>
          Desde esa entrega tienes {BUSINESS.print.responsibilityDays} días para reportar cualquier
          defecto de impresión; en ese caso la reimprimimos sin costo. Pasado ese plazo,{" "}
          {BUSINESS.name} no se hace responsable de la foto impresa, y cualquier reclamo por
          pérdida o deterioro debe dirigirse a la institución.
        </p>
      </LegalSection>

      <LegalSection title="6. Cambios y devoluciones">
        <p>
          Las fotos digitales no admiten devolución una vez que están disponibles para descargar,
          porque son contenido digital que no puede devolverse. Si un archivo llega dañado o no
          corresponde a la foto comprada, escríbenos y lo corregimos.
        </p>
        <p>
          Antes de la aprobación del pago puedes pedir la cancelación del pedido; si ya
          transferiste, coordinamos la devolución del monto en bolívares a la misma cuenta.
        </p>
      </LegalSection>

      <LegalSection title="7. Uso de las fotos">
        <p>
          Las fotografías son obra de {BUSINESS.name}, que conserva los derechos de autor. Al
          comprarlas recibes una licencia personal, permanente y no exclusiva para usarlas con
          fines privados: guardarlas, imprimirlas para ti, compartirlas con familiares y
          publicarlas en tus redes personales.
        </p>
        <ul>
          <li>No puedes revenderlas, sublicenciarlas ni usarlas con fines comerciales o publicitarios.</li>
          <li>No puedes quitar la marca de agua de las vistas previas ni redistribuirlas.</li>
          <li>No puedes usar el sitio para acceder a fotos asociadas a otro correo.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Tu cuenta">
        <p>
          La cuenta se identifica por tu correo y se abre con un código de un solo uso que
          enviamos a ese correo. Eres responsable de mantener el acceso a tu buzón. Si crees que
          alguien más entró con tu correo, avísanos.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilidad">
        <p>
          Hacemos lo razonable para que el sitio funcione de forma continua y segura, pero no
          garantizamos disponibilidad ininterrumpida. Nuestra responsabilidad frente a un pedido
          se limita al monto pagado por ese pedido.
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios en estas condiciones">
        <p>
          Podemos actualizar estas condiciones. La versión vigente es la publicada en esta
          página; cada pedido guarda la fecha de la versión que aceptaste al crearlo.
        </p>
      </LegalSection>

      <LegalSection title="11. Ley aplicable">
        <p>
          Estas condiciones se rigen por las leyes de la República Bolivariana de Venezuela.
          Antes de cualquier reclamo formal, escríbenos: casi todo se resuelve por WhatsApp o
          correo.
        </p>
        <p>
          Consulta también nuestra{" "}
          <Link href={LEGAL_PATHS.privacy} className="underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
