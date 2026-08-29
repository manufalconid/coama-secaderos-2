import { google } from "googleapis";

const sheetId = process.env.GOOGLE_SHEET_ID;
const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

let sheetsClient = null;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  if (!sheetId || !serviceAccountKeyRaw) {
    console.log("[ GOOGLE SHEETS ] Sincronización omitida (credenciales no configuradas).");
    return null;
  }
  try {
    const credentials = JSON.parse(serviceAccountKeyRaw);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al inicializar cliente:", err);
    return null;
  }
}

function formatDecimal(val) {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num)) return val.toString();
  // Formatear decimales usando coma (,)
  return num.toString().replace(".", ",");
}

export function deriveDailyTurnos(events, masterData) {
  const turnosMap = new Map(); // key = `${fecha}_${linea}_${turno_id}` -> turno record

  for (const e of events) {
    if (!e.fecha_registro || !e.turno_id) continue;
    
    // Resolver linea
    const secObj = masterData.secaderos ? masterData.secaderos.find(s => s.secadero_id === e.secadero_id) : null;
    let linea = e.linea || (secObj ? secObj.nombre : e.secadero_id || "");
    if (linea) {
      linea = linea.replace(/^Secadero\s+/i, "").toUpperCase();
    }

    const key = `${e.fecha_registro}_${linea}_${e.turno_id}`;
    if (turnosMap.has(key)) continue;

    // Buscar configuración de turno
    let shiftObj = null;
    if (masterData.turnos) {
      shiftObj = masterData.turnos.find(t => t.turno_id === e.turno_id);
    }

    const horas_totales = shiftObj ? Number(shiftObj.horas_totales) : 12.0;
    const horas_descanso = shiftObj ? Number(shiftObj.horas_descanso) : 1.0;
    const horas_programadas = horas_totales - horas_descanso;

    turnosMap.set(key, {
      fecha: e.fecha_registro,
      linea: linea,
      turno_id: e.turno_id,
      nombre: shiftObj ? shiftObj.nombre : (e.tipo_turno || e.turno_id),
      hora_inicio: e.hora_inicio_turno || (shiftObj ? shiftObj.hora_inicio : ""),
      hora_fin: e.hora_fin_turno || (shiftObj ? shiftObj.hora_fin : ""),
      horas_totales: horas_totales,
      horas_descanso: horas_descanso,
      horas_programadas: horas_programadas
    });
  }

  return Array.from(turnosMap.values()).sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    if (a.linea !== b.linea) return a.linea.localeCompare(b.linea);
    return a.turno_id.localeCompare(b.turno_id);
  });
}

async function ensureSheetExists(title, headers) {
  const sheets = getSheetsClient();
  if (!sheets) return false;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const sheetsList = meta.data.sheets || [];
    const exists = sheetsList.some(s => s.properties.title === title);

    if (!exists) {
      console.log(`[ GOOGLE SHEETS ] Creando pestaña: ${title}...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: title }
              }
            }
          ]
        }
      });
      // Escribir cabeceras
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${title}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [headers]
        }
      });
      console.log(`[ GOOGLE SHEETS ] Pestaña ${title} creada con sus cabeceras.`);
    }
    return true;
  } catch (err) {
    console.error(`[ GOOGLE SHEETS ] Error al asegurar pestaña ${title}:`, err);
    return false;
  }
}

export async function syncRawEventToSheets(e, forceState = null) {
  const title = "registros_crudos_tablet";
  const headers = [
    "evento_id", "tablet_id", "secadero_id", "fecha_registro", "linea", 
    "fecha_hora_inicio", "hora_registro", "fecha_hora_fin", "duracion_minutos", 
    "estado_evento", "tipo_registro", "categoria", "tiempo muerto", 
    "observacion", "ubicacion", "version", "tipo_turno"
  ];

  const sheets = getSheetsClient();
  if (!sheets) return;

  const ok = await ensureSheetExists(title, headers);
  if (!ok) return;

  const state = forceState || e.estado_evento || "abierto";
  const isCerrado = state === "cerrado";

  try {
    const row = [
      e.evento_id || "",
      e.tablet_id || "",
      e.secadero_id || "",
      e.fecha_registro || "",
      e.linea || "",
      e.fecha_hora_inicio || "",
      e.hora_registro || "",
      isCerrado ? (e.fecha_hora_fin || "") : "",
      isCerrado ? (e.duracion_segundos !== null && e.duracion_segundos !== undefined ? formatDecimal((Number(e.duracion_segundos) / 60).toFixed(1)) : "") : "",
      state,
      e.tipo_registro || "",
      e.categoria_tm || "",
      e.tiempo_muerto || "",
      e.observacion || "",
      e.ubicacion || "",
      e.version !== null && e.version !== undefined ? e.version : "",
      e.tipo_turno || ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${title}!A:A`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row]
      }
    });
    console.log(`[ GOOGLE SHEETS ] Evento crudo guardado aditivamente (${state}): ${e.evento_id}`);
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al sincronizar evento crudo:", err);
  }
}

