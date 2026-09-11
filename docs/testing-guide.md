# Guía de pruebas · Fase 1

Dos recorridos completos: uno como **cliente** (graduando) y otro como **admin**
(el negocio). Cada paso dice qué hacer, qué debe pasar y qué correos o filas
en la base de datos esperar.

## Antes de empezar

1. Servidor corriendo desde `C:\Projects\lacasadegrado`:

   ```bash
   npm run dev
   ```

   Abre `http://localhost:3000`. Si Next se queja de que ya hay otro `next dev`,
   ciérralo primero (no pueden correr dos en la misma carpeta).

2. **Dos correos distintos**. El admin ya es `samd.development@gmail.com`.
   Para el cliente usa otro buzón, o un alias de Gmail como
   `samd.development+cliente@gmail.com`: Supabase lo trata como un usuario
   aparte y el correo llega al mismo inbox. Escribe siempre el alias
   exactamente igual (el etiquetado de fotos se hace por correo).

3. **Entre 3 y 6 fotos JPG reales** de cámara o teléfono (5 a 15 MB está bien;
   el máximo es 60 MB). Ten a mano una captura de pantalla cualquiera (JPG o
   PNG, menos de 8 MB) para usarla como "comprobante".

4. Un teléfono con WhatsApp para probar el enlace `wa.me`. El número que abre
   es el de `NEXT_PUBLIC_WHATSAPP_NUMBER`.

5. Para mirar filas en la base de datos: Supabase → proyecto **LCDG** →
   Table Editor. Las tablas que verás nombradas abajo son `photo_tags`,
   `orders`, `payments`, `entitlements`, `download_logs`,
   `support_messages`, `exchange_rates`, `otp_attempts`.

6. Los correos salen de `noreply@lacasadegrado.com`. Si uno no llega en un
   minuto, revisa spam.

7. **Buzón de soporte.** Los mensajes del formulario de Ayuda llegan a la
   dirección de `SUPPORT_NOTIFY_EMAIL` en `.env.local`. No depende de
   quiénes sean admins: es una sola dirección. Cámbiala y reinicia el
   servidor.

Tiempos normales en desarrollo: las acciones tardan entre 1 y 5 segundos
(la base de datos está en Oregón); cada foto subida tarda unos 10 segundos
(se generan dos derivados y se suben tres archivos).

Datos de prueba que ya existen y no estorban: dos eventos, cuatro fotos
sintéticas, dos pedidos del admin, unos mensajes de soporte. Puedes ignorarlos
o borrarlos desde el Table Editor.

---

## Guía A · Admin

### A1. Entrar

- Ve a `http://localhost:3000/login`, escribe el correo admin, pulsa
  **Enviar código**.
- Espera: pantalla cambia al paso del código, cuenta regresiva de 60 s en
  "Reenviar código". Llega un correo **"Tu código para entrar a La Casa de
  Grado"** con seis dígitos.
- Escribe el código. Al sexto dígito se envía solo.
- Espera: aterrizas en `/dashboard` ("Mis fotos"). Ve a
  `http://localhost:3000/admin`.
- Espera: redirige a `/admin/events`, con la barra Eventos · Fotos · Pagos ·
  Tasa y el distintivo "Administración".

### A2. Eventos

- Crea un evento: nombre, institución, fecha. Observa que el
  **identificador** se rellena solo (`acto-de-grado-...-2026`). Edítalo a
  mano y verifica que deja de autocompletarse.
- Espera: mensaje "Evento «…» creado.", el formulario se limpia, la tabla
  muestra el evento con 0 fotos y badge **Activo**.
- Intenta crear otro con el mismo identificador.
- Espera: error bajo el campo "Ya existe un evento con este identificador."
- Pulsa **Desactivar** y luego **Activar**. El badge cambia cada vez.
  Un evento inactivo no aparece en la galería del cliente ni en la portada.
- Pulsa **Editar** en una fila: se abre un diálogo con los datos actuales.
  Cambia el nombre y guarda.
- Espera: el diálogo se cierra y la fila muestra el nombre nuevo. Un
  identificador repetido da error dentro del diálogo.
