# Supabase — App Corresponsal

Proyecto compartido con el taller (`hpndvrjjizzkusuuhefb`). Todo lo del corresponsal
vive con prefijo `corr_` y su propio RLS. Las tablas del taller están cerradas y no
se tocan desde aquí.

## Migraciones
Una por archivo, con el nombre `<version>_<nombre>.sql` (la versión es la misma con
la que quedó aplicada en la base) y su rollback al lado, `*.down.sql`.

Reglas:
- Toda tabla nueva va con RLS y sus políticas en la misma migración.
- Nunca `using (true)` para `authenticated`: se usa `corr_es_miembro()` o `corr_is_admin()`.
- Nada de claves, tokens ni datos de personas en estos archivos. Los valores de
  `corr_app_config` (VAPID y secreto del cron) se cargan a mano en la base.
- Algunos rollbacks borran datos: cada archivo lo dice en su primera línea. Los del
  esquema inicial y los de las tablas de respaldo están deshabilitados a propósito.

## Usuarios
Se crean en Supabase Auth y cada uno lleva su fila en `corr_profiles` con su `rol`
(`admin` u `operador`) y `activo`. Tener sesión no basta: sin perfil activo la app
no muestra ni deja guardar nada. Correos y contraseñas no se escriben en este repo.
