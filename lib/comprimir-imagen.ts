// Achica las fotos antes de subirlas. Una foto de iPhone pesa 3-5 MB y subir
// veinte por dato móvil es eterno; a 2000 px de lado largo el comprobante se
// sigue leyendo perfecto y pesa unas diez veces menos.
//
// Si el navegador no puede decodificar la imagen (HEIC en Chrome, por ejemplo)
// se devuelve el archivo original y que decida el servidor.

const LADO_MAXIMO = 2000;
const CALIDAD = 0.82;
/** Por debajo de esto no vale la pena recodificar. */
const YA_ES_LIVIANA = 1_200_000;

const EXT_IMAGEN = /\.(jpe?g|png|webp|heic|heif|gif|bmp|tiff?)$/i;

/**
 * Algunas fotos llegan sin `type` (las que salen de Fotos, de AirDrop o de
 * iCloud): en ese caso manda la extensión, si no el bucket las rechaza por
 * venir sin formato declarado.
 */
export function pareceImagen(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type) return false;
  return EXT_IMAGEN.test(file.name);
}

export function esPdf(file: File): boolean {
  return file.type === "application/pdf" || (!file.type && /\.pdf$/i.test(file.name));
}

const TIPO_POR_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

/** El bucket rechaza lo que llegue sin formato: se deduce por la extensión. */
export function tipoDeArchivo(file: File): string | undefined {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TIPO_POR_EXT[ext];
}

export async function comprimirImagen(file: File): Promise<File> {
  if (!pareceImagen(file)) return file; // PDFs pasan derecho
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    // from-image respeta el EXIF: sin esto las fotos del iPhone salen acostadas.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    // Si viene sin type hay que recodificarla igual, aunque sea chica: así sale
    // como JPEG declarado y el bucket la acepta.
    if (escala === 1 && file.size <= YA_ES_LIVIANA && file.type) return file;

    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob = await new Promise<Blob | null>((resolver) =>
      canvas.toBlob(resolver, "image/jpeg", CALIDAD),
    );
    if (!blob) return file;
    if (blob.size >= file.size && file.type) return file;

    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
