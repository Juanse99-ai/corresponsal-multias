# Puente del corresponsal (plugin de OpenClaw)

Lleva las fotos de los comprobantes del grupo de WhatsApp "Corresponsal" a la
App Corresponsal, sin IA de por medio y sin escribir nunca en el grupo.

- Cada foto que **el dueño** manda en el grupo se envía a
  `/api/agente/comprobante`. La app la lee con su lector de tirillas y decide
  (opción A): lo seguro queda como consignación del Sr. Luis; lo dudoso queda
  pendiente en "Llenar desde fotos" del día y avisa al celular del admin.
- Las fotos de **las operadoras** (`config.operadoras`) van igual que las del
  dueño.
- Cada foto que **el Sr. Luis** manda en el grupo (con `config.luis`) se envía
  con su texto ("21.8 palos nuevo") a `/api/agente/compensacion`. La app lee
  los pagos de la foto y los deja en "Por confirmar" de la Cuenta del Sr. Luis,
  el día en que él la mandó y con el monto exacto.
- **Ningún mensaje del grupo llega al agente** (`before_dispatch` lo reclama).
- **Ningún envío hacia el grupo sale** (`message_sending` y
  `reply_payload_sending` lo cancelan). En el grupo hay clientes.

Los números de teléfono y el ID del grupo que aparecen en este archivo son
inventados: los reales viven solo en `~/.openclaw/openclaw.json` del Mac. Al
copiar un comando, cambia los de ejemplo por los reales.

Probado con un OpenClaw simulado en `test/corresponsal-puente.test.ts` y
cargado en un OpenClaw 2026.11.3 real (`plugins inspect --runtime`: estado
`loaded`, los 4 ganchos registrados, sin diagnósticos). Sin WhatsApp de por
medio falta confirmar los formatos de `conversationId` y `senderId`: para eso
está el modo `diagnostico`. La lógica está en `puente.js`; `index.js` solo la
entrega a OpenClaw.

## 1. Vercel (App Corresponsal)

Variables del proyecto (Production):

- `AGENTE_TOKEN`: una clave larga al azar. Se genera en la Terminal con
  `openssl rand -hex 32`. Es la misma que va en el plugin.
- `SUPABASE_SERVICE_ROLE_KEY` y `ANTHROPIC_API_KEY`: ya deberían estar (las
  usan la clave de caja y el lector de fotos).

Después de agregar la variable, vuelve a desplegar.

## 2. Instalar el plugin en el Mac

```bash
mkdir -p ~/openclaw-plugins && cd ~/openclaw-plugins
git clone --depth 1 https://github.com/Juanse99-ai/corresponsal-multias tmp
cp -R tmp/openclaw/corresponsal-puente . && rm -rf tmp
openclaw plugins install --link --force --accept-capabilities ~/openclaw-plugins/corresponsal-puente
```

OpenClaw avisa que el plugin viene de una carpeta local y no de ClawHub: es
normal, el código es este. `--force` confirma esa carpeta y
`--accept-capabilities` acepta lo que declara (no pide permisos extra).

Configurarlo (cambia `TU_TOKEN` por el `AGENTE_TOKEN` de Vercel, y el grupo y
el número por los reales):

```bash
openclaw config set plugins.entries.corresponsal-puente.config '{"grupo":"120363000000000000@g.us","dueno":"+573005550101","url":"https://corresponsal-multias.vercel.app/api/agente/comprobante","token":"TU_TOKEN","diagnostico":true}' --strict-json
openclaw config set channels.whatsapp.pluginHooks.messageReceived true
openclaw gateway restart
openclaw plugins inspect corresponsal-puente --runtime --json
```

En el `inspect` deben aparecer los ganchos `message_sending`,
`reply_payload_sending`, `before_dispatch` y `message_received`.

## 3. Abrir el grupo (solo después del paso 2)

El grupo estaba apagado (`groupPolicy: "disabled"`). Para que el puente vea
las fotos, OpenClaw tiene que admitir los mensajes del dueño en ese grupo:

```bash
openclaw config set channels.whatsapp.groups '{"120363000000000000@g.us":{"requireMention":false,"tools":{"deny":["group:runtime","group:fs"]}}}' --strict-json
openclaw config set channels.whatsapp.groupAllowFrom '["+573005550101"]' --strict-json
openclaw config set channels.whatsapp.groupPolicy "allowlist"
openclaw gateway restart
```

## 4. Probar

```bash
openclaw logs --follow | grep corresponsal-puente
```

Manda un comprobante en el grupo. En el registro debe salir una línea
`diagnóstico: ...` y después `Foto ...: guardado` (o `revisar` con el motivo).
En la app, la consignación aparece en la Cuenta del Sr. Luis; si quedó para
revisar, la foto sale en "Llenar desde fotos" del día.

