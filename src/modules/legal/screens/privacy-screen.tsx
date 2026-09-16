import Link from "next/link";

import { BUSINESS } from "@/common/lib/config/business.config";
import { publicEnv } from "@/common/lib/config/env.config";

import { LegalPage, LegalSection } from "../components/legal-page";
import { LEGAL_PATHS } from "../lib/constants/legal.constants";

/**
 * Privacy policy. Lists exactly what the app stores and who processes it,
 * so it must be updated when a new provider or field is added.
 */
export function PrivacyScreen() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro={`Explica qué datos guarda ${BUSINESS.name} cuando usas este sitio, para qué los usa, quién los procesa y cómo puedes pedir que los corrijamos o borremos.`}
    >
      <LegalSection title="1. Responsable">
        <p>
          {BUSINESS.legalName}, RIF {BUSINESS.rif}. Contacto: WhatsApp +
          {publicEnv.NEXT_PUBLIC_WHATSAPP_NUMBER} o el botón de ayuda dentro del sitio.
        </p>
      </LegalSection>

      <LegalSection title="2. Qué datos guardamos">
        <ul>
          <li>
            <strong>Tu correo</strong>, que usas para entrar y con el que el fotógrafo asocia tus
            fotos. Si lo indicas, también tu nombre y teléfono.
          </li>
          <li>
            <strong>Las fotografías</strong> del acto en las que apareces, en su versión original y
            en versiones reducidas para la vista previa.
          </li>
          <li>
            <strong>Datos del pago</strong> que reportas: referencia, nombre de quien pagó,
            teléfono, banco y, si la adjuntas, la captura del comprobante.
          </li>
          <li>
            <strong>Registros técnicos</strong>: la dirección IP y el navegador con los que pides
            un código de acceso o descargas una foto, y la fecha de cada descarga.
          </li>
          <li>
            <strong>Mensajes de soporte</strong> que nos envías por el formulario, y el registro de
            que abriste el enlace de WhatsApp.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Para qué los usamos">
        <ul>
          <li>Mostrarte tus fotos y entregarte las que compras.</li>
          <li>Verificar tus pagos y avisarte por correo del estado de cada pedido.</li>
          <li>Coordinar la entrega de fotos impresas con tu institución.</li>
          <li>Responder tus consultas.</li>
          <li>Proteger el servicio: limitar intentos de acceso y detectar usos indebidos.</li>
        </ul>
        <p>No vendemos tus datos ni los usamos para publicidad de terceros.</p>
      </LegalSection>

      <LegalSection title="4. Quién los procesa">
        <p>
          Usamos proveedores que guardan o transmiten datos por encargo nuestro, algunos fuera de
          Venezuela:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong> (base de datos y autenticación, Estados Unidos): correo,
            perfil, pedidos, pagos y registros técnicos.
          </li>
          <li>
            <strong>Cloudflare R2</strong> (almacenamiento de archivos): las fotografías y las
            capturas de comprobantes.
          </li>
          <li>
            <strong>Resend</strong> (envío de correo): los correos de acceso y de estado de
            pedidos.
          </li>
          <li>
            <strong>WhatsApp</strong>: solo si eliges escribirnos por ese canal; aplica su propia
            política.
          </li>
        </ul>
        <p>
          La tasa de cambio se consulta a un servicio público (DolarApi) sin enviar ningún dato
          personal.
        </p>
      </LegalSection>

      <LegalSection title="5. Cuánto tiempo los conservamos">
        <p>
          Las fotos y tu cuenta se conservan mientras el servicio esté activo, para que puedas
          volver a descargar lo que compraste. Los datos de pago se conservan el tiempo que
          exigen las obligaciones contables y fiscales. Los registros de códigos de acceso se
          borran a las 24 horas.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>
          Puedes pedirnos una copia de los datos que tenemos sobre ti, corregirlos o solicitar que
          borremos tu cuenta y tus fotos. Escríbenos por WhatsApp o por el formulario de ayuda
          desde el correo con el que entras. Si borras la cuenta, pierdes el acceso a las fotos
          compradas.
        </p>
        <p>
          Si apareces en una foto y no quieres que esté disponible en el sitio, dínoslo y la
          retiramos.
        </p>
      </LegalSection>

      <LegalSection title="7. Menores de edad">
        <p>
          Cuando el acto corresponde a menores de edad, la fotografía y la publicación en este
          sitio se hacen con la autorización de la institución y de los representantes. Si eres
          representante y quieres retirar las fotos de un menor, escríbenos.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies y almacenamiento en tu navegador">
        <p>
          Este sitio no usa cookies de publicidad ni de seguimiento. Solo usamos:
        </p>
        <ul>
          <li>Una cookie de sesión, necesaria para mantenerte dentro tras escribir el código.</li>
          <li>
            Almacenamiento local del navegador para recordar tu carrito y tu preferencia de tema
            claro u oscuro. Nunca sale de tu dispositivo.
          </li>
        </ul>
        <p>Por eso no mostramos un aviso de cookies: nada de esto requiere tu consentimiento previo.</p>
      </LegalSection>

      <LegalSection title="9. Seguridad">
        <p>
          Las fotos originales se guardan en un almacenamiento privado y solo se entregan mediante
          enlaces temporales a quien las compró. El acceso al sitio es por código de un solo uso
          enviado a tu correo; no guardamos contraseñas.
        </p>
      </LegalSection>

      <LegalSection title="10. Cambios">
        <p>
          Si cambiamos esta política, actualizamos la fecha de arriba. Consulta también los{" "}
          <Link href={LEGAL_PATHS.terms} className="underline underline-offset-4">
            términos y condiciones
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
