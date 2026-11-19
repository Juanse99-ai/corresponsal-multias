// Resumen del grupo (openclaw/corresponsal-puente/grupo.js): el puente anota
// cada mensaje del punto en el diario y el resumen de las 6 p. m. lo cuenta.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { puente, rutaDiario, nombreDe } from "../openclaw/corresponsal-puente/puente.js";
import { resumenGrupo, leerDiario, diaBogota } from "../openclaw/corresponsal-puente/grupo.js";

process.env.OPENCLAW_HOME = mkdtempSync(join(tmpdir(), "openclaw-pruebas-"));
process.env.CORRESPONSAL_SIN_LATIDO = "1";

const GRUPO = "120363000000000000@g.us";
// 19 nov 2026, 10:00 a. m. en Bogotá (15:00 UTC).
const DIEZ = Date.UTC(2026, 10, 19, 15, 0);
const min = (n: number) => DIEZ + n * 60_000;

test("el nombre de quien escribe sale de la configuración, sin números completos", () => {
  assert.equal(nombreDe({ deLuis: true, operadora: null }, {}), "Sr. Luis");
  assert.equal(nombreDe({ deLuis: false, operadora: null }, {}), "Tú");
  assert.equal(nombreDe({ deLuis: false, operadora: "573005550142" }, { "0142": "Ana" }), "Ana");
  assert.equal(nombreDe({ deLuis: false, operadora: "573005550142" }, undefined), "Operadora …0142");
});

test("el resumen cuenta fotos, compensaciones, pendientes y textos del día", () => {
  const eventos = leerDiario(
    [
      { ts: min(0), quien: "Ana", tipo: "foto", resultado: "guardado", monto: 2_000_000 },
      { ts: min(1), quien: "Ana", tipo: "foto", resultado: "guardado", monto: 500_000 },
      { ts: min(2), quien: "Ana", tipo: "foto", resultado: "revisar", motivo: "Un dígito quedó dudoso" },
      { ts: min(3), quien: "Ana", tipo: "foto", resultado: "ya_recibida" },
      { ts: min(4), quien: "Tú", tipo: "foto", resultado: "descartada", motivo: "Es un reporte de cierre" },
      { ts: min(5), quien: "Sr. Luis", tipo: "texto", texto: "21.8 palos nuevo" },
      { ts: min(5), quien: "Sr. Luis", tipo: "compensacion", resultado: "guardado", monto: 21_800_000 },
      { ts: min(6), quien: "Ana", tipo: "perdida", cuantas: 1 },
      // Ayer: no cuenta.
      { ts: min(-24 * 60), quien: "Ana", tipo: "foto", resultado: "guardado", monto: 9 },
    ]
      .map((e) => JSON.stringify(e))
      .join("\n") + "\nlínea rota\n",
  );
  const t = resumenGrupo(eventos, "2026-11-19");
  assert.match(t, /^\*Corresponsal · el grupo hoy\*/);
  assert.match(t, /Fotos: 4 \(2 registradas, 1 por revisar, 1 descartadas\)/);
  assert.match(t, /- Ana: 3 fotos, \$2\.500\.000 registrados/);
  assert.match(t, /- Tú: 1 foto\n/);
  assert.match(t, /Compensaciones del Sr\. Luis: 1 guardadas \(\$21\.800\.000\)/);
  assert.match(t, /Por revisar en la app:\n- 10:02 Ana: Un dígito quedó dudoso/);
  assert.match(t, /No se pudieron descargar[^\n]*\n- 10:06 Ana: 1 foto/);
  assert.match(t, /Lo que escribieron:\n- 10:05 Sr\. Luis: 21\.8 palos nuevo/);
});

test("si hoy no llegó nada, lo dice", () => {
  const t = resumenGrupo([], "2026-11-19");
  assert.match(t, /Hoy no llegó nada al grupo/);
});

test("el día se cuenta en hora de Bogotá", () => {
  // 11:30 p. m. del 19 en Bogotá ya es 20 en UTC.
  assert.equal(diaBogota(Date.UTC(2026, 10, 20, 4, 30)), "2026-11-19");
});

test("el puente anota en el diario las fotos y textos del punto, no los de clientes", async () => {
  const srv = createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, resultado: "guardado", consignacion: { monto: 700_000, hora: "10:00:00" } }));
    });
  });
  await new Promise<void>((r) => srv.listen(0, r));
  const { port } = srv.address() as { port: number };
  try {
    const dir = await mkdtemp(join(tmpdir(), "puente-"));
    const ruta = join(dir, "tirilla.jpg");
    await writeFile(ruta, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]));
    const ganchos = new Map<string, (e: unknown, c: unknown) => unknown>();
    puente.register({
      pluginConfig: {
        grupo: GRUPO,
        dueno: "+573005550101",
        operadoras: ["+573005550142"],
        nombres: { "0142": "Ana" },
        url: `http://127.0.0.1:${port}/api/agente/comprobante`,
        token: "secreto",
      },
      logger: { info() {}, warn() {}, error() {} },
      on: (n: string, fn: (e: unknown, c: unknown) => unknown) => ganchos.set(n, fn),
    });
    const recibido = ganchos.get("message_received")!;
    const foto = [{ path: ruta, contentType: "image/jpeg", kind: "image" }];
    await recibido(
      { content: "<media:image>", media: foto, messageId: "A1", timestamp: DIEZ / 1000 },
      { conversationId: GRUPO, senderId: "573005550142@s.whatsapp.net" },
    );
    await recibido(
      { content: "ya mandé la de las 10", media: [], messageId: "A2", timestamp: DIEZ / 1000 },
      { conversationId: GRUPO, senderId: "573005550142@s.whatsapp.net" },
    );
    // Un cliente del grupo: no se anota.
    await recibido(
      { content: "buenas, ¿abren mañana?", media: [], messageId: "C1", timestamp: DIEZ / 1000 },
      { conversationId: GRUPO, senderId: "573009990000@s.whatsapp.net" },
    );
    const diario = leerDiario(await readFile(rutaDiario(), "utf8"));
    assert.equal(diario.length, 2);
    assert.deepEqual(
      diario.map((e) => [e.quien, e.tipo, e.resultado ?? e.texto, e.monto ?? null]),
      [
        ["Ana", "foto", "guardado", 700_000],
        ["Ana", "texto", "ya mandé la de las 10", null],
      ],
    );
    assert.ok(!JSON.stringify(diario).includes("abren mañana"));
  } finally {
    srv.close();
  }
});
