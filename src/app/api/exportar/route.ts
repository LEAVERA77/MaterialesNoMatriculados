import { generarExcel, respuestaError, verificarPassword } from "@/lib/server/stock";
import { sincronizarGithub } from "@/lib/server/github-sync";

export const dynamic = "force-dynamic";

/** Descarga el Excel completo (mismo formato que listado_materiales_ENERSA.xlsx). */
export async function POST(req: Request) {
  try {
    const body = ((await req.json().catch(() => null)) ?? {}) as { password?: string; github?: boolean };
    verificarPassword(body.password);
    if (body.github) {
      const r = await sincronizarGithub("Sincronización manual de stock");
      return Response.json(r, { status: r.ok ? 200 : 502 });
    }
    const buf = await generarExcel();
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="listado_materiales_ENERSA.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return respuestaError(e);
  }
}
