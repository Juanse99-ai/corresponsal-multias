# Puente del corresponsal (plugin de OpenClaw)

Lleva las fotos de los comprobantes del grupo de WhatsApp "Corresponsal" a la
App Corresponsal, sin IA de por medio y sin escribir nunca en el grupo.

- Cada foto que **el dueño** manda en el grupo se envía a
  `/api/agente/comprobante`. La app la lee con su lector de tirillas y decide
  (opción A): lo seguro queda como consignación del Sr. Luis; lo dudoso queda
  pendiente en "Llenar desde fotos" del día y avisa al celular del admin.
- **Ningún mensaje del grupo llega al agente** (`before_dispatch` lo reclama).
- **Ningún envío hacia el grupo sale** (`message_sending` y
  `reply_payload_sending` lo cancelan). En el grupo hay clientes.

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

Configurarlo (cambia `TU_TOKEN` por el `AGENTE_TOKEN` de Vercel):

```bash
openclaw config set plugins.entries.corresponsal-puente.config '{"grupo":"120363320161907130@g.us","dueno":"+573003651525","url":"https://corresponsal-multias.vercel.app/api/agente/comprobante","token":"TU_TOKEN","diagnostico":true}' --strict-json
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
openclaw config set channels.whatsapp.groups '{"120363320161907130@g.us":{"requireMention":false,"tools":{"deny":["group:runtime","group:fs"]}}}' --strict-json
openclaw config set channels.whatsapp.groupAllowFrom '["+573003651525"]' --strict-json
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
