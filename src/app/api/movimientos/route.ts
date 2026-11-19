import { listarHistorial, registrarMovimiento, respuestaError, HttpError, type MovimientoEntrada } from "@/lib/server/stock";
import { programarSyncGithub } from "@/lib/server/github-sync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const historial = await listarHistorial();
    return Response.json({ historial });
  } catch (e) {
    return respuestaError(e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as MovimientoEntrada | null;
    if (!body) throw new HttpError(400, "Solicitud inválida.");
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    const dispositivo =
      body.dispositivo && typeof body.dispositivo === "object"
        ? { ...(body.dispositivo as Record<string, unknown>), ipServidor: ip }
        : { ipServidor: ip };
    const r = await registrarMovimiento({ ...body, dispositivo });
    programarSyncGithub(`Actualización de stock: ${r.operacion.toLowerCase()} - ${r.usuario}`);
    return Response.json({ ok: true, movimiento: r });
  } catch (e) {
    return respuestaError(e);
  }
}
