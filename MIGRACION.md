# Opción A — Backend propio con base de datos (stock automático)

Reemplaza el flujo anterior del repo `LEAVERA77/MaterialesNoMatriculados`:

```
Antes:  App (GitHub Pages) → Google Apps Script → repository_dispatch → GitHub Action (Python) → commit del Excel
Ahora:  App (Next.js) → API /api/movimientos → PostgreSQL (transacción con bloqueo de filas)
```

## Qué cambia
- **Stock automático e instantáneo**: cada retiro o devolución actualiza el stock en la misma transacción.
- **Sin carreras**: si dos personas retiran a la vez, nunca queda stock negativo (`SELECT … FOR UPDATE`).
- **Variantes correctas**: los materiales se identifican por ID (nombre + especificación). El Action anterior
  buscaba solo por nombre, así que "Llave combinada 22mm" descontaba de la de 13mm.
- **Importación automática**: en el primer arranque se importan `data/listado_materiales_ENERSA.xlsx`
  (hojas *Materiales* e *Historial*) y el padrón de legajos.
- **Contraseña del stock verificada en el servidor** (ya no queda solo en el navegador).
- **Administración**: ajuste de stock (ingresos y correcciones de inventario) y alta de materiales, con registro en el historial.
- **Excel completo**: descarga con el mismo formato que el archivo original (Materiales + Historial).

## Variables de entorno (opcionales)
| Variable | Uso |
|---|---|
| `STOCK_PASS_HASH` | SHA-256 de la contraseña de stock (por defecto, la misma del repo original). |
| `GITHUB_TOKEN` | Si existe, después de cada movimiento se sube automáticamente el Excel actualizado al repo. |
| `GITHUB_REPO` | Por defecto `LEAVERA77/MaterialesNoMatriculados`. |
| `GITHUB_EXCEL_PATH` | Por defecto `listado_materiales_ENERSA.xlsx`. |
| `GITHUB_BRANCH` | Por defecto `main`. |

Con `GITHUB_TOKEN` configurado, el workflow `.github/workflows/actualizar.yml` y el Apps Script ya no hacen falta.

## API
- `GET  /api/materiales` — catálogo con stock
- `GET  /api/movimientos` — historial
- `POST /api/movimientos` — registrar retiro o devolución `{ fecha, legajo, operacion, uso, items:[{materialId, material, cantidad}] }`
- `POST /api/stock` — `{ password, accion: "listar" | "ajustar" | "crear", … }`
- `POST /api/exportar` — `{ password }` → descarga xlsx · `{ password, github: true }` → sube a GitHub
