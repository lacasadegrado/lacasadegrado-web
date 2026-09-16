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

## Administradores

La persona debe haber entrado al sitio al menos una vez (así existe su
perfil).

```bash
npm run admin:grant -- correo@dominio.com    # convierte en admin
npm run admin:revoke -- correo@dominio.com   # quita el admin
```

Los accesos especiales (ver sin marca de agua, descargar gratis, rol) se
cambian desde el panel, en **Personas**.

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