export async function syncProcessedEventToSheets(e) {
  const title = "registros_procesados";
  const headers = [
    "fecha_de_registro", "linea", "turno_hora_desde", "turno_hora_hasta",
    "tiempo_de_descanso", "tiempo_de_turno_en_horas_programadas",
    "categoria", "tiempo_muerto", "observacion", "ubicacion",
    "tiempo_muerto_hora_desde", "tiempo_muerto_hora_hasta",
    "tiempo_muerto_en_horas", "tiempo_muerto_en_minutos"
  ];

  const sheets = getSheetsClient();
  if (!sheets) return;

  const ok = await ensureSheetExists(title, headers);
  if (!ok) return;

  try {
    const durSec = e.tiempo_parada != null ? Number(e.tiempo_parada) : 0;
    const durMin = (durSec / 60).toFixed(1);
    const durHr = (durSec / 3600).toFixed(2);

    const row = [
      e.fecha_registro || "",
      e.linea || "",
      e.hora_inicio_turno || "",
      e.hora_fin_turno || "",
      formatDecimal(e.tiempo_de_descanso != null ? e.tiempo_de_descanso : "1.00"),
      formatDecimal(e.tiempo_disponible_turno != null ? e.tiempo_disponible_turno : "11.00"),
      e.categoria_tm || "",
      e.tiempo_muerto || "",
      e.observacion || e.observaciones || "",
      e.ubicacion || "",
      e.hora_desde || "",
      e.hora_hasta || "",
      e.tiempo_parada != null ? formatDecimal(durHr) : "",
      e.tiempo_parada != null ? formatDecimal(durMin) : ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${title}!A:A`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row]
      }
    });
    console.log(`[ GOOGLE SHEETS ] Evento procesado guardado aditivamente: ${e.evento_id}`);
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al sincronizar evento procesado:", err);
  }
}

export async function syncTurnosToSheets(turnos) {
  const title = "turnos";
  const headers = ["fecha", "linea", "turno_id", "nombre", "hora_inicio", "hora_fin", "horas_totales", "horas_descanso", "horas_programadas"];

  const sheets = getSheetsClient();
  if (!sheets) return;

  const ok = await ensureSheetExists(title, headers);
  if (!ok) return;

  try {
    const rows = turnos.map(t => [
      t.fecha || "",
      t.linea || "",
      t.turno_id || "",
      t.nombre || "",
      t.hora_inicio || "",
      t.hora_fin || "",
      formatDecimal(t.horas_totales),
      formatDecimal(t.horas_descanso),
      formatDecimal(t.horas_programadas)
    ]);

    // Limpiar tabla actual para sobrescribir completamente
    await sheets.spreadsheets.values.clear({
      spreadsheetId: sheetId,
      range: `${title}!A:Z`
    });

    // Escribir cabeceras y registros nuevos
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${title}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers, ...rows]
      }
    });
    console.log(`[ GOOGLE SHEETS ] Tabla de turnos actualizada con ${turnos.length} registros diarios.`);
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al sincronizar turnos:", err);
  }
}

export async function exportAllToSheets(events, masterData) {
  const sheets = getSheetsClient();
  if (!sheets) throw new Error("Google Sheets credentials not configured.");

  // 1. Reescribir registros crudos
  const titleCrudos = "registros_crudos_tablet";
  const headersCrudos = [
    "evento_id", "tablet_id", "secadero_id", "fecha_registro", "linea", 
    "fecha_hora_inicio", "hora_registro", "fecha_hora_fin", "duracion_minutos", 
    "estado_evento", "tipo_registro", "categoria", "tiempo muerto", 
    "observacion", "ubicacion", "version", "tipo_turno"
  ];
  await ensureSheetExists(titleCrudos, headersCrudos);

  const crudosRows = [];
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.fecha_hora_inicio || a.inicio || 0);
    const dateB = new Date(b.fecha_hora_inicio || b.inicio || 0);
    return dateA - dateB;
  });

  for (const e of sortedEvents) {
    // Fila 1: Inicio (abierto)
    crudosRows.push([
      e.evento_id || "",
      e.tablet_id || "",
      e.secadero_id || "",
      e.fecha_registro || "",
      e.linea || "",
      e.fecha_hora_inicio || "",
      e.hora_registro || "",
      "",
      "",
      "abierto",
      e.tipo_registro || "",
      e.categoria_tm || "",
      e.tiempo_muerto || "",
      e.observacion || "",
      e.ubicacion || "",
      e.version !== null && e.version !== undefined ? e.version : "",
      e.tipo_turno || ""
    ]);

    // Fila 2: Fin (cerrado) si corresponde
    if (e.estado_evento === "cerrado") {
      crudosRows.push([
        e.evento_id || "",
        e.tablet_id || "",
        e.secadero_id || "",
        e.fecha_registro || "",
        e.linea || "",
        e.fecha_hora_inicio || "",
        e.hora_registro || "",
        e.fecha_hora_fin || "",
        e.duracion_segundos !== null && e.duracion_segundos !== undefined ? formatDecimal((Number(e.duracion_segundos) / 60).toFixed(1)) : "",
        "cerrado",
        e.tipo_registro || "",
        e.categoria_tm || "",
        e.tiempo_muerto || "",
        e.observacion || "",
        e.ubicacion || "",
        e.version !== null && e.version !== undefined ? e.version : "",
        e.tipo_turno || ""
      ]);
    }
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${titleCrudos}!A:Z`
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${titleCrudos}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headersCrudos, ...crudosRows]
    }
  });
  console.log(`[ GOOGLE SHEETS ] Pestaña ${titleCrudos} reescrita con ${crudosRows.length} registros crudos.`);

  // 2. Reescribir registros procesados
  const titleProcesados = "registros_procesados";
  const headersProcesados = [
    "fecha_de_registro", "linea", "turno_hora_desde", "turno_hora_hasta",
    "tiempo_de_descanso", "tiempo_de_turno_en_horas_programadas",
    "categoria", "tiempo_muerto", "observacion", "ubicacion",
    "tiempo_muerto_hora_desde", "tiempo_muerto_hora_hasta",
    "tiempo_muerto_en_horas", "tiempo_muerto_en_minutos"
  ];
  await ensureSheetExists(titleProcesados, headersProcesados);

  const procesadosRows = [];
  for (const e of sortedEvents) {
    if (e.estado_evento !== "cerrado") continue;

    const durSec = e.tiempo_parada != null ? Number(e.tiempo_parada) : 0;
    const durMin = (durSec / 60).toFixed(1);
    const durHr = (durSec / 3600).toFixed(2);

    procesadosRows.push([
      e.fecha_registro || "",
      e.linea || "",
      e.hora_inicio_turno || "",
      e.hora_fin_turno || "",
      formatDecimal(e.tiempo_de_descanso != null ? e.tiempo_de_descanso : "1.00"),
      formatDecimal(e.tiempo_disponible_turno != null ? e.tiempo_disponible_turno : "11.00"),
      e.categoria_tm || "",
      e.tiempo_muerto || "",
      e.observacion || e.observaciones || "",
      e.ubicacion || "",
      e.hora_desde || "",
      e.hora_hasta || "",
      e.tiempo_parada != null ? formatDecimal(durHr) : "",
      e.tiempo_parada != null ? formatDecimal(durMin) : ""
    ]);
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${titleProcesados}!A:Z`
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${titleProcesados}!A1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [headersProcesados, ...procesadosRows]
    }
  });
  console.log(`[ GOOGLE SHEETS ] Pestaña ${titleProcesados} reescrita con ${procesadosRows.length} registros procesados.`);

  // 3. Reescribir turnos diarios
  const dailyTurnos = deriveDailyTurnos(sortedEvents, masterData);
  await syncTurnosToSheets(dailyTurnos);
}
