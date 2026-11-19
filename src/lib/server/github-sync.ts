import { generarExcel } from "./stock";

/**
 * Sincronización automática (opcional) con el repositorio de GitHub.
 * Si existe GITHUB_TOKEN, después de cada movimiento se sube el Excel actualizado
 * a LEAVERA77/MaterialesNoMatriculados/listado_materiales_ENERSA.xlsx,
 * reemplazando el flujo anterior Google Apps Script → repository_dispatch → GitHub Action.
 */
const REPO = process.env.GITHUB_REPO || "LEAVERA77/MaterialesNoMatriculados";
const RUTA = process.env.GITHUB_EXCEL_PATH || "listado_materiales_ENERSA.xlsx";
const RAMA = process.env.GITHUB_BRANCH || "main";

let pendiente: NodeJS.Timeout | null = null;
let ultimoMensaje = "";

export function githubSyncHabilitado() {
  return Boolean(process.env.GITHUB_TOKEN);
}

/** Agenda una sincronización (agrupa varios movimientos seguidos en un solo commit). */
export function programarSyncGithub(mensaje: string) {
  if (!githubSyncHabilitado()) return;
  ultimoMensaje = mensaje;
  if (pendiente) clearTimeout(pendiente);
  pendiente = setTimeout(() => {
    pendiente = null;
    sincronizarGithub(ultimoMensaje).catch((e) => console.error("[github-sync]", e));
  }, 4000);
}

export async function sincronizarGithub(mensaje: string): Promise<{ ok: boolean; detalle: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, detalle: "GITHUB_TOKEN no configurado." };
  const url = `https://api.github.com/repos/${REPO}/contents/${encodeURIComponent(RUTA)}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "materiales-enersa",
  };
  const contenido = (await generarExcel()).toString("base64");

  for (let intento = 0; intento < 3; intento++) {
    const actual = await fetch(`${url}?ref=${RAMA}`, { headers, cache: "no-store" });
    const sha = actual.ok ? ((await actual.json()) as { sha?: string }).sha : undefined;
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ message: mensaje, content: contenido, branch: RAMA, ...(sha ? { sha } : {}) }),
    });
    if (res.ok) return { ok: true, detalle: "Excel sincronizado con GitHub." };
    if (res.status !== 409) return { ok: false, detalle: `GitHub respondió ${res.status}: ${await res.text()}` };
  }
  return { ok: false, detalle: "Conflicto persistente al subir el Excel." };
}
