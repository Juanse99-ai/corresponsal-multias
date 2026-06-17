# Corresponsal · Multidiagnósticos AS

App del punto corresponsal Bancolombia "Barrio Centro Sabanalarga 18" (código 68883).
Cuadre diario, cupo de liquidez de Luis y préstamos internos del fondo.

**Producción:** https://corresponsal-multias.vercel.app

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tema oscuro fintech, acento dorado)
- **Supabase** (Auth + Postgres + RLS) — proyecto compartido con el taller, tablas aisladas con prefijo `corr_`
- **GSAP** (portada de login) + **Framer Motion** (micro-interacciones)
- Deploy objetivo: **Vercel**

## Requisito importante: Node 22

El sistema trae Node 16 por defecto (incompatible con Next 16). Usa Node 22:

```bash
nvm use 22        # o: export PATH="$HOME/.nvm/versions/node/v22.21.0/bin:$PATH"
npm run dev
```

Abre http://localhost:3000

## Accesos

| Rol | Usuario / correo | Contraseña |
|---|---|---|
| Admin (Juan) | juansebastiancervantespadilla@gmail.com | `MultiAS2026!` |
| Operador (Ivana) | `ivana` | `121314` |

> Ivana entra solo con su nombre (`ivana`). El login acepta usuario o correo: si no
> lleva `@`, se completa con `@multias.co`. Cambien las contraseñas cuando quieran.

## Módulos

1. **Cuadre diario** (`/cuadre`) — captura de la jornada con saldo final en vivo,
   alerta de descuadre en rojo y `compensado` arrastrado automáticamente.
2. **Cupo de Luis** (`/luis`) — registro de cada consignación con hora; total del
   día y saldo a favor que se arrastra.
3. **Préstamos** (`/prestamos`) — deudas del fondo por persona, abonos y saldo vivo.
   El total pendiente solo lo ve el admin.
4. **Historial** (`/historial`, solo admin) — todos los cierres, filtro por fechas y
   exportación a Excel.
5. **Panel** (`/panel`) — dashboard con estado del día (distinto para admin y operador).

## La fórmula del cuadre

```
SALDO FINAL = TOTAL TIRILLA
            − Sr. Luis − Efectivo(consig.) − Retiros cash
            − Compensado − Nequis − Préstamos + Retiros reales
```

`SALDO FINAL` debe ser `$0`. El sobrante de liquidez de Luis se arrastra al día
siguiente: `compensado(mañana) = −saldo_final(hoy)`.

## Base de datos

Tablas (todas con prefijo `corr_`, RLS activado): `corr_profiles`,
`corr_consignaciones_luis`, `corr_cuadres`, `corr_deudas`, `corr_abonos`.
El esquema versionado está en [`supabase/migrations/`](supabase/migrations).

## Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # clave publishable
```