- **Eliminar** solo está activo en eventos sin fotos (en los demás aparece
  apagado con la explicación al pasar el ratón). Crea un evento vacío,
  elimínalo y confirma en el diálogo: desaparece de la tabla.

### A3. Tasa de cambio

- Ve a **Tasa**. Verás la tasa vigente, su origen y fecha, y debajo la
  referencia en vivo de DolarApi (BCV oficial y paralelo).
- Pulsa **Actualizar desde DolarApi (BCV oficial)**.
- Espera: mensaje "Tasa actualizada desde DolarApi: …" y una fila nueva en el
  historial con origen "DolarApi · BCV oficial".
- Fija una tasa a mano (por ejemplo `900,00`) y pulsa **Fijar tasa**.
- Espera: mensaje "Tasa fijada en 900,00 Bs/USD." y fila con origen "Manual".
  Esa será la tasa de los próximos pedidos.
- Regla: si la tasa guardada tiene más de 12 horas, el sistema consulta
  DolarApi solo al momento de crear un pedido. Vuelve a poner la tasa de
  DolarApi antes de seguir si quieres montos realistas.

### A4. Subir fotos

- Ve a **Fotos**, elige el evento del A2.
- Deja el precio (5,00 USD) o cámbialo; se aplica al lote.
- Selecciona 3 a 6 JPG a la vez.
- Espera: la lista muestra cada archivo pasando por "En espera" →
  "Subiendo…" → "Lista", dos a la vez, unos 10 s por foto. Al terminar, la
  cuadrícula de abajo se recarga sola con las vistas previas **borrosas y con
  marca de agua** y el precio por foto.
- Prueba un archivo que no sea imagen (un PDF) o uno mayor de 60 MB.
- Espera: esa fila queda en "Error" con el motivo; las demás continúan.
- Comprueba en Cloudflare R2: por cada foto hay tres objetos,
  `originals/<evento>/…`, `previews/<evento>/….webp` y `clean/<evento>/….webp`.
  El original es idéntico al archivo subido.
- En la cuadrícula del admin las fotos se ven **sin marca de agua**
  (el admin siempre ve la versión limpia). Pulsa el ojo en la esquina de una
  foto: se abre grande sobre fondo negro; cierra con la × o con Escape.
- Cambia el precio de una foto en su tarjeta y pulsa **Guardar**.
- Espera: "Guardar" se apaga al quedar igual que lo guardado. El precio
  nuevo solo aplica a pedidos futuros; los pedidos ya creados conservan el
  suyo.
- Pulsa la papelera de una foto que **no** esté en ningún pedido y confirma.
- Espera: la tarjeta desaparece y en R2 se borran sus tres objetos. En una
  foto que ya esté en un pedido el diálogo responde "Esta foto está en un
  pedido y no se puede borrar."

### A5. Etiquetar

- En una tarjeta escribe el correo del cliente de prueba y pulsa
  **Etiquetar**. Aparece como chip. Repite el mismo correo.
- Espera: "Ese correo ya está en esta foto."
- Pulsa la **×** del chip. Desaparece (puede tardar unos segundos en
  refrescar).
- En **Etiquetar en lote**, pega algo así (usa nombres reales de tus archivos):

  ```
  archivo,correo
  IMG_0412.jpg,samd.development+cliente@gmail.com
  img_0412,OTRO@correo.com
  IMG_9999.jpg,alguien@correo.com
  IMG_0413.jpg,esto-no-es-correo
  ```

- Espera: resumen con cuántas etiquetas nuevas, cuántas ya existían, la
  lista de archivos no encontrados (`IMG_9999.jpg`) y las líneas inválidas
  con su número. La cabecera se ignora, las mayúsculas y la extensión no
  importan.
- Deja al menos dos fotos etiquetadas con el correo del cliente antes de
  pasar a la guía B.

### A6. Cola de pagos (después de que el cliente envíe su pago, guía B, paso B6)

