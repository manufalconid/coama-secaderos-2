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

async function getExistingRows(title) {
  const sheets = getSheetsClient();
  if (!sheets) return [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${title}!A:Z`
    });
    return res.data.values || [];
  } catch (err) {
    console.error(`[ GOOGLE SHEETS ] Error al obtener filas de ${title}:`, err);
    return [];
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

  try {
    const existing = await getExistingRows(title);
    let foundIndex = -1;
    // Buscar coincidencia por clave única: evento_id + estado_evento
    for (let i = 1; i < existing.length; i++) {
      if (existing[i][0] === e.evento_id && existing[i][9] === state) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      const hasChanged = row.some((val, idx) => String(val) !== String(existing[foundIndex][idx] ?? ""));
      if (hasChanged) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${title}!A${foundIndex + 1}:Q${foundIndex + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [row] }
        });
        console.log(`[ GOOGLE SHEETS ] Evento crudo actualizado (${state}): ${e.evento_id}`);
      }
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${title}!A:A`,
        valueInputOption: "RAW",
        requestBody: { values: [row] }
      });
      console.log(`[ GOOGLE SHEETS ] Evento crudo insertado (${state}): ${e.evento_id}`);
    }
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al sincronizar evento crudo:", err);
  }
}

export async function syncProcessedEventToSheets(e) {
  const title = "registros_procesados";
  const headers = [
    "evento_id", "fecha_de_registro", "linea", "turno_hora_desde", "turno_hora_hasta",
    "tiempo_de_turno_en_horas_programadas",
    "categoria", "tiempo_muerto", "observacion", "ubicacion",
    "tiempo_muerto_hora_desde", "tiempo_muerto_hora_hasta",
    "tiempo_muerto_en_horas", "tiempo_muerto_en_minutos"
  ];

  const sheets = getSheetsClient();
  if (!sheets) return;

  const ok = await ensureSheetExists(title, headers);
  if (!ok) return;

  try {
    const durSec = e.tiempo_parada != null ? Number(e.tiempo_parada) : (e.duracion_segundos != null ? Number(e.duracion_segundos) : 0);
    const durHrFixed = (durSec / 3600).toFixed(2);
    const durMinFixed = (durSec / 60).toFixed(1);
    const durHr = durHrFixed === "0.00" ? "0" : durHrFixed.replace(".", ",");
    const durMin = durMinFixed === "0.0" ? "0" : durMinFixed.replace(".", ",");

    let obsText = (e.observacion || e.observaciones || "").replace(/\[Sugerido\].*?\.\s*/i, "").trim();
    if (obsText) {
      obsText = obsText.replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
    }
    const observacionVal = obsText ? obsText.toUpperCase() : "-.-";

    const horasProg = e.horas_totales_turno ?? 12;
    const horasProgStr = Number.isInteger(Number(horasProg)) ? Number(horasProg).toString() : Number(horasProg).toFixed(1).replace(".", ",");

    const row = [
      e.evento_id || "",
      e.fecha_registro || "",
      (e.linea || "").toUpperCase(),
      e.hora_inicio_turno || "06:00:00",
      e.hora_fin_turno || "18:00:00",
      horasProgStr,
      (e.categoria_tm || "OPERATIVO").toUpperCase(),
      (e.tiempo_muerto || "PARADA").toUpperCase(),
      observacionVal,
      e.ubicacion ? e.ubicacion.toUpperCase() : "",
      e.hora_desde || "",
      e.hora_hasta || "",
      durHr,
      durMin
    ];

    const existing = await getExistingRows(title);
    let foundIndex = -1;
    // Buscar coincidencia por clave única: evento_id
    for (let i = 1; i < existing.length; i++) {
      if (existing[i][0] === e.evento_id) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      const hasChanged = row.some((val, idx) => String(val) !== String(existing[foundIndex][idx] ?? ""));
      if (hasChanged) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${title}!A${foundIndex + 1}:N${foundIndex + 1}`,
          valueInputOption: "RAW",
          requestBody: { values: [row] }
        });
        console.log(`[ GOOGLE SHEETS ] Evento procesado actualizado: ${e.evento_id}`);
      }
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${title}!A:A`,
        valueInputOption: "RAW",
        requestBody: { values: [row] }
      });
      console.log(`[ GOOGLE SHEETS ] Evento procesado insertado: ${e.evento_id}`);
    }
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
    const existing = await getExistingRows(title);
    const existingMap = new Map(); // key = `${fecha}_${linea}_${turno_id}` -> { rowIndex, values }
    for (let i = 1; i < existing.length; i++) {
      const key = `${existing[i][0]}_${existing[i][1]}_${existing[i][2]}`;
      existingMap.set(key, { rowIndex: i, values: existing[i] });
    }

    const updates = [];
    const newRows = [];

    for (const t of turnos) {
      const row = [
        t.fecha || "",
        t.linea || "",
        t.turno_id || "",
        t.nombre || "",
        t.hora_inicio || "",
        t.hora_fin || "",
        formatDecimal(t.horas_totales),
        formatDecimal(t.horas_descanso),
        formatDecimal(t.horas_programadas)
      ];

      const key = `${t.fecha}_${t.linea}_${t.turno_id}`;
      const found = existingMap.get(key);
      if (found) {
        const hasChanged = row.some((val, idx) => String(val) !== String(found.values[idx] ?? ""));
        if (hasChanged) {
          updates.push({
            range: `${title}!A${found.rowIndex + 1}:I${found.rowIndex + 1}`,
            values: [row]
          });
        }
      } else {
        newRows.push(row);
      }
    }

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "RAW",
          data: updates
        }
      });
      console.log(`[ GOOGLE SHEETS ] Turnos: ${updates.length} filas actualizadas en lote.`);
    }

    if (newRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${title}!A:A`,
        valueInputOption: "RAW",
        requestBody: { values: newRows }
      });
      console.log(`[ GOOGLE SHEETS ] Turnos: ${newRows.length} nuevas filas añadidas.`);
    }
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al sincronizar turnos:", err);
  }
}

export async function exportAllToSheets(events, masterData) {
  const sheets = getSheetsClient();
  if (!sheets) throw new Error("Google Sheets credentials not configured.");

  // 1. Reescribir registros crudos incrementalmente
  const titleCrudos = "registros_crudos_tablet";
  const headersCrudos = [
    "evento_id", "tablet_id", "secadero_id", "fecha_registro", "linea", 
    "fecha_hora_inicio", "hora_registro", "fecha_hora_fin", "duracion_minutos", 
    "estado_evento", "tipo_registro", "categoria", "tiempo muerto", 
    "observacion", "ubicacion", "version", "tipo_turno"
  ];
  await ensureSheetExists(titleCrudos, headersCrudos);

  const existingCrudos = await getExistingRows(titleCrudos);
  const crudosMap = new Map(); // key = `${evento_id}_${estado_evento}` -> { rowIndex, values }
  for (let i = 1; i < existingCrudos.length; i++) {
    const key = `${existingCrudos[i][0]}_${existingCrudos[i][9]}`;
    crudosMap.set(key, { rowIndex: i, values: existingCrudos[i] });
  }

  const crudosUpdates = [];
  const crudosNewRows = [];

  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.fecha_hora_inicio || a.inicio || 0);
    const dateB = new Date(b.fecha_hora_inicio || b.inicio || 0);
    return dateA - dateB;
  });

  for (const e of sortedEvents) {
    // Fila 1: Inicio (abierto)
    const rowAbierto = [
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
    ];

    const keyAbierto = `${e.evento_id}_abierto`;
    const foundAbierto = crudosMap.get(keyAbierto);
    if (foundAbierto) {
      const hasChanged = rowAbierto.some((val, idx) => String(val) !== String(foundAbierto.values[idx] ?? ""));
      if (hasChanged) {
        crudosUpdates.push({
          range: `${titleCrudos}!A${foundAbierto.rowIndex + 1}:Q${foundAbierto.rowIndex + 1}`,
          values: [rowAbierto]
        });
      }
    } else {
      crudosNewRows.push(rowAbierto);
    }

    // Fila 2: Fin (cerrado) si corresponde
    if (e.estado_evento === "cerrado") {
      const rowCerrado = [
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
      ];

      const keyCerrado = `${e.evento_id}_cerrado`;
      const foundCerrado = crudosMap.get(keyCerrado);
      if (foundCerrado) {
        const hasChanged = rowCerrado.some((val, idx) => String(val) !== String(foundCerrado.values[idx] ?? ""));
        if (hasChanged) {
          crudosUpdates.push({
            range: `${titleCrudos}!A${foundCerrado.rowIndex + 1}:Q${foundCerrado.rowIndex + 1}`,
            values: [rowCerrado]
          });
        }
      } else {
        crudosNewRows.push(rowCerrado);
      }
    }
  }

  if (crudosUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: crudosUpdates
      }
    });
    console.log(`[ GOOGLE SHEETS ] Crudos: ${crudosUpdates.length} filas actualizadas.`);
  }
  if (crudosNewRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${titleCrudos}!A:A`,
      valueInputOption: "RAW",
      requestBody: { values: crudosNewRows }
    });
    console.log(`[ GOOGLE SHEETS ] Crudos: ${crudosNewRows.length} nuevas filas añadidas.`);
  }

  // 2. Reescribir registros procesados incrementalmente
  const titleProcesados = "registros_procesados";
  const headersProcesados = [
    "evento_id", "fecha_de_registro", "linea", "turno_hora_desde", "turno_hora_hasta",
    "tiempo_de_turno_en_horas_programadas",
    "categoria", "tiempo_muerto", "observacion", "ubicacion",
    "tiempo_muerto_hora_desde", "tiempo_muerto_hora_hasta",
    "tiempo_muerto_en_horas", "tiempo_muerto_en_minutos"
  ];
  await ensureSheetExists(titleProcesados, headersProcesados);

  const existingProcesados = await getExistingRows(titleProcesados);
  const procesadosMap = new Map(); // key = `evento_id` -> { rowIndex, values }
  for (let i = 1; i < existingProcesados.length; i++) {
    procesadosMap.set(existingProcesados[i][0], { rowIndex: i, values: existingProcesados[i] });
  }

  const procesadosUpdates = [];
  const procesadosNewRows = [];

  for (const e of sortedEvents) {
    if (e.estado_evento !== "cerrado" || e.inicio_evento_id) continue;

    const durSec = e.tiempo_parada != null ? Number(e.tiempo_parada) : (e.duracion_segundos != null ? Number(e.duracion_segundos) : 0);
    const durHrFixed = (durSec / 3600).toFixed(2);
    const durMinFixed = (durSec / 60).toFixed(1);
    const durHr = durHrFixed === "0.00" ? "0" : durHrFixed.replace(".", ",");
    const durMin = durMinFixed === "0.0" ? "0" : durMinFixed.replace(".", ",");

    let obsText = (e.observacion || e.observaciones || "").replace(/\[Sugerido\].*?\.\s*/i, "").trim();
    if (obsText) {
      obsText = obsText.replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
    }
    const observacionVal = obsText ? obsText.toUpperCase() : "-.-";

    const horasProg = e.horas_totales_turno ?? 12;
    const horasProgStr = Number.isInteger(Number(horasProg)) ? Number(horasProg).toString() : Number(horasProg).toFixed(1).replace(".", ",");

    const row = [
      e.evento_id || "",
      e.fecha_registro || "",
      (e.linea || "").toUpperCase(),
      e.hora_inicio_turno || "06:00:00",
      e.hora_fin_turno || "18:00:00",
      horasProgStr,
      (e.categoria_tm || "OPERATIVO").toUpperCase(),
      (e.tiempo_muerto || "PARADA").toUpperCase(),
      observacionVal,
      e.ubicacion ? e.ubicacion.toUpperCase() : "",
      e.hora_desde || "",
      e.hora_hasta || "",
      durHr,
      durMin
    ];

    const found = procesadosMap.get(e.evento_id);
    if (found) {
      const hasChanged = row.some((val, idx) => String(val) !== String(found.values[idx] ?? ""));
      if (hasChanged) {
        procesadosUpdates.push({
          range: `${titleProcesados}!A${found.rowIndex + 1}:N${found.rowIndex + 1}`,
          values: [row]
        });
      }
    } else {
      procesadosNewRows.push(row);
    }
  }

  if (procesadosUpdates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        valueInputOption: "RAW",
        data: procesadosUpdates
      }
    });
    console.log(`[ GOOGLE SHEETS ] Procesados: ${procesadosUpdates.length} filas actualizadas.`);
  }
  if (procesadosNewRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${titleProcesados}!A:A`,
      valueInputOption: "RAW",
      requestBody: { values: procesadosNewRows }
    });
    console.log(`[ GOOGLE SHEETS ] Procesados: ${procesadosNewRows.length} nuevas filas añadidas.`);
  }

  // 3. Reescribir turnos diarios incrementalmente
  const dailyTurnos = deriveDailyTurnos(sortedEvents, masterData);
  await syncTurnosToSheets(dailyTurnos);
}
