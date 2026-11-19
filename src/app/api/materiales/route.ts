import { listarMateriales, respuestaError } from "@/lib/server/stock";

export const dynamic = "force-dynamic";

/** Catálogo de materiales (para el buscador). Incluye stock disponible. */
export async function GET() {
  try {
    const data = await listarMateriales();
    return Response.json({ materiales: data });
  } catch (e) {
    return respuestaError(e);
  }
}