Si sale `diagnóstico` pero no se reenvía, pega esa línea: dice cómo llega el
remitente y el chat. Cuando todo funcione, apaga el diagnóstico:

```bash
openclaw config set plugins.entries.corresponsal-puente.config.diagnostico false
```

## Resumen de las 7

Todos los días a las 7:00 a.m. (Bogotá) llega al chat del dueño un resumen:
cuadre de ayer, consignaciones y saldo del Sr. Luis, fotos por revisar de la
última semana, préstamos por cobrar y, del taller, carros abiertos por estado
y OT completadas sin pagar.

Es una tarea de OpenClaw de tipo comando: corre `resumen.js`, que pide el texto
a `/api/agente/resumen` con la misma url y clave del plugin, y OpenClaw manda lo
que imprime. No pasa por la IA ni gasta del plan de Claude.

Crearla (una sola vez, después de copiar la carpeta actualizada):

```bash
openclaw automations create "0 7 * * *" --tz America/Bogota --exact --name "Resumen de las 7" --command-argv "[\"$(command -v node)\", \"$HOME/openclaw-plugins/corresponsal-puente/resumen.js\"]" --announce --channel whatsapp --to "+573005550101"
```

Probarla sin esperar a las 7 (usa el id que muestra `openclaw automations list`):

```bash
node ~/openclaw-plugins/corresponsal-puente/resumen.js
openclaw automations run <id>
```

El primero imprime el resumen en la Terminal; el segundo lo manda al WhatsApp.
Si `node` cambia de lugar (por ejemplo, otra versión con nvm), borra la tarea
con `openclaw automations remove <id>` y créala de nuevo.

## Avisos por WhatsApp

Dos tareas más, del mismo tipo que el resumen (comando, sin IA): te llegan a tu
chat contigo mismo y, si no hay nada que decir, no llega nada.

- **Avisos** cada 15 minutos, de 7 a. m. a 9 p. m.: las fotos que entraron
  solas por el grupo y quedaron por revisar desde la vuelta anterior
  (`avisos.js`, que guarda hasta dónde llegó en
  `~/.openclaw/corresponsal-avisos.json`).
- **Cierre** a las 4:55 p. m.: si el día sigue abierto o quedó con descuadre
  (`cierre.js`). Es el mismo aviso que llega al navegador.

Crearlas (una sola vez, después de copiar la carpeta actualizada; el número es
el del dueño, el mismo del resumen):

```bash
openclaw automations create "*/15 7-21 * * *" --tz America/Bogota --exact --name "Avisos del corresponsal" --command-argv "[\"$(command -v node)\", \"$HOME/openclaw-plugins/corresponsal-puente/avisos.js\"]" --announce --channel whatsapp --to "+573005550101"
openclaw automations create "55 16 * * *" --tz America/Bogota --exact --name "Cierre del corresponsal" --command-argv "[\"$(command -v node)\", \"$HOME/openclaw-plugins/corresponsal-puente/cierre.js\"]" --announce --channel whatsapp --to "+573005550101"
```

Probarlas sin esperar: `node ~/openclaw-plugins/corresponsal-puente/avisos.js`
(la primera vez mira la última media hora) y `node .../cierre.js`.

### A las operadoras

OpenClaw está vinculado al WhatsApp del dueño: lo que le llegue a una operadora
sale desde ese número (por eso el mensaje empieza con *Corresponsal*). No tiene
costo: es WhatsApp normal, no la API de pago, y estas tareas no usan IA.

- Cuando una operadora manda una foto al grupo, el puente anota cómo quedó
  (registrada, por revisar o no llegó) en `~/.openclaw/corresponsal-operadoras.jsonl`.
- `operadoras.js +57...` (una tarea cada 5 minutos por operadora) le manda lo
  suyo y vacía su parte de la bandeja.
- El recordatorio de cierre también le puede llegar: es otra tarea de
  `cierre.js` con su número.

OpenClaw solo escribe por privado a quien está en `channels.whatsapp.allowFrom`,
así que la operadora va ahí. Eso también la dejaría hablar con el agente: el
puente reclama sus mensajes privados antes (`before_dispatch`), igual que los
del grupo, y no deben marcarse como leídos en el teléfono del dueño:

```bash
openclaw config set channels.whatsapp.sendReadReceipts false
openclaw config set channels.whatsapp.allowFrom '["+573005550101","+573005550142"]' --strict-json
```

```bash
openclaw automations create "*/5 7-21 * * *" --tz America/Bogota --exact --name "Avisos a la operadora" --command-argv "[\"$(command -v node)\", \"$HOME/openclaw-plugins/corresponsal-puente/operadoras.js\", \"+573005550142\"]" --announce --channel whatsapp --to "+573005550142"
openclaw automations create "55 16 * * *" --tz America/Bogota --exact --name "Cierre a la operadora" --command-argv "[\"$(command -v node)\", \"$HOME/openclaw-plugins/corresponsal-puente/cierre.js\"]" --announce --channel whatsapp --to "+573005550142"
```

