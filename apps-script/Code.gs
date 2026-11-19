/**
 * ENERSA · Gestión de Materiales — Google Apps Script
 * ------------------------------------------------------------------
 * Reemplaza el contenido de tu proyecto de Apps Script por este archivo.
 *
 * Qué hace:
 *   1) Recibe el POST de la aplicación (index.html).
 *   2) Si viene un movimiento (retiro / devolución), dispara la GitHub Action
 *      que actualiza listado_materiales_ENERSA.xlsx, enviando también el
 *      LEGAJO y los datos del DISPOSITIVO (ID + huella SHA-256).
 *   3) Si viene {accion:'login'}, valida legajo + PIN contra la hoja
 *      "Empleados" y responde si las credenciales son válidas. Esto permite
 *      activar la validación del lado del servidor en la web
 *      (const USAR_VALIDACION_SERVIDOR = true).
 *
 * CONFIGURACIÓN — completá las 4 constantes de abajo y volvé a implementar
 * (Implementar > Administrar implementaciones > editar > Nueva versión).
 */

const GH_OWNER = 'LEAVERA77';
const GH_REPO = 'MaterialesNoMatriculados';
const GH_TOKEN = 'PEGAR_AQUI_EL_TOKEN';           // fine-grained PAT con permiso "Contents: Read and write"
const SPREADSHEET_ID = 'PEGAR_AQUI_EL_ID_DE_LA_PLANILLA'; // opcional (para la validación de login)

/**
 * POST de la aplicación.
 */
function doPost(e) {
  try {
    var datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // --- 1. Validación de identidad (opcional, del lado del servidor) ---
    if (datos.accion === 'login') {
      return json_(validarLogin_(datos.legajo, datos.pin));
    }

    // --- 2. Movimiento de materiales ---
    if (!datos.items || !datos.operacion) {
      return json_({ ok: false, motivo: 'payload_invalido' });
    }

    // Copia de respaldo en la planilla de Google (si está configurada)
    guardarEnPlanilla_(datos);

    // Disparo de la GitHub Action (es la que modifica el Excel del repo)
    var ok = dispararGitHub_(datos);

    return json_({ ok: ok, registrado: true, operacion: datos.operacion });
  } catch (err) {
    return json_({ ok: false, motivo: 'error', detalle: String(err) });
  }
}

function doGet() {
  return json_({ ok: true, servicio: 'ENERSA materiales', version: '2.0' });
}

/**
 * Valida LEGAJO + PIN contra la hoja "Empleados" (col A legajo, B nombre, C pin o hash, D activo).
 * Devuelve {ok:true, nombre} o {ok:false, motivo:'credenciales'}.
 */
function validarLogin_(legajo, pin) {
  if (!SPREADSHEET_ID) return { ok: false, motivo: 'metodo_no_soportado' };
  var legajoNorm = String(legajo || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  var pinNorm = String(pin || '').trim();
  if (!legajoNorm || !pinNorm) return { ok: false, motivo: 'credenciales' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var hoja = ss.getSheetByName('Empleados');
  if (!hoja) return { ok: false, motivo: 'metodo_no_soportado' };

  var filas = hoja.getDataRange().getValues();
  for (var i = 1; i < filas.length; i++) {
    var f = filas[i];
    if (String(f[0] || '').replace(/[^0-9A-Za-z]/g, '').toUpperCase() !== legajoNorm) continue;

    var activo = String(f[3] === undefined || f[3] === '' ? 'SI' : f[3]).trim().toUpperCase();
    if (activo === 'NO' || activo === 'FALSE' || activo === '0') {
      return { ok: false, motivo: 'inactivo' };
    }

    var guardado = String(f[2] === undefined || f[2] === null ? '' : f[2]).trim();
    var valido = false;
    if (/^[a-f0-9]{64}$/i.test(guardado)) {
      valido = (hashSha256_(pinNorm) === guardado.toLowerCase());
    } else if (guardado) {
      valido = (guardado === pinNorm) || (Number(guardado) === Number(pinNorm));
    }
    return valido ? { ok: true, nombre: String(f[1] || '').trim() } : { ok: false, motivo: 'credenciales' };
  }
  return { ok: false, motivo: 'credenciales' };
}

function hashSha256_(texto) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  return bytes.map(function (b) {
    return ('0' + (b & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/** Respaldo del movimiento en la planilla (no afecta el Excel del repo). */
function guardarEnPlanilla_(datos) {
  if (!SPREADSHEET_ID) return;
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var hoja = ss.getSheetByName('Historial') || ss.insertSheet('Historial');
    if (hoja.getLastRow() === 0) {
      hoja.appendRow(['Fecha', 'Usuario', 'Operacion', 'Material', 'Cantidad', 'Uso', 'Legajo', 'Dispositivo', 'Huella']);
    }
    (datos.items || []).forEach(function (item) {
      hoja.appendRow([
        datos.fecha || new Date(), datos.usuario || '', String(datos.operacion || '').toUpperCase(),
        item.material || '', item.cantidad || 0, datos.uso || '',
        datos.legajo || '', datos.dispositivo_id || '', datos.dispositivo_huella || ''
      ]);
    });
  } catch (err) {
    Logger.log('No se pudo guardar el respaldo: ' + err);
  }
}

/** Dispara la GitHub Action "Actualizar Materiales". */
function dispararGitHub_(datos) {
  var url = 'https://api.github.com/repos/' + GH_OWNER + '/' + GH_REPO + '/dispatches';
  var payload = {
    event_type: 'actualizar_stock',
    client_payload: {
      fecha: datos.fecha,
      usuario: datos.usuario,
      legajo: datos.legajo || '',
      operacion: datos.operacion,
      uso: datos.uso,
      items: datos.items,
      dispositivo_id: datos.dispositivo_id || '',
      dispositivo_huella: datos.dispositivo_huella || '',
      dispositivo_resumen: datos.dispositivo_resumen || '',
      dispositivo_ua: datos.dispositivo_ua || '',
      zona_horaria: datos.zona_horaria || '',
      timestamp_cliente: datos.timestamp_cliente || '',
      origen: datos.origen || ''
    }
  };

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + GH_TOKEN,
      Accept: 'application/vnd.github+json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  if (code !== 204 && code !== 200) {
    Logger.log('GitHub respondió ' + code + ': ' + res.getContentText());
    return false;
  }
  return true;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
