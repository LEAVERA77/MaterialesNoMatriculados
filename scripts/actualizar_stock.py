#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Actualiza el Excel de stock a partir de una operación de retiro / devolución.

Entrada: variable de entorno DATOS con el JSON que envía la aplicación web.
Salida:  listado_materiales_ENERSA.xlsx modificado.

Columnas de la hoja "Historial":
    A Fecha | B Usuario | C Operacion | D Material | E Cantidad | F Uso
    G Legajo | H Dispositivo | I Huella

Columnas de la hoja "Dispositivos" (se crea automáticamente):
    A ID | B Huella | C Detalle | D Ultimo usuario | E Ultimo legajo | F Ultima vez | G Operaciones

Las columnas nuevas (G, H, I) se agregan al final para no romper compatibilidad
con registros ni lecturas anteriores.
"""

import json
import os
import sys
from datetime import datetime

from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

ARCHIVO = "listado_materiales_ENERSA.xlsx"

ENCABEZADO_HISTORIAL = [
    "Fecha", "Usuario", "Operacion", "Material", "Cantidad", "Uso",
    "Legajo", "Dispositivo", "Huella",
]
ENCABEZADO_DISPOSITIVOS = [
    "ID Dispositivo", "Huella", "Detalle", "Ultimo usuario", "Ultimo legajo",
    "Ultima operacion", "Operaciones",
]


def log(msg):
    print(msg, flush=True)


def fatal(msg):
    log("ERROR FATAL: " + msg)
    sys.exit(1)


def valor(datos, clave, default=""):
    """Lectura tolerante: los payloads viejos no traen legajo ni dispositivo."""
    v = datos.get(clave, default)
    return default if v is None else v


# GitHub limita el client_payload del repository_dispatch a 10 propiedades,
# por eso los datos del equipo pueden venir planos (dispositivo_id) o anidados
# en un objeto "dispositivo" ({id, huella, resumen, ua, zona, timestamp}).
CAMPOS_DISPOSITIVO = {
    "id": ("dispositivo_id", "id"),
    "huella": ("dispositivo_huella", "huella"),
    "resumen": ("dispositivo_resumen", "resumen"),
    "ua": ("dispositivo_ua", "ua"),
    "zona": ("zona_horaria", "zona"),
    "timestamp": ("timestamp_cliente", "timestamp"),
}


def dato_dispositivo(datos, campo, default=""):
    plano, anidado = CAMPOS_DISPOSITIVO[campo]
    v = datos.get(plano)
    if v not in (None, ""):
        return v
    disp = datos.get("dispositivo")
    if isinstance(disp, dict):
        v = disp.get(anidado)
        if v not in (None, ""):
            return v
    return default


def cargar_datos():
    raw = os.environ.get("DATOS", "").strip()
    if not raw:
        fatal("No se recibieron datos (variable DATOS vacía).")
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        fatal(f"JSON inválido: {e}")


def validar_legajo(wb, datos):
    """Si existe la hoja 'Empleados', el legajo debe existir y estar activo.
    De esta forma la validación no depende solo del navegador."""
    if "Empleados" not in wb.sheetnames:
        log("Aviso: no existe la hoja 'Empleados'; no se valida el legajo en el servidor.")
        return

    legajo = str(valor(datos, "legajo", "")).strip()
    if not legajo:
        # Operación registrada antes de la migración: se acepta, queda sin legajo.
        log("Aviso: la operación no informa legajo (cliente antiguo). Se registra igual.")
        return

    ws = wb["Empleados"]
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row and row[0] is not None and str(row[0]).strip() == legajo:
            activo = str(row[3]).strip().upper() if len(row) > 3 and row[3] is not None else "SI"
            if activo in ("NO", "FALSE", "0", "INACTIVO"):
                fatal(f"El legajo {legajo} está inactivo en la hoja Empleados.")
            return
    fatal(f"El legajo {legajo} no existe en la hoja Empleados.")


def validar_stock(ws, datos):
    if datos.get("operacion") != "retiro":
        return
    solicitado = {}
    for item in datos.get("items", []):
        nombre = str(item.get("material", "")).strip().lower()
        solicitado[nombre] = solicitado.get(nombre, 0.0) + float(item.get("cantidad", 0))

    for nombre, cantidad in solicitado.items():
        encontrado = False
        for row in ws.iter_rows(min_row=3):
            nombre_excel = str(row[0].value).strip().lower() if row[0].value else ""
            if nombre_excel == nombre:
                actual = float(row[3].value) if row[3].value not in (None, "") else 0.0
                if cantidad > actual:
                    fatal(
                        f"Stock insuficiente para {nombre}: "
                        f"solicitado {cantidad}, disponible {actual}"
                    )
                encontrado = True
                break
        if not encontrado:
            fatal(f"Material no encontrado en el Excel: {nombre}")


def aplicar_movimientos(ws, datos):
    operacion = datos.get("operacion")
    for item in datos.get("items", []):
        nombre = str(item.get("material", "")).strip().lower()
        cantidad = float(item.get("cantidad", 0))
        encontrado = False
        for row in ws.iter_rows(min_row=3):
            nombre_excel = str(row[0].value).strip().lower() if row[0].value else ""
            if nombre_excel == nombre:
                actual = float(row[3].value) if row[3].value not in (None, "") else 0.0
                row[3].value = actual - cantidad if operacion == "retiro" else actual + cantidad
                encontrado = True
                break
        if encontrado:
            log(f"  {operacion}: {item.get('material')} x {cantidad}")
        else:
            log(f"  Aviso: no se encontró en el stock: {item.get('material')}")


def obtener_historial(wb):
    if "Historial" in wb.sheetnames:
        ws = wb["Historial"]
    else:
        ws = wb.create_sheet("Historial")
        ws.append(ENCABEZADO_HISTORIAL)
        return ws

    # Completar/crear encabezados nuevos sin borrar los datos existentes
    fila1 = [c.value for c in ws[1]] if ws.max_row >= 1 else []
    if not any(fila1):
        for i, titulo in enumerate(ENCABEZADO_HISTORIAL, start=1):
            ws.cell(row=1, column=i, value=titulo)
    else:
        for i, titulo in enumerate(ENCABEZADO_HISTORIAL, start=1):
            actual = ws.cell(row=1, column=i).value
            if actual in (None, ""):
                ws.cell(row=1, column=i, value=titulo)
    return ws


def registrar_historial(wb, datos):
    ws = obtener_historial(wb)
    fecha = valor(datos, "fecha", datetime.now().strftime("%Y-%m-%d %H:%M"))
    usuario = valor(datos, "usuario", "")
    operacion = str(valor(datos, "operacion", "")).upper()
    uso = valor(datos, "uso", "")
    legajo = str(valor(datos, "legajo", "")).strip()
    dispositivo = dato_dispositivo(datos, "id", "")
    huella = dato_dispositivo(datos, "huella", "")

    for item in datos.get("items", []):
        ws.append([
            fecha, usuario, operacion, item.get("material", ""),
            item.get("cantidad", 0), uso, legajo, dispositivo, huella,
        ])


def registrar_dispositivo(wb, datos):
    """Mantiene una planilla de equipos vistos, para auditar la trazabilidad."""
    dispositivo = str(dato_dispositivo(datos, "id", "")).strip()
    if not dispositivo:
        return

    if "Dispositivos" in wb.sheetnames:
        ws = wb["Dispositivos"]
    else:
        ws = wb.create_sheet("Dispositivos")
        ws.append(ENCABEZADO_DISPOSITIVOS)
        for i in range(1, len(ENCABEZADO_DISPOSITIVOS) + 1):
            ws.column_dimensions[get_column_letter(i)].width = 22
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1E3A8A")

    fila = None
    for r in ws.iter_rows(min_row=2):
        if r[0].value and str(r[0].value).strip() == dispositivo:
            fila = r
            break

    huella = dato_dispositivo(datos, "huella", "")
    detalle = dato_dispositivo(datos, "resumen", "") or dato_dispositivo(datos, "ua", "")
    usuario = valor(datos, "usuario", "")
    legajo = str(valor(datos, "legajo", "")).strip()
    operacion = str(valor(datos, "operacion", "")).upper()
    fecha = dato_dispositivo(datos, "timestamp", "") or valor(datos, "fecha", "")

    if fila is None:
        ws.append([dispositivo, huella, detalle, usuario, legajo, f"{fecha} · {operacion}", 1])
    else:
        r = fila[0].row
        operaciones = ws.cell(row=r, column=7).value or 0
        try:
            operaciones = int(operaciones) + 1
        except (TypeError, ValueError):
            operaciones = 1
        ws.cell(row=r, column=1, value=dispositivo)
        if huella:
            ws.cell(row=r, column=2, value=huella)
        if detalle:
            ws.cell(row=r, column=3, value=detalle)
        ws.cell(row=r, column=4, value=usuario)
        ws.cell(row=r, column=5, value=legajo)
        ws.cell(row=r, column=6, value=f"{fecha} · {operacion}")
        ws.cell(row=r, column=7, value=operaciones)


def main():
    datos = cargar_datos()
    log("--- DATOS RECIBIDOS ---")
    log(json.dumps(datos, indent=2, ensure_ascii=False))
    log("-----------------------")

    if not os.path.exists(ARCHIVO):
        fatal(f"No se encontró {ARCHIVO}")

    if str(datos.get("operacion", "")).lower() not in ("retiro", "devolucion"):
        fatal("Operación inválida (se esperaba 'retiro' o 'devolucion').")
    if not datos.get("items"):
        fatal("La operación no tiene materiales.")

    wb = load_workbook(ARCHIVO)
    ws = wb["Materiales"] if "Materiales" in wb.sheetnames else wb.worksheets[0]

    validar_legajo(wb, datos)
    validar_stock(ws, datos)
    aplicar_movimientos(ws, datos)
    registrar_historial(wb, datos)
    registrar_dispositivo(wb, datos)

    wb.save(ARCHIVO)
    log("Archivo Excel guardado exitosamente.")


if __name__ == "__main__":
    main()