Además la app les manda una notificación (sin WhatsApp) si activan los avisos
en la hoja Tú.

## Compensaciones del Sr. Luis

Las fotos de pagos que manda el Sr. Luis (app de Bancolombia, tirilla Redeban
o recibo del cajero, con la referencia 68883) se leen solas. La app suma los
pagos y la compara con los palos del texto (palos = millones).

Para encenderlo, primero actualiza la carpeta (ver "Actualizarlo") y reinicia
el gateway, para que cargue las opciones nuevas del plugin. Si no, rechaza el
número con "must not have additional properties: luis". Después:

```bash
openclaw gateway restart
openclaw config set plugins.entries.corresponsal-puente.config.luis '"+59995550199"' --strict-json
openclaw config set channels.whatsapp.groupAllowFrom '["+573005550101","+59995550199"]' --strict-json
openclaw gateway restart
```

El número va entre comillas dobles y estas dentro de comillas simples, con
`--strict-json`: sin eso OpenClaw lo toma como número y lo rechaza con "must be
string". El tercer comando deja que OpenClaw vea los mensajes de Luis en el
grupo. El agente igual no los procesa ni contesta: el plugin los reclama antes.

Queda encendido cuando el registro dice "Activo: bloqueo del grupo y reenvío
de fotos (y compensaciones del Sr. Luis)".

Luis también manda al grupo fotos que no son pagos (un pedido con el número de
un Nequi). Si la foto no muestra ningún pago y el texto no dice palos, la app
la descarta y no avisa: en el registro sale `descartada (La foto no muestra
pagos)`. Si era una compensación y la foto no se leyó, súbela a mano.

Mientras `COMPENSACIONES_AUTO` no esté en `1` en Vercel, las demás quedan en "Por
confirmar" y llega un aviso al celular del admin. Cuando ya se vea que lee
bien (una semana), se crea `COMPENSACIONES_AUTO=1` en Vercel y se vuelve a
desplegar: desde ahí lo que cuadra con los palos y no tiene dudas se guarda
solo, y lo demás sigue quedando por confirmar.

Si una foto de Luis no llega, mira el registro con `diagnostico` encendido: la
línea dice en qué terminan los dígitos del remitente. Si no termina en lo mismo que el número de Luis,
WhatsApp está mandando otro identificador y hay que ajustar `config.luis`.

## Operadoras

Las fotos que manda una operadora del punto en el grupo se tratan igual que las
del dueño: van a `/api/agente/comprobante` y la app decide si quedan como
consignación del Sr. Luis o para revisar.

Primero actualiza la carpeta (ver "Actualizarlo") y reinicia el gateway; si no,
OpenClaw rechaza la opción con "must not have additional properties:
operadoras". Después (en `groupAllowFrom` van los que ya estaban más el de la
operadora):

```bash
openclaw gateway restart
openclaw config set plugins.entries.corresponsal-puente.config.operadoras '["+573005550142"]' --strict-json
openclaw config set channels.whatsapp.groupAllowFrom '["+573005550101","+59995550199","+573005550142"]' --strict-json
openclaw gateway restart
```

Queda encendido cuando el registro dice "... con 1 operadora." Un número con
menos de 10 dígitos se ignora.

## Actualizarlo

El plugin del Mac es una copia de esta carpeta. Para traer una versión nueva:

```bash
cd ~/openclaw-plugins && git clone --depth 1 https://github.com/Juanse99-ai/corresponsal-multias tmp
cp tmp/openclaw/corresponsal-puente/*.js tmp/openclaw/corresponsal-puente/*.json tmp/openclaw/corresponsal-puente/README.md corresponsal-puente/ && rm -rf tmp
openclaw plugins reload corresponsal-puente
```

La configuración (grupo, clave, url) no se toca: vive en `~/.openclaw/openclaw.json`.

## Si algo falla

El registro (`openclaw logs --follow | grep corresponsal-puente`) dice qué pasó:

- "no tiene la entrada del agente": producción en Vercel quedó con una versión
  vieja. En Deployments, al último de `main`, Redeploy (no el botón del aviso
  de variables, que puede volver a publicar una versión anterior).
- "no aceptó la clave": `config.token` no es igual a `AGENTE_TOKEN`. Ojo:
  `openclaw config get ...token` muestra la clave tapada (`__OPENCLAW_REDACTED__`),
  no la real; no la copies de ahí.
- "está apagada": falta `AGENTE_TOKEN` o `SUPABASE_SERVICE_ROLE_KEY` en Vercel.

En los tres casos la foto no se pierde en WhatsApp: súbela a mano en la app.

## Apagarlo

```bash
openclaw config set channels.whatsapp.groupPolicy "disabled"
openclaw plugins disable corresponsal-puente
openclaw gateway restart
```
