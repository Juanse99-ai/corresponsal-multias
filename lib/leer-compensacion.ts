import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { esMimeValido, modeloLectura, esfuerzoLectura } from "@/lib/leer-comprobante";

/**
 * Lee la foto que manda el Sr. Luis al grupo cuando compensa el cupo del punto.
 * En una misma foto pueden venir varios pagos. Usa el mismo modelo y el mismo
 * esfuerzo del lector de tirillas (MODELO_LECTURA, ESFUERZO_LECTURA).
 *
 * Nada de lo que salga de aquí se guarda sin pasar por lib/compensacion.ts.
 */

export const pagoSchema = z.object({
  formato: z.enum(["app", "redeban", "cajero", "otro"]),
  es_compensacion: z.boolean(),
  monto: z.number().nullable(),
  hora: z.string().nullable(),
  referencia: z.string().nullable(),
  comprobante: z.string().nullable(),
  seguro: z.boolean(),
});

export const compensacionSchema = z.object({
  /** false si la foto no muestra pagos (un chat, una persona, otra cosa). */
  hay_pagos: z.boolean(),
  pagos: z.array(pagoSchema),
});

export type LecturaCompensacion = z.infer<typeof compensacionSchema>;

const INSTRUCCIONES = `Lees fotos que manda un aliado de un corresponsal bancario Bancolombia en Colombia. En cada foto hay uno o varios pagos con los que él le devuelve cupo al punto (una "compensación"). Pueden ser capturas de pantalla o fotos de papel térmico, curvas o con sombras.

Hay tres formatos:

1. formato "app": captura de la app de Bancolombia que dice "¡Pago exitoso!" con "Compensación corresponsal bancario". El monto es "Valor pagado". El comprobante es "Comprobante No.". La referencia es el código del punto que aparece en el pago.
2. formato "redeban": tirilla de papel de Redeban con CONVENIO 76477 y "COMPENSACION EN CB R". El monto es "VALOR". La referencia es "REF". El comprobante es "RECIBO" (si no hay, el RRN).
3. formato "cajero": "REGISTRO DE OPERACION CAJERO AUTOMATICO" con CONVENIO 76477 y "COMPENSACION EN CB". El monto es "VLR PAGO". La referencia es "REFERENCIA". El comprobante es el número de la operación o el recibo.

Si es otro tipo de pago, usa formato "otro".

Por cada pago que se vea en la foto, saca:

- monto: el valor pagado, exacto, en pesos enteros. En Colombia el punto separa miles y la coma los centavos: "$1.800.002,00" son 1800002 pesos. No lo redondees.
- hora: la hora del pago en 24 horas, HH:MM.
- referencia: la referencia o código del punto, tal como está impresa.
- comprobante: el número de comprobante, recibo o RRN.
- es_compensacion: true solo si el pago dice compensación del corresponsal (convenio 76477 o "Compensación corresponsal bancario").

Reglas que no puedes romper:

- No adivines. Si un dígito del monto no se distingue con certeza, pon seguro en false para ese pago.
- Si el pago no dice que fue exitoso o aprobado, pon seguro en false.
- Nunca confundas el monto con el número de comprobante, la referencia, el RRN, el convenio ni una cuenta.
- No cuentes dos veces el mismo pago aunque se vea dos veces en la foto.
- Un campo que no aparezca va en null; no lo inventes.
- Si la foto no muestra pagos, pon hay_pagos en false y pagos vacío.`;

export async function leerCompensacion(imagen: Buffer, mime: string): Promise<LecturaCompensacion> {
  if (!esMimeValido(mime)) {
    throw new Error(`Formato no admitido para leer: ${mime || "desconocido"}`);
  }

  const client = new Anthropic();
  const esfuerzo = esfuerzoLectura();
  const res = await client.messages.parse({
    model: modeloLectura(),
    max_tokens: 3000,
    system: INSTRUCCIONES,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mime, data: imagen.toString("base64") },
          },
          { type: "text", text: "Lee los pagos de esta foto." },
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(compensacionSchema),
      ...(esfuerzo ? { effort: esfuerzo } : {}),
    },
  });

  const datos = res.parsed_output;
  if (!datos) throw new Error("No se entendió la respuesta de la lectura.");
  return datos;
}
