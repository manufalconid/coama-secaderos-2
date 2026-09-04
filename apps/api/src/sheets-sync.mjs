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

export function getCompositeTurnoId(fecha, horaInicio, horaFin, turnoIdRaw) {
  if (!fecha) return "";
  const f = fecha.trim();

  const start = horaInicio ? horaInicio.slice(0, 5) : "06:00";
  const end = horaFin ? horaFin.slice(0, 5) : "18:00";

  let isTD = false;

  // Si el turno comprende las 12:00 hs del mediodía
  if (start < end) {
    if (start <= "12:00" && end > "12:00") {
      isTD = true;
    }
  } else {
    // Si cruza medianoche (ej 18:00 a 06:00)
    if ("12:00" >= start || "12:00" < end) {
      isTD = true;
    }
  }

  // Verificación adicional por identificador o nombre del turno
  if (turnoIdRaw && typeof turnoIdRaw === "string") {
    const norm = turnoIdRaw.toLowerCase();
    if (norm.includes("dia") || norm.includes("día") || norm === "td" || norm.includes("tur-dia")) {
      isTD = true;
    } else if (norm.includes("noche") || norm === "tn" || norm.includes("tur-noche")) {
      isTD = false;
    }
  }

  return `${f}-${isTD ? "TD" : "TN"}`;
}

export function formatLocalTime(isoStr) {
  if (!isoStr) return "";
  const str = String(isoStr).trim();
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) return str;
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return d.toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour12: false
    });
  } catch (err) {
    return str;
  }
}

export function formatLocalTimestamp(isoStr) {
  if (!isoStr) return "";
  const str = String(isoStr).trim();
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const dateStr = d.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    const timeStr = d.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false });
    const [day, m, y] = dateStr.split("/");
    const fecha = `${y}-${m.padStart(2, "0")}-${day.padStart(2, "0")}`;
    return `${fecha} ${timeStr}`;
  } catch (err) {
    return str;
  }
}