- Ve a **Pagos**.
- Espera: tarjeta por cada pedido en revisión: cliente, cantidad de fotos,
  monto exacto en Bs con la tasa fijada, referencia, nombre, teléfono, banco,
  y la captura del comprobante a la derecha (o "Sin captura"). Si el cliente
  subió captura, pulsa la imagen: se abre en pestaña nueva desde una URL que
  caduca en 15 minutos.
- Pulsa **Rechazar**. En el diálogo elige un motivo sugerido o escribe uno
  (mínimo 5 caracteres) y pulsa **Rechazar y avisar**.
- Espera: la tarjeta desaparece; aparece en "Últimas decisiones" con el
  motivo. El cliente recibe **"No pudimos confirmar tu pago · pedido XXXX"**
  con el motivo y un botón para reenviar datos.
- Cuando el cliente reenvíe (paso B7), vuelve a **Pagos**.
- Espera: la tarjeta vuelve con el badge **"Reenvío · 1 rechazo"** y la
  referencia nueva.
- Pulsa **Aprobar pago**. El diálogo muestra el monto y el correo. Confirma.
- Espera: la tarjeta desaparece, fila "Aprobado" en decisiones. El cliente
  recibe **"Tus fotos están listas · pedido XXXX"**. En la base de datos:
  `orders.status = paid` con `paid_at`, `payments.status = verified` con
  `verified_by` (tu id) y una fila en `entitlements` por cada foto del
  pedido.
- Intenta aprobar dos veces rápido (dos pestañas): la segunda debe decir
  "Este pedido ya fue revisado o cambió de estado."

### A7. Soporte

- Cuando el cliente use **Ayuda** (paso B9), revisa el buzón de
  `SUPPORT_NOTIFY_EMAIL` (hoy es tu Gmail).
