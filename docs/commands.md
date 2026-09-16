# Comandos del proyecto

Todos se ejecutan desde `C:\Projects\lacasadegrado`. Los que tocan la base
de datos o R2 leen las credenciales de `.env.local`.

## Desarrollo

```bash
npm run dev          # servidor de desarrollo en http://localhost:3000
npm run build        # compilación de producción
npm run start        # sirve la compilación de producción
npm run typecheck    # tsc --noEmit
npm run lint         # eslint .
```

Solo puede correr un `next dev` por carpeta. Si Next se queja, cierra el
otro primero.

## Base de datos (Drizzle)

```bash
npm run db:generate  # genera una migración a partir de los cambios en src/common/lib/db/schema
npm run db:migrate   # aplica las migraciones pendientes a DATABASE_URL
npm run db:push      # empuja el esquema sin migración (solo para pruebas locales)
npm run db:studio    # abre Drizzle Studio para mirar las tablas
```

La salida de `db:migrate` muestra avisos `NOTICE` de Postgres que parecen
errores; lo que importa es la línea final "migrations applied successfully".

## Limpiar la base de datos

Borra todo salvo una cuenta y deja esa cuenta como admin sin accesos
especiales. También borra de R2 los archivos de las fotos y comprobantes
eliminados.

```bash
npm run db:purge -- --keep lacasadegrado@gmail.com
```

Sin `--yes` solo muestra qué borraría (ensayo). Para borrar de verdad:

```bash
npm run db:purge -- --keep lacasadegrado@gmail.com --yes
```

El historial de tasas de cambio se conserva. Para borrarlo también (por
ejemplo tras cambiar la moneda):

```bash
npm run db:purge -- --keep lacasadegrado@gmail.com --yes --rates
```

Se borran: usuarios (menos el indicado), eventos, fotos, etiquetas, pedidos,
pagos, derechos de descarga, registros de descargas, mensajes de soporte e
intentos de código. Quien estuviera dentro con una cuenta borrada queda
fuera; vuelve a entrar con el correo admin.

## Almacenamiento (R2)

Las fotos y las capturas de comprobantes se suben desde el navegador
directamente a R2 con URLs firmadas (los servidores de Vercel no aceptan
cuerpos de más de 4,5 MB). Para eso el bucket necesita una regla CORS que
permita `PUT` desde el dominio de la app y desde `http://localhost:3000`.

Si el token de R2 tiene permisos de administración del bucket:

```bash
npm run r2:cors
```

Si el token solo tiene permisos de objetos (el caso actual), añade la
regla a mano en Cloudflare → R2 → bucket → Settings → CORS policy:

```json
[
  {
    "AllowedOrigins": ["https://lacasadegrado.com", "http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "cache-control"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

Cambia el primer origen por el dominio real (con `https://`, sin barra
final). Hasta que exista la regla, subir una foto falla con "Se perdió la
conexión" en el navegador aunque el servidor esté bien.

## Administradores

La persona debe haber entrado al sitio al menos una vez (así existe su
perfil).

```bash
npm run admin:grant -- correo@dominio.com    # convierte en admin
npm run admin:revoke -- correo@dominio.com   # quita el admin
```

Los accesos especiales (ver sin marca de agua, descargar gratis, rol) se
cambian desde el panel, en **Personas**.

## Personas antes de su primer ingreso

Para dar acceso especial a alguien que todavía no ha entrado (una
coordinadora, un profesor), créala antes con sus permisos. Lo mismo hace el
botón **Agregar persona** en el panel, en **Personas**.

```bash
npm run user:create -- correo@dominio.com --download --role "Coordinadora"
```

`--view` da solo ver sin marca de agua; `--download` incluye ver y
descargar. No se envía ningún correo: cuando entre con ese correo, su
código de acceso se asocia a esta cuenta y ve sus fotos de inmediato.

## Mantenimiento

```bash
npm run photos:backfill-clean   # genera el derivado limpio de fotos subidas antes de que existiera
npm run brand:assets            # regenera public/brand/*.png y el ícono a partir del logo SVG
```

## Comprobaciones antes de entregar

```bash
npm run typecheck
npm run lint
npm run build
```
