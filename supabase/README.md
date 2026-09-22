# Supabase — App Corresponsal

Proyecto compartido con el taller (`hpndvrjjizzkusuuhefb`). Todo lo del corresponsal
vive con prefijo `corr_` y su propio RLS. **No tocar las tablas del taller.**

## Migraciones
- `migrations/0001_corresponsal_init.sql` — esquema completo, RLS, funciones de rol.

(El endurecimiento de funciones quedó incluido al final del 0001 en esta copia.)

## Usuarios
Se crean en Supabase Auth y cada uno lleva su fila en `corr_profiles` con su `rol`
(`admin` u `operador`). Correos y contraseñas no se escriben en este repo.
