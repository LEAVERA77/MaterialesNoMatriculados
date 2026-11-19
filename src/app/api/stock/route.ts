import {
  ajustarStock,
  crearMaterial,
  HttpError,
  listarMateriales,
  respuestaError,
  verificarPassword,
} from "@/lib/server/stock";
import { githubSyncHabilitado, programarSyncGithub } from "@/lib/server/github-sync";

export const dynamic = "force-dynamic";

interface Body {
  password?: string;
  accion?: "listar" | "ajustar" | "crear";
  id?: number;
  stock?: number;
  motivo?: string;
  nombre?: string;
  especificacion?: string;
  unidad?: string;
}

/** Acceso protegido por contraseña (verificada en el servidor). */
export async function POST(req: Request) {
  try {
    const body = ((await req.json().catch(() => null)) ?? {}) as Body;
    verificarPassword(body.password);
    const accion = body.accion ?? "listar";

    if (accion === "ajustar") {
      if (typeof body.id !== "number") throw new HttpError(400, "Material inválido.");
      await ajustarStock(body.id, Number(body.stock), body.motivo ?? "");
      programarSyncGithub("Ajuste de stock (administración)");
    } else if (accion === "crear") {
      await crearMaterial({
        nombre: body.nombre ?? "",
        especificacion: body.especificacion,
        unidad: body.unidad,
        stock: Number(body.stock) || 0,
      });
      programarSyncGithub(`Alta de material: ${body.nombre}`);
    }

    const stock = await listarMateriales();
    return Response.json({ stock, githubSync: githubSyncHabilitado() });
  } catch (e) {
    return respuestaError(e);
  }
}
