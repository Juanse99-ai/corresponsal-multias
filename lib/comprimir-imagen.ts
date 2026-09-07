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

export async function comprimirImagen(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file; // PDFs pasan derecho
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    // from-image respeta el EXIF: sin esto las fotos del iPhone salen acostadas.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    if (escala === 1 && file.size <= YA_ES_LIVIANA) return file;

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
    if (!blob || blob.size >= file.size) return file;

    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