export function deriveDailyTurnos(events, masterData) {
  const turnosMap = new Map(); // key = `${compositeId}_${linea}` -> turno record

  for (const e of events) {
    if (!e.fecha_registro) continue;
    
    // Resolver linea
    const secObj = masterData.secaderos ? masterData.secaderos.find(s => s.secadero_id === e.secadero_id) : null;
    let linea = e.linea || (secObj ? secObj.nombre : e.secadero_id || "");
    if (linea) {
      linea = linea.replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim();
    }

    // Buscar configuración de turno
    let shiftObj = null;
    if (masterData.turnos && e.turno_id) {
      shiftObj = masterData.turnos.find(t => t.turno_id === e.turno_id);
    }

    const start = e.hora_inicio_turno || (shiftObj ? shiftObj.hora_inicio : "06:00:00");
    const end = e.hora_fin_turno || (shiftObj ? shiftObj.hora_fin : "18:00:00");
    const compositeId = getCompositeTurnoId(e.fecha_registro, start, end, e.turno_id || e.tipo_turno);

    const key = `${compositeId}_${linea}`;
    if (turnosMap.has(key)) continue;

    const horas_totales = shiftObj ? Number(shiftObj.horas_totales) : 12.0;
    const horas_programadas = horas_totales; // Sin horas de descanso

    turnosMap.set(key, {
      fecha: e.fecha_registro,
      linea: linea,
      turno_id: compositeId,
      nombre: shiftObj ? shiftObj.nombre : (e.tipo_turno || e.turno_id || compositeId),
      hora_inicio: start,
      hora_fin: end,
      horas_totales: horas_totales,
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
      console.log(`[ GOOGLE SHEETS ] Pestaña ${title} creada.`);
    }

    // Siempre asegurar que las cabeceras en la fila 1 coincidan exactamente con la estructura actual
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${title}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [headers]
      }
    });

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
    "turno_id", "fecha_hora_inicio", "hora_registro", "fecha_hora_fin", "duracion_minutos", 
    "estado_evento", "tipo_registro", "categoria", "tiempo muerto", 
    "observacion", "ubicacion", "version", "tipo_turno"
  ];

  const sheets = getSheetsClient();
  if (!sheets) return;

  const ok = await ensureSheetExists(title, headers);
  if (!ok) return;

  const state = forceState || e.estado_evento || "abierto";
  const isCerrado = state === "cerrado";
  const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

  const row = [
    e.evento_id || "",
    e.tablet_id || "",
    e.secadero_id || "",
    e.fecha_registro || "",
    e.linea || "",
    compositeTurnoId,
    formatLocalTimestamp(e.fecha_hora_inicio),
    formatLocalTime(e.hora_registro || e.fecha_hora_inicio),
    isCerrado ? formatLocalTimestamp(e.fecha_hora_fin) : "",
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
      if (existing[i][0] === e.evento_id && existing[i][10] === state) {
        foundIndex = i;
        break;
      }
    }

    if (foundIndex !== -1) {
      const hasChanged = row.some((val, idx) => String(val) !== String(existing[foundIndex][idx] ?? ""));
      if (hasChanged) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `${title}!A${foundIndex + 1}:R${foundIndex + 1}`,
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
    "evento_id", "fecha_de_registro", "linea", "turno_id", "turno_hora_desde", "turno_hora_hasta",
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
    const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

    const row = [
      e.evento_id || "",
      e.fecha_registro || "",
      (e.linea || "").toUpperCase(),
      compositeTurnoId,
      e.hora_inicio_turno || "06:00:00",
      e.hora_fin_turno || "18:00:00",
      horasProgStr,
      (e.categoria_tm || "OPERATIVO").toUpperCase(),
      (e.tiempo_muerto || "PARADA").toUpperCase(),
      observacionVal,
      e.ubicacion ? e.ubicacion.toUpperCase() : "",
      formatLocalTime(e.hora_desde || e.fecha_hora_inicio),
      formatLocalTime(e.hora_hasta || e.fecha_hora_fin),
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
          range: `${title}!A${foundIndex + 1}:O${foundIndex + 1}`,
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
  const headers = ["fecha", "linea", "turno_id", "nombre", "hora_inicio", "hora_fin", "horas_totales", "horas_programadas"];

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
        formatDecimal(t.horas_programadas)
      ];

      const key = `${t.fecha}_${t.linea}_${t.turno_id}`;
      const found = existingMap.get(key);
      if (found) {
        const hasChanged = row.some((val, idx) => String(val) !== String(found.values[idx] ?? ""));
        if (hasChanged) {
          updates.push({
            range: `${title}!A${found.rowIndex + 1}:H${found.rowIndex + 1}`,
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
    "turno_id", "fecha_hora_inicio", "hora_registro", "fecha_hora_fin", "duracion_minutos", 
    "estado_evento", "tipo_registro", "categoria", "tiempo muerto", 
    "observacion", "ubicacion", "version", "tipo_turno"
  ];
  await ensureSheetExists(titleCrudos, headersCrudos);

  const existingCrudos = await getExistingRows(titleCrudos);
  const crudosMap = new Map(); // key = `${evento_id}_${estado_evento}` -> { rowIndex, values }
  for (let i = 1; i < existingCrudos.length; i++) {
    const key = `${existingCrudos[i][0]}_${existingCrudos[i][10]}`;
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
    const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

    // Fila 1: Inicio (abierto)
    const rowAbierto = [
      e.evento_id || "",
      e.tablet_id || "",
      e.secadero_id || "",
      e.fecha_registro || "",
      e.linea || "",
      compositeTurnoId,
      formatLocalTimestamp(e.fecha_hora_inicio),
      formatLocalTime(e.hora_registro || e.fecha_hora_inicio),
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
          range: `${titleCrudos}!A${foundAbierto.rowIndex + 1}:R${foundAbierto.rowIndex + 1}`,
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
        compositeTurnoId,
        formatLocalTimestamp(e.fecha_hora_inicio),
        formatLocalTime(e.hora_registro || e.fecha_hora_inicio),
        formatLocalTimestamp(e.fecha_hora_fin),
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
            range: `${titleCrudos}!A${foundCerrado.rowIndex + 1}:R${foundCerrado.rowIndex + 1}`,
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
    "evento_id", "fecha_de_registro", "linea", "turno_id", "turno_hora_desde", "turno_hora_hasta",
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
    const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

    const row = [
      e.evento_id || "",
      e.fecha_registro || "",
      (e.linea || "").toUpperCase(),
      compositeTurnoId,
      e.hora_inicio_turno || "06:00:00",
      e.hora_fin_turno || "18:00:00",
      horasProgStr,
      (e.categoria_tm || "OPERATIVO").toUpperCase(),
      (e.tiempo_muerto || "PARADA").toUpperCase(),
      observacionVal,
      e.ubicacion ? e.ubicacion.toUpperCase() : "",
      formatLocalTime(e.hora_desde || e.fecha_hora_inicio),
      formatLocalTime(e.hora_hasta || e.fecha_hora_fin),
      durHr,
      durMin
    ];

    const found = procesadosMap.get(e.evento_id);
    if (found) {
      const hasChanged = row.some((val, idx) => String(val) !== String(found.values[idx] ?? ""));
      if (hasChanged) {
        procesadosUpdates.push({
          range: `${titleProcesados}!A${found.rowIndex + 1}:O${found.rowIndex + 1}`,
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
