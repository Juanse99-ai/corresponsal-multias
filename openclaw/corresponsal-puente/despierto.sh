#!/bin/bash
# Mantiene despierto el Mac del puente en horario de trabajo (17 nov 2026, lo
# pidió el dueño): si el Mac se duerme, OpenClaw no recibe las fotos del grupo.
# Lo lanza un LaunchAgent a las 7:00 y al iniciar sesión (com.corresponsal.despierto,
# ver README). Fuera de horario no hace nada. caffeinate -i evita el sueño por
# inactividad (también con batería) y -s el del sistema con cargador. Con la
# tapa cerrada el Mac igual se duerme, salvo con pantalla externa y cargador.
fin=21
hora=$((10#$(date +%H)))
if [ "$hora" -lt 7 ] || [ "$hora" -ge "$fin" ]; then exit 0; fi
ahora=$(date +%s)
hasta=$(date -j -f "%Y-%m-%d %H:%M:%S" "$(date +%Y-%m-%d) $fin:00:00" +%s)
exec /usr/bin/caffeinate -i -s -t $((hasta - ahora))
