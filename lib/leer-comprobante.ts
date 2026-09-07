import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/**
 * Lee la foto de una tirilla del corresponsal (Wompi / Bancolombia) y saca el
 * movimiento. Son fotos de papel térmico: curvo, con marca de agua y sombras,
 * así que un OCR corriente se equivoca y aquí equivocarse es plata mal anotada.
 *
 * Nada de lo que salga de aquí se guarda solo: siempre pasa por la revisión.
 */

/** Formatos que acepta la API de imágenes. */
const MIMES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type MimeImagen = (typeof MIMES)[number];

export const comprobanteSchema = z.object({
  /** false si la foto no es una tirilla de transacción. */
  es_comprobante: z.boolean(),
  /** Pesos enteros, sin centavos. "$266.000,00" -> 266000. */
  monto: z.number().nullable(),
  /** "YYYY-MM-DD" tomado de la tirilla. */
  fecha: z.string().nullable(),
  /** "HH:MM" en 24 horas. */
  hora: z.string().nullable(),
  /** "Recarga Nequi", "Retiro", "Depósito"... tal como lo dice la tirilla. */
  transaccion: z.string().nullable(),
  /** Nombre del titular de la cuenta destino. */
  titular: z.string().nullable(),
  /** Número Nequi, celular o cuenta destino. */
  destino: z.string().nullable(),
  /** Número de recibo: sirve para no repetir el mismo comprobante. */
  recibo: z.string().nullable(),
  /** false si algún dígito del monto o la hora quedó dudoso. */
  seguro: z.boolean(),
});

export type Comprobante = z.infer<typeof comprobanteSchema>;

const INSTRUCCIONES = `Lees fotos de tirillas de un corresponsal bancario en Colombia (Wompi / Bancolombia). Son fotos de papel térmico, muchas veces curvas, con marca de agua y sombras.

Saca solo lo que esté impreso en la tirilla:

- monto: el valor de la transacción, el que aparece junto a "Monto". En Colombia el punto separa miles y la coma los centavos: "$266.000,00" son 266000 pesos. Devuélvelo como número entero de pesos, sin centavos y sin separadores.
- fecha: la de la tirilla, en formato YYYY-MM-DD. "SEP 07 2026" es 2026-09-07.
- hora: la de la tirilla en 24 horas, HH:MM, sin segundos.
- transaccion: el tipo, tal como está impreso ("Recarga Nequi", "Retiro", "Depósito").
- titular: el nombre de la persona destino.
- destino: el número Nequi, celular o número de cuenta destino.
- recibo: el número que aparece junto a "Recibo".

Reglas que no puedes romper:

- No adivines. Si un dígito del monto o de la hora no se distingue con certeza, pon seguro en false.
- Nunca confundas el monto con el número de recibo, el RRN, la aprobación, el terminal ni el número de cuenta.
- Si la foto no es una tirilla de transacción, pon es_comprobante en false y todo lo demás en null.
- Si la transacción no dice que fue exitosa, pon seguro en false.
- Un campo que no aparezca en la tirilla va en null; no lo inventes.`;

function esMimeValido(m: string): m is MimeImagen {
  return (MIMES as readonly string[]).includes(m);
}

/** True si hay llave configurada; sin ella la lectura no se ofrece. */
export function lecturaDisponible(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Modelo que lee las tirillas. Se puede cambiar desde Vercel con
 * MODELO_LECTURA, sin tocar código, para comparar precisión contra costo.
 * No se fija el modo de razonamiento a propósito: cada modelo trae el suyo
 * por defecto y así el cambio por variable no rompe nada.
 */
function modelo(): string {
  return process.env.MODELO_LECTURA?.trim() || "claude-sonnet-5";
}

export async function leerComprobante(imagen: Buffer, mime: string): Promise<Comprobante> {
  if (!esMimeValido(mime)) {
    throw new Error(`Formato no admitido para leer: ${mime || "desconocido"}`);
  }

  const client = new Anthropic();
  const res = await client.messages.parse({
    model: modelo(),
    max_tokens: 2000,
    system: INSTRUCCIONES,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mime, data: imagen.toString("base64") },
          },
          { type: "text", text: "Lee esta tirilla." },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(comprobanteSchema) },
  });

  const datos = res.parsed_output;
  if (!datos) throw new Error("No se entendió la respuesta de la lectura.");
  return datos;
}
