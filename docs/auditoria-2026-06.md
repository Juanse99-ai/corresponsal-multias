# Auditoría anti-robos y pérdidas — App del Corresponsal

**Para:** Juan (dueño) · **Generada:** jun 2026 · 65 hallazgos · 39 graves confirmados
(Auditoría multi-agente: 5 dimensiones + verificación adversarial + síntesis)

## Resumen ejecutivo

Al momento de la auditoría, la app no protegía bien el dinero: un operador podía editar,
borrar y reescribir cuadres, consignaciones, compensaciones y préstamos sin dejar rastro y
sin restricción de permisos. No había bitácora de cambios, ni candado al cerrar el día, y los
permisos de la base estaban abiertos (`using(true)`), por lo que las protecciones de pantalla
se saltaban desde la API. Riesgo principal: falsear números para ocultar un faltante sin que
se pueda detectar después.

## Top prioridades

1. **Sin historial de cambios (bitácora).** Un cambio sobrescribe el dato sin guardar qué
   tenía antes ni quién lo hizo. → Tabla `corr_audit_log` con triggers (quién, cuándo, antes/después).
2. **Día cerrado sin candado: se puede reabrir y reescribir.** → Bloquear edición de día
   cerrado en servidor y base; reabrir solo admin, registrando la reapertura.
3. **Permisos de base abiertos (`using(true)`).** → Cerrar por rol: operador solo el día
   abierto; borrar y datos sensibles solo admin.
4. **Préstamos/compensaciones sin control ni soporte.** → Aprobación admin + soporte obligatorio.
5. **Borrado físico sin restricción (soportes, consignaciones).** → Borrado lógico
   (`deleted_at`), eliminar solo admin, no borrar archivos.
6. **Retiros y cierre con descuadre sin aviso.** → Soporte para retiros, bloquear cierre
   descuadrado, alerta automática al admin.

## Resto de hallazgos confirmados

- Crítica: `corr_soportes`, `corr_compensaciones_luis` aplicadas sin migración versionada.
- Crítica: `saldo_luis_cierre` snapshot puede desincronizarse → calcular siempre desde movimientos.
- Alta: no se registra quién editó (solo el creador) → `updated_by`.
- Alta: operar/editar en días ya cerrados (consignaciones, deudas) → validar en servidor y base.
- Alta: falta doble verificación/firma del cierre.
- Media: `/prestamos` legible por operador → restringir a admin por permiso.
- Media: operador podría cambiarse el rol vía API → impedir editar columna `rol`.
- Media: llave Supabase en el código (es la PUBLISHABLE/pública; el control real es RLS) → pasar a env.
- Media: descuadre solo avisa con color → notificación automática.
- Media: sin pantalla de cambio de contraseña / gestión de usuarios.
- Media: sin exportación/respaldo general (xlsx ya instalado).

## Mejoras de fondo

Bitácora con triggers · borrado lógico · permisos por rol + candado en base · conciliación
mensual del saldo de Luis firmada por admin · estado "revisado/aprobado" en el cierre ·
alertas automáticas · migraciones versionadas en git.

**Conclusión:** el patrón se repite — sin rastro + sin candado + permisos abiertos. Atacar
1, 2 y 3 cierra la mayor parte del riesgo.
