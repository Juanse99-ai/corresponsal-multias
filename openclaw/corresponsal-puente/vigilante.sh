#!/bin/bash
# Vigilante de OpenClaw (18 nov 2026, lo pidió el dueño): el 17 nov a las
# 9:01 p. m. OpenClaw quedó apagado con "openclaw gateway stop" y no volvió a
# arrancar; esa mañana no entró ninguna foto del grupo. Cada 5 minutos, de
# 7 a. m. a 9 p. m., revisa si el servicio de OpenClaw está corriendo y, si no,
# lo enciende. Lo lanza el LaunchAgent com.corresponsal.vigilante.
#
# Para apagar OpenClaw a propósito (mudanza, mantenimiento) sin que el
# vigilante lo vuelva a encender, crea el archivo de pausa:
#   touch ~/.openclaw/corresponsal-pausa      (y bórralo para reanudar)
# Con VIGILANTE_SOLO_REVISAR=1 solo dice qué haría.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
BASE="${OPENCLAW_HOME:-$HOME/.openclaw}"
REGISTRO="$BASE/logs/corresponsal-vigilante.log"
mkdir -p "$BASE/logs"
anotar() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$REGISTRO"; }

hora=$((10#$(date +%H)))
if [ "$hora" -lt 7 ] || [ "$hora" -ge 21 ]; then exit 0; fi
if [ -e "$BASE/corresponsal-pausa" ]; then exit 0; fi

estado=$(launchctl print "gui/$(id -u)/${VIGILANTE_SERVICIO:-ai.openclaw.gateway}" 2>/dev/null | awk -F'= ' '/^\tstate = /{print $2; exit}')
if [ "$estado" = "running" ]; then
  [ -n "$VIGILANTE_SOLO_REVISAR" ] && echo "OpenClaw está corriendo: no hago nada."
  exit 0
fi

if [ -n "$VIGILANTE_SOLO_REVISAR" ]; then
  echo "OpenClaw no está corriendo (estado: ${estado:-no cargado}): lo encendería."
  exit 0
fi
anotar "OpenClaw no estaba corriendo (estado: ${estado:-no cargado}); lo enciendo."
if openclaw gateway start >> "$REGISTRO" 2>&1; then
  anotar "Encendido."
else
  anotar "No se pudo encender (código $?)."
fi
