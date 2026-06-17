# Supabase — App Corresponsal

Proyecto compartido con el taller (`hpndvrjjizzkusuuhefb`). Todo lo del corresponsal
vive con prefijo `corr_` y su propio RLS. **No tocar las tablas del taller.**

## Migraciones
- `migrations/0001_corresponsal_init.sql` — esquema completo, RLS, funciones de rol.

(El endurecimiento de funciones quedó incluido al final del 0001 en esta copia.)

## Usuarios sembrados
Creados directo en `auth.users` con contraseña cifrada (pgcrypto) + fila en
`corr_profiles`:

| Rol | Correo | Contraseña inicial |
|---|---|---|
| admin | juansebastiancervantespadilla@gmail.com | `MultiAS2026!` |
| operador | ivana@multias.co | `Ivana2026!` |

Para crear más usuarios: créalos en Supabase Auth y agrega su fila en
`corr_profiles` con el `rol` correspondiente.
