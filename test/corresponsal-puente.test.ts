// Pruebas del plugin de OpenClaw (openclaw/corresponsal-puente) con un OpenClaw
// simulado: se registran los ganchos y se llaman como lo haría el Gateway.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { puente } from "../openclaw/corresponsal-puente/puente.js";

const GRUPO = "120363320161907130@g.us";
const DUENO = "+573003651525";

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
  const recibidos: { auth: string | undefined; cuerpo: string }[] = [];
  const srv = createServer((req, res) => {
    let cuerpo = "";
    req.setEncoding("latin1");
    req.on("data", (c) => (cuerpo += c));
    req.on("end", () => {
      recibidos.push({ auth: req.headers.authorization, cuerpo });
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
    await recibido({ from: "x", content: "", media: foto, messageId: "A1" }, { conversationId: GRUPO, senderId: "+573144434480" });
    // Del dueño en otro chat: no se reenvía.
    await recibido({ from: "x", content: "", media: foto, messageId: "A2" }, { conversationId: "573001112233@s.whatsapp.net", senderId: DUENO });
    // Del dueño, sin foto: nada.
    await recibido({ from: "x", content: "listo" }, { conversationId: GRUPO, senderId: DUENO });
    assert.equal(srv.recibidos.length, 0);

    // Del dueño en el grupo, con foto: sí (con el remitente en formato de WhatsApp).
    await recibido(
      { from: "x", content: "", media: foto, messageId: "B1", timestamp: 1762805567 },
      { conversationId: GRUPO, senderId: "573003651525@s.whatsapp.net" },
    );
    assert.equal(srv.recibidos.length, 1);
    assert.equal(srv.recibidos[0].auth, "Bearer secreto");
    assert.match(srv.recibidos[0].cuerpo, /name="mensajeId"\r\n\r\nB1/);
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