- Espera: correo **"Soporte: <nombre> sobre el pedido XXXX"** (o "mensaje de
  <nombre>") con nombre, correo, teléfono, pedido y el texto. Al responderlo,
  el destinatario es el cliente (reply-to).
- En `support_messages` hay una fila por cada contacto: `channel = form` para
  el formulario y `channel = whatsapp` cuando el cliente pulsó el enlace de
  WhatsApp, aunque nunca llegue a escribir.

### A8. Accesos

- Con el cliente de prueba (no admin) entra a `/admin`.
- Espera: página "Esta página no existe" (404). La barra de admin nunca se
  muestra.
- En una ventana privada, sin sesión, entra a `/admin/events`.
- Espera: redirige a `/login?next=/admin/events`.
- Copia la dirección de una vista previa de la cuadrícula
  (`/api/photos/<id>/preview`) y ábrela en la ventana privada.
- Espera: pantalla en blanco con 401. Con sesión admin sí carga.

### A9. Portada

- Abre `http://localhost:3000/` sin sesión.
- Espera: bajo "Grados ya publicados" aparece el evento del A2 con su fecha y
  cantidad de fotos. Desactiva el evento en Eventos y recarga: desaparece de
  la lista y de la galería del cliente.

---

## Guía B · Cliente

Haz esta guía con el **correo del cliente de prueba**, en otra ventana o en
una ventana privada, para no mezclar sesiones con el admin.

### B1. Portada

- Abre `http://localhost:3000/` sin sesión.
- Espera: titular, tres pasos numerados, lista de grados publicados,
  preguntas frecuentes y un botón "Escribir por WhatsApp" con el número del
  negocio. Arriba a la derecha dice **Iniciar sesión**; el botón grande dice
  **Ver mis fotos**. Ambos llevan a `/login`.
- Con sesión iniciada, la portada cambia a **Ir a mis fotos** y lleva a
  `/dashboard`.

### B2. Entrar

- En `/login` escribe `no-es-un-correo` y pulsa **Enviar código**.
- Espera: "Escribe un correo válido, por ejemplo nombre@correo.com." El texto
  escrito no se borra.
- Escribe el correo del cliente y envía.
- Espera: paso del código; "Reenviar código en 60 s" en cuenta regresiva.
  Llega el correo con el código (asunto "Tu código para entrar a La Casa de
  Grado"). Como es un usuario nuevo, se crea solo.
- Escribe un código equivocado, por ejemplo `000000`.
- Espera: "El código no es correcto. Revisa tu correo e intenta de nuevo."
  Las casillas se vacían. Cinco errores seguidos dan "Demasiados intentos con
  este código. Pide un código nuevo para continuar." y el botón cambia a
  "Pedir un código nuevo".
- Cuando termine la cuenta regresiva, pulsa **Reenviar código**. Llega un
  correo nuevo; el código anterior deja de valer.
- Escribe el código correcto.
- Espera: aterrizas en `/dashboard`. Se creó tu fila en `profiles`.
- Prueba la vuelta: cierra sesión, entra a `http://localhost:3000/cart` sin
  sesión. Redirige a `/login?next=/cart`; tras el código aterrizas en
  `/cart`, no en el dashboard.
- Opcional: pide un código, espera 10 minutos y úsalo. Debe decir "El código
  venció. Pide uno nuevo para continuar."

### B3. Galería

- Si el admin aún no etiquetó tus fotos: pantalla "Todavía no hay fotos para
  este correo" con tu correo visible y botón **Escribir por WhatsApp** que
  abre un mensaje ya escrito con tu correo.
- Cuando el admin te haya etiquetado (A5), recarga.
- Espera: tus fotos agrupadas por evento (nombre, institución, fecha,
  cantidad), en cuadrícula tipo mosaico que **no salta** mientras cargan.
  Cada una borrosa y con marca de agua, con precio y botón **Agregar al
  carrito**. Fotos de otros correos no aparecen.
- Pulsa **Agregar al carrito** en dos fotos.
- Espera: el botón pasa a **En el carrito**, la tarjeta gana borde negro, y
  el enlace "Carrito" de la barra muestra un **2**. Recarga la página: sigue
  igual (el carrito vive en el navegador). Vuelve a pulsar y se quita.
- Copia la dirección de una vista previa y ábrela en pestaña nueva:
  carga. Espera 15 minutos y recarga esa pestaña de R2: caducó.
- Pulsa el **ojo** en la esquina de una foto: se abre grande. Si la foto
  no es tuya, sigue borrosa y con marca de agua también en grande; si ya es
  tuya, se ve limpia. Cierra con la × o con Escape.

### B4. Carrito

- Pulsa **Carrito** en la barra.
- Espera: una línea por foto con miniatura, evento, precio; subtotal y
  total en USD; nota de que los bolívares se calculan al pagar.
- Pulsa **Quitar** en una y vuélvela a agregar desde la galería.
- Vacía el carrito: aparece "Tu carrito está vacío" con enlace a la galería.
- Con fotos, pulsa **Pagar**.

### B5. Elegir cómo pagar

- Espera: en `/checkout`, las fotos, el total en dólares, el **total en
  bolívares** y una línea "Tasa … Bs/USD (fecha). Se fija al crear el
  pedido." Métodos: Pago Móvil y Transferencia bancaria activos; Binance,
  PayPal y Tarjeta deshabilitados con "Próximamente".
- Elige **Pago Móvil** y pulsa **Continuar al pago**.
- Espera: breve "Pedido creado" y pasas a `/checkout/<id>/payment`. El
  carrito queda vacío (el badge desaparece). En `orders` hay una fila
  `pending_payment` con `exchange_rate` congelada y en `order_items` una
  fila por foto con su precio de ese momento.

### B6. Enviar los datos del pago

- Espera: **monto exacto en Bs** (total × tasa), los datos del negocio con
  el monto como última fila (hoy son marcadores de posición: teléfono
  0412-0000000, cuenta 0102-0000…), un solo botón **Copiar todos los
  datos**, y el formulario.
- Pulsa **Copiar todos los datos** y pega en cualquier sitio.
- Espera: el botón dice "Datos copiados" dos segundos. Lo pegado es un
  bloque de líneas `Banco: 0102`, `Teléfono: 04120000000`, `Cédula:
  V00000000`, `Monto: 8.137,36` (solo dígitos en teléfono y cédula, para que
  la app del banco los reconozca). En transferencia: banco, cuenta, titular,
  RIF y monto.
- Pulsa **Ya pagué, enviar datos** con todo vacío.
- Espera: "Revisa los campos marcados." y un mensaje bajo cada campo.
- Rellena: referencia (solo letras, números y guiones), nombre, teléfono,
  banco (hay sugerencias), y adjunta la captura.
- Prueba primero un archivo de más de 8 MB o un PDF: error bajo el campo.
- Envía con datos válidos.
- Espera: pasas a `/orders/<id>` con estado **En revisión**, la línea de
  tiempo (Pedido creado → Datos de pago enviados con tu referencia → En
  revisión) y el resumen con USD, Bs, método y tasa. Llega el correo
  **"Recibimos tu pago del pedido XXXX"** con referencia y monto. En
  `payments` hay una fila `submitted` con `proof_key` bajo `proofs/`.
- Vuelve a abrir `/checkout/<id>/payment`.
- Espera: redirige al pedido; no se puede enviar dos veces.

### B7. Rechazo y reenvío (cuando el admin rechace, A6)

- Espera: correo **"No pudimos confirmar tu pago · pedido XXXX"** con el
  motivo y el botón "Enviar nuevos datos de pago".
- Abre `/orders/<id>`.
- Espera: estado **Rechazado**, el motivo en la línea de tiempo y el botón
  **Enviar nuevos datos de pago**.
- Púlsalo. La página de pago muestra el aviso del rechazo con el motivo.
  Envía una referencia nueva.
- Espera: el pedido vuelve a **En revisión** con la referencia nueva. Llega
  otro "Recibimos tu pago".

### B8. Aprobación y descargas (cuando el admin apruebe, A6)

- Espera: correo **"Tus fotos están listas · pedido XXXX"** con botón
  "Descargar mis fotos".
- Abre `/orders/<id>`: estado **Aprobado**, "Pago verificado" con fecha y
  botón **Ver mis compras**.
- En la galería, esas fotos ahora dicen **Ya es tuya · Ver** en vez de
  "Agregar al carrito".
- Abre **Compras**.
- Espera: la foto aparece borrosa un instante y **se enfoca** al cargar (el
  único movimiento de la app; con "reducir movimiento" activado en el
  sistema el cambio es inmediato). Nombre de archivo y botón **Descargar**
  por foto; arriba, **Descargar todas (.zip)** si hay más de una.
- Pulsa **Descargar** en una.
- Espera: se descarga el **archivo original** con su nombre original (mismo
  tamaño que subió el admin, sin marca de agua). En `download_logs` hay una
  fila con tu IP y navegador. El enlace de R2 que se abre caduca en 60 s.
- Pulsa **Descargar todas (.zip)**.
- Espera: `la-casa-de-grado-fotos.zip` con una carpeta por evento y dentro
  los originales. Una fila más en `download_logs` por foto.
- Vuelve a la galería e intenta comprar de nuevo una foto que ya es tuya:
  no hay botón. Si la tuvieras en el carrito de antes, el carrito avisa
  "ya son tuyas y no se cobrarán" y ofrece quitarlas.

### B9. Ayuda

- En cualquier página con sesión hay un botón **Ayuda** abajo a la derecha.
  Ábrelo desde `/orders/<id>`.
- Espera: el diálogo dice "Estamos viendo tu pedido XXXX". El botón
  **Chatear por WhatsApp** abre WhatsApp con un mensaje que incluye tu correo
  y el pedido. En `support_messages` aparece una fila `whatsapp` al pulsarlo.
- En el formulario, envía con el mensaje demasiado corto.
- Espera: "Cuéntanos un poco más, al menos 10 caracteres."
- Envía uno válido.
- Espera: "Recibimos tu mensaje. Te respondemos a <tu correo> lo antes
  posible." El admin recibe el correo del A7. Fila `form` en
  `support_messages`.
- Envía seis mensajes en una hora: el sexto responde "Ya nos enviaste varios
  mensajes…".

### B10. Salir

- Pulsa **Cerrar sesión**.
- Espera: vuelves a la portada. Entrar a `/dashboard`, `/cart`,
  `/checkout`, `/dashboard/purchases` u `/orders/<id>` sin sesión redirige
  a `/login` con `next`.
