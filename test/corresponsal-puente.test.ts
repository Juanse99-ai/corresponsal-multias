// Pruebas del plugin de OpenClaw (openclaw/corresponsal-puente) con un OpenClaw
// simulado: se registran los ganchos y se llaman como lo haría el Gateway.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { puente, textoDelMensaje, urlDeCompensacion } from "../openclaw/corresponsal-puente/puente.js";
import { leerEstado, urlAvisos } from "../openclaw/corresponsal-puente/avisos.js";
import { urlCierre } from "../openclaw/corresponsal-puente/cierre.js";

const GRUPO = "120363000000000000@g.us";
const DUENO = "+573005550101";
const LUIS = "+599 9 555 0199";

type Gancho = (event: unknown, ctx: unknown) => unknown;

function montar(config: Record<string, unknown>) {
  const ganchos = new Map<string, Gancho>();
  const registro: string[] = [];
  const logger = {
    info: (m: string) => registro.push(m),
    warn: (m: string) => registro.push(m),
    error: (m: string) => registro.push(m),
  };
  puente.register({
    pluginConfig: config,
    logger,
    on: (nombre: string, fn: Gancho) => ganchos.set(nombre, fn),
  });
  return { ganchos, registro };
}

async function servidorFalso() {
  const recibidos: { auth: string | undefined; cuerpo: string; ruta: string | undefined }[] = [];
  const srv = createServer((req, res) => {
    let cuerpo = "";
    req.setEncoding("latin1");
    req.on("data", (c) => (cuerpo += c));
    req.on("end", () => {
      recibidos.push({ auth: req.headers.authorization, cuerpo, ruta: req.url });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, resultado: "guardado" }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, r));
  const { port } = srv.address() as { port: number };
  return { url: `http://127.0.0.1:${port}/api/agente/comprobante`, recibidos, cerrar: () => srv.close() };
}

test("nada sale hacia el grupo, aunque falte la configuración del reenvío", () => {
  const { ganchos } = montar({ grupo: GRUPO });
  const envio = ganchos.get("message_sending")!;
  assert.deepEqual(
    envio({ to: GRUPO, content: "hola" }, {}),
    { cancel: true, cancelReason: "corresponsal-puente: el agente no escribe en el grupo" },
  );
  assert.equal(envio({ to: DUENO, content: "alerta" }, {}), undefined);

  const respuesta = ganchos.get("reply_payload_sending")!;
  assert.equal((respuesta({ payload: {} }, { conversationId: GRUPO }) as { cancel: boolean }).cancel, true);
  assert.equal(respuesta({ payload: {} }, { conversationId: DUENO }), undefined);
});

test("los mensajes del grupo no llegan al agente; los demás sí", () => {
  const { ganchos } = montar({ grupo: GRUPO });
  const despacho = ganchos.get("before_dispatch")!;
  assert.deepEqual(despacho({ content: "x" }, { conversationId: GRUPO }), { handled: true });
  assert.equal(despacho({ content: "x" }, { conversationId: DUENO }), undefined);
});

test("la foto del dueño en el grupo se reenvía con el token; las demás no", async () => {
  const srv = await servidorFalso();
  try {
    const dir = await mkdtemp(join(tmpdir(), "puente-"));
    const ruta = join(dir, "tirilla.jpg");
    await writeFile(ruta, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
    const { ganchos, registro } = montar({ grupo: GRUPO, dueno: DUENO, url: srv.url, token: "secreto" });
    const recibido = ganchos.get("message_received")!;
    const foto = [{ path: ruta, contentType: "image/jpeg", kind: "image" }];

    // De otro miembro: no se reenvía.
    await recibido({ from: "x", content: "", media: foto, messageId: "A1" }, { conversationId: GRUPO, senderId: "+573005550177" });
    // Del dueño en otro chat: no se reenvía.
    await recibido({ from: "x", content: "", media: foto, messageId: "A2" }, { conversationId: "573001112233@s.whatsapp.net", senderId: DUENO });
    // Del dueño, sin foto: nada.
    await recibido({ from: "x", content: "listo" }, { conversationId: GRUPO, senderId: DUENO });
    assert.equal(srv.recibidos.length, 0);

    // Del dueño en el grupo, con foto: sí (con el remitente en formato de WhatsApp).
    await recibido(
      { from: "x", content: "", media: foto, messageId: "B1", timestamp: 1762805567 },
      { conversationId: GRUPO, senderId: "573005550101@s.whatsapp.net" },
    );
    assert.equal(srv.recibidos.length, 1);
    assert.equal(srv.recibidos[0].auth, "Bearer secreto");
    assert.match(srv.recibidos[0].cuerpo, /name="mensajeId"\r\n\r\nB1/);
    assert.match(srv.recibidos[0].cuerpo, /name="quien"\r\n\r\ndueno\r\n/);
    // Segundos convertidos a milisegundos.
    assert.match(srv.recibidos[0].cuerpo, /name="enviado"\r\n\r\n1762805567000/);
    assert.match(srv.recibidos[0].cuerpo, /Content-Type: image\/jpeg/i);
    assert.ok(registro.some((m) => m.includes("B1: guardado")));
  } finally {
    srv.cerrar();
  }
});

test("una foto todavía sin descargar no se manda vacía", async () => {
  const srv = await servidorFalso();
  try {
    const { ganchos, registro } = montar({ grupo: GRUPO, dueno: DUENO, url: srv.url, token: "secreto" });
    await ganchos.get("message_received")!(
      { from: "x", content: "", mediaStagingPending: true, originalMedia: [{ kind: "image" }] },
      { conversationId: GRUPO, senderId: DUENO },
    );
    assert.equal(srv.recibidos.length, 0);
    assert.ok(registro.some((m) => m.includes("todavía no se había descargado")));
  } finally {
    srv.cerrar();
  }
});

// Caso real del 11 nov 2026: Vercel quedó con una versión sin /api/agente y la
// app mandó la foto a la pantalla de entrar. El puente seguía la redirección,
// reintentaba tres veces y solo decía "500".
async function servidorQueResponde(status: number, cabeceras: Record<string, string> = {}, cuerpo = "") {
  let llamadas = 0;
  const srv = createServer((req, res) => {
    llamadas++;
    req.resume();
    req.on("end", () => {
      res.writeHead(status, cabeceras);
      res.end(cuerpo);
    });
  });
  await new Promise<void>((r) => srv.listen(0, r));
  const { port } = srv.address() as { port: number };
  return {
    url: `http://127.0.0.1:${port}/api/agente/comprobante`,
    llamadas: () => llamadas,
    cerrar: () => srv.close(),
  };
}

async function mandarFoto(url: string) {
  const dir = await mkdtemp(join(tmpdir(), "puente-"));
  const ruta = join(dir, "tirilla.jpg");
  await writeFile(ruta, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
  const { ganchos, registro } = montar({ grupo: GRUPO, dueno: DUENO, url, token: "secreto" });
  await ganchos.get("message_received")!(
    { from: "x", content: "", media: [{ path: ruta, contentType: "image/jpeg" }], messageId: "C1" },
    { conversationId: GRUPO, senderId: DUENO },
  );
  return registro;
}

test("si la app manda a la pantalla de entrar, lo dice claro y no reintenta", async () => {
  const srv = await servidorQueResponde(307, { location: "/login?next=%2Fapi%2Fagente%2Fcomprobante" });
  try {
    const registro = await mandarFoto(srv.url);
    assert.equal(srv.llamadas(), 1);
    assert.ok(registro.some((m) => m.includes("no tiene la entrada del agente")), registro.join("\n"));
  } finally {
    srv.cerrar();
  }
});

test("con la clave equivocada lo dice claro y no reintenta", async () => {
  const srv = await servidorQueResponde(401, { "content-type": "application/json" }, '{"ok":false,"error":"No autorizado"}');
  try {
    const registro = await mandarFoto(srv.url);
    assert.equal(srv.llamadas(), 1);
    assert.ok(registro.some((m) => m.includes("AGENTE_TOKEN")), registro.join("\n"));
  } finally {
    srv.cerrar();
  }
});

// ---- resumen.js: el script de la tarea de las 7 a.m. ----
import { configDelPuente, urlResumen } from "../openclaw/corresponsal-puente/resumen.js";

test("el script del resumen encuentra la url y la clave del plugin", () => {
  const json = JSON.stringify({
    gateway: { auth: { token: "otra-clave" } },
    plugins: { entries: { "corresponsal-puente": { config: { url: "https://x.app/api/agente/comprobante", token: "abc123" } } } },
  });
  assert.deepEqual(configDelPuente(json), { url: "https://x.app/api/agente/comprobante", token: "abc123" });

  // JSON5 con comentario y coma final: no lo lee JSON.parse, sí la búsqueda a mano.
  const json5 = `{
    gateway: { auth: { token: "otra-clave" } }, // la del gateway no sirve
    plugins: { entries: { "corresponsal-puente": { config: { grupo: "1@g.us", url: "https://x.app/api/agente/comprobante", token: "abc123", }, }, }, },
  }`;
  assert.deepEqual(configDelPuente(json5), { url: "https://x.app/api/agente/comprobante", token: "abc123" });

  assert.equal(configDelPuente("{}"), null);
});

test("la url del resumen sale de la de comprobantes", () => {
  assert.equal(urlResumen("https://x.app/api/agente/comprobante"), "https://x.app/api/agente/resumen");
  assert.equal(urlResumen("https://x.app/api/agente/comprobante/"), "https://x.app/api/agente/resumen");
});

test("las fotos del Sr. Luis van con su texto a la entrada de compensaciones", async () => {
  const srv = await servidorFalso();
  try {
    const dir = await mkdtemp(join(tmpdir(), "puente-"));
    const ruta = join(dir, "pagos.jpg");
    await writeFile(ruta, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
    const { ganchos, registro } = montar({ grupo: GRUPO, dueno: DUENO, luis: LUIS, url: srv.url, token: "secreto" });
    const recibido = ganchos.get("message_received")!;
    const foto = [{ path: ruta, contentType: "image/jpeg", kind: "image" }];

    await recibido(
      { from: "x", content: "<media:image> 21.8 palos nuevo", media: foto, messageId: "L1", timestamp: 1762805567 },
      { conversationId: GRUPO, senderId: "59995550199@s.whatsapp.net" },
    );
    // La del dueño sigue yendo a comprobantes, sin texto.
    await recibido(
      { from: "x", content: "ojo con esta", media: foto, messageId: "D1" },
      { conversationId: GRUPO, senderId: DUENO },
    );
    assert.equal(srv.recibidos.length, 2);
    assert.equal(srv.recibidos[0].ruta, "/api/agente/compensacion");
    assert.match(srv.recibidos[0].cuerpo, /name="texto"\r\n\r\n21\.8 palos nuevo\r\n/);
    assert.match(srv.recibidos[0].cuerpo, /name="mensajeId"\r\n\r\nL1/);
    assert.equal(srv.recibidos[1].ruta, "/api/agente/comprobante");
    assert.doesNotMatch(srv.recibidos[1].cuerpo, /name="texto"/);
    assert.ok(registro.some((m) => m.includes("Compensación L1: guardado")));
  } finally {
    srv.cerrar();
  }
});

test("las fotos de una operadora van a comprobantes, como las del dueño", async () => {
  const srv = await servidorFalso();
  try {
    const dir = await mkdtemp(join(tmpdir(), "puente-"));
    const ruta = join(dir, "tirilla.jpg");
    await writeFile(ruta, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
    // "311" está incompleto: no cuenta, o coincidiría con cualquier número.
    const { ganchos, registro } = montar({
      grupo: GRUPO,
      dueno: DUENO,
      luis: LUIS,
      operadoras: ["+57 300 555 0142", "311"],
      url: srv.url,
      token: "secreto",
    });
    const recibido = ganchos.get("message_received")!;
    const foto = [{ path: ruta, contentType: "image/jpeg", kind: "image" }];

    await recibido(
      { from: "x", content: "ya consigné", media: foto, messageId: "O1" },
      { conversationId: GRUPO, senderId: "573005550142@s.whatsapp.net" },
    );
    // Otro miembro del grupo sigue sin reenviarse.
    await recibido({ from: "x", content: "", media: foto, messageId: "O2" }, { conversationId: GRUPO, senderId: "+573005550311" });
    assert.equal(srv.recibidos.length, 1);
    assert.equal(srv.recibidos[0].ruta, "/api/agente/comprobante");
    assert.match(srv.recibidos[0].cuerpo, /name="mensajeId"\r\n\r\nO1/);
    assert.doesNotMatch(srv.recibidos[0].cuerpo, /name="texto"/);
    // La app sabe que la mandó una operadora, para avisarle a ella.
    assert.match(srv.recibidos[0].cuerpo, /name="quien"\r\n\r\noperadora\r\n/);
    assert.ok(registro.some((m) => m.includes("con 1 operadora.")));
  } finally {
    srv.cerrar();
  }
});

test("sin config.luis, las fotos de Luis no se reenvían", async () => {
  const srv = await servidorFalso();
  try {
    const dir = await mkdtemp(join(tmpdir(), "puente-"));
    const ruta = join(dir, "pagos.jpg");
    await writeFile(ruta, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1]));
    const { ganchos } = montar({ grupo: GRUPO, dueno: DUENO, url: srv.url, token: "secreto" });
    await ganchos.get("message_received")!(
      { from: "x", content: "3 palos", media: [{ path: ruta, contentType: "image/jpeg" }], messageId: "L2" },
      { conversationId: GRUPO, senderId: "59995550199@s.whatsapp.net" },
    );
    assert.equal(srv.recibidos.length, 0);
  } finally {
    srv.cerrar();
  }
});

test("el texto del mensaje sale limpio y la entrada de compensaciones al lado de la de comprobantes", () => {
  assert.equal(textoDelMensaje({ content: "<media:image>\n 10 palos   nuevo" }), "10 palos nuevo");
  assert.equal(textoDelMensaje({}), "");
  // Foto sin texto: OpenClaw manda solo su encabezado, que no es un mensaje.
  const encabezado = "[WhatsApp 120363000000000000@g.us +24h Thu 2026-11-12 09:27:45 GMT-5] Fulano De Tal (+5990000000):";
  assert.equal(textoDelMensaje({ body: `${encabezado} <media:image>` }), "");
  assert.equal(textoDelMensaje({ body: `${encabezado} 21.8 palos nuevo` }), "21.8 palos nuevo");
  assert.equal(textoDelMensaje({ content: "130.000 ese neki: el de siempre" }), "130.000 ese neki: el de siempre");
  assert.equal(
    urlDeCompensacion("https://corresponsal-multias.vercel.app/api/agente/comprobante"),
    "https://corresponsal-multias.vercel.app/api/agente/compensacion",
  );
});

test("los avisos y el cierre viven al lado de la entrada de comprobantes", () => {
  const url = "https://x.app/api/agente/comprobante";
  assert.equal(urlAvisos(url, null), "https://x.app/api/agente/avisos");
  assert.equal(urlAvisos(url, "2026-11-12T15:00:00.000Z"), "https://x.app/api/agente/avisos?desde=2026-11-12T15%3A00%3A00.000Z");
  assert.equal(urlCierre(url), "https://x.app/api/agente/cierre");
});

test("el estado de los avisos se lee sin romperse", () => {
  assert.equal(leerEstado('{"hasta":"2026-11-12T15:00:00.000Z"}'), "2026-11-12T15:00:00.000Z");
  assert.equal(leerEstado(""), null);
  assert.equal(leerEstado("no es json"), null);
  assert.equal(leerEstado('{"hasta":"ayer"}'), null);
});
