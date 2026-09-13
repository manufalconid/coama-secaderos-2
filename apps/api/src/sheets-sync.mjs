import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

let sheetsClient = null;
let sheetsQueue = Promise.resolve();

export function enqueueSheetsTask(task) {
  const next = sheetsQueue.then(() => task()).catch(err => {
    console.error("[ GOOGLE SHEETS QUEUE ERROR ]", err);
  });
  sheetsQueue = next;
  return next;
}

function getSheetId() {
  return process.env.GOOGLE_SHEET_ID;
}

function getCredentialsObject() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (rawKey && rawKey.trim().startsWith("{")) {
    try {
      return JSON.parse(rawKey);
    } catch (e) {
      console.error("[ GOOGLE SHEETS ] Error al parsear GOOGLE_SERVICE_ACCOUNT_KEY:", e.message);
    }
  }

  const customPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CREDENTIALS_PATH;
  const potentialPaths = [
    customPath,
    path.resolve("google-credentials.json"),
    path.resolve("apps/api/google-credentials.json")
  ].filter(Boolean);

  for (const p of potentialPaths) {
    if (fs.existsSync(p)) {
      try {
        const fileContent = fs.readFileSync(p, "utf8");
        return JSON.parse(fileContent);
      } catch (e) {
        console.error(`[ GOOGLE SHEETS ] Error leyendo archivo de credenciales en ${p}:`, e.message);
      }
    }
  }

  return null;
}

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const sheetId = getSheetId();
  const credentials = getCredentialsObject();

  if (!sheetId || !credentials) {
    console.log("[ GOOGLE SHEETS ] Sincronización omitida (credenciales o GOOGLE_SHEET_ID no configurados).");
    return null;
  }
  try {
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

function formatNumber(val) {
  if (val === null || val === undefined || val === "") return "";
  if (typeof val === "number") return isNaN(val) ? "" : val;
  const str = String(val).trim().replace(",", ".");
  if (str === "") return "";
  const num = Number(str);
  return isNaN(num) ? val : num;
}

export function getTurnoCode(fecha, horaInicio, horaFin, turnoIdRaw) {
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

  return isTD ? "TD" : "TN";
}

export function parseDateParts(dateStr) {
  if (!dateStr) return { day: "1", dayPadded: "01", monthPadded: "01", year: "1970" };
  const str = String(dateStr).trim();

  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length >= 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return {
          day: String(d),
          dayPadded: String(d).padStart(2, "0"),
          monthPadded: String(m).padStart(2, "0"),
          year: String(y)
        };
      }
    }
  }

  if (str.includes("-") && !str.includes("T")) {
    const parts = str.split("-");
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
        return {
          day: String(d),
          dayPadded: String(d).padStart(2, "0"),
          monthPadded: String(m).padStart(2, "0"),
          year: String(y)
        };
      }
    }
  }

  try {
    const dateObj = new Date(str);
    if (!isNaN(dateObj.getTime())) {
      const dateStrLocal = dateObj.toLocaleDateString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires"
      });
      const parts = dateStrLocal.split("/");
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      return {
        day: String(d),
        dayPadded: String(d).padStart(2, "0"),
        monthPadded: String(m).padStart(2, "0"),
        year: String(y)
      };
    }
  } catch (err) {
    // fallback
  }

  return { day: "1", dayPadded: "01", monthPadded: "01", year: "1970" };
}

export function formatDateShort(dateStr) {
  const { day, monthPadded, year } = parseDateParts(dateStr);
  return `${day}/${monthPadded}/${year}`;
}

export function formatDateTurno(dateStr) {
  const { dayPadded, monthPadded, year } = parseDateParts(dateStr);
  return `${dayPadded}/${monthPadded}/${year}`;
}

export function formatHour2Digits(horaStr) {
  if (!horaStr) return "06";
  const str = String(horaStr).trim();
  const parts = str.split(":");
  if (parts.length > 0) {
    const h = parseInt(parts[0], 10);
    if (!isNaN(h)) {
      return String(h).padStart(2, "0");
    }
  }
  return "06";
}

export function formatDecimalComma(val, decimals = 2) {
  if (val === null || val === undefined || val === "") return "0,00";
  let num = typeof val === "number" ? val : Number(String(val).trim().replace(",", "."));
  if (isNaN(num)) return "0,00";
  return num.toFixed(decimals).replace(".", ",");
}

export function formatTimeHHMMSS(isoStr) {
  if (!isoStr) return "";
  const str = String(isoStr).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(str)) return str;
  if (/^\d{2}:\d{2}$/.test(str)) return `${str}:00`;
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

export function getCompositeTurnoId(fecha, horaInicio, horaFin, turnoIdRaw) {
  if (!fecha) return "";
  const dateFormatted = formatDateTurno(fecha);
  const code = getTurnoCode(fecha, horaInicio, horaFin, turnoIdRaw);
  return `${dateFormatted}-${code}`;
}

export function getTurnoIdCompleto(fecha, turnoTdTn, linea, supervisor) {
  if (!fecha) return "";
  const dateFormatted = formatDateTurno(fecha);
  const code = (turnoTdTn || "TD").toUpperCase();
  const sec = (linea || "").replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim();
  const sup = (supervisor || "").trim();
  return sup ? `${dateFormatted}-${code}-${sec}-${sup}` : `${dateFormatted}-${code}-${sec}`;
}

export function getSupervisorForEvent(e, masterData) {
  if (e.supervisor_turno && String(e.supervisor_turno).trim()) {
    return String(e.supervisor_turno).trim();
  }
  if (e.supervisor && String(e.supervisor).trim()) {
    return String(e.supervisor).trim();
  }

  if (!masterData || !Array.isArray(masterData.turnos) || masterData.turnos.length === 0) {
    return "";
  }

  const horaDesde = e.hora_desde || e.fecha_hora_inicio;
  if (horaDesde) {
    try {
      const eventDate = new Date(horaDesde).toLocaleDateString("sv-SE", {
        timeZone: "America/Argentina/Buenos_Aires"
      });

      const validDates = masterData.turnos
        .map(t => t.fecha_inicio_vigencia)
        .filter(d => d && d <= eventDate);

      const maxDate = validDates.length > 0 ? validDates.sort().pop() : null;

      const activeShiftsForDate = maxDate
        ? masterData.turnos.filter(t => t.fecha_inicio_vigencia === maxDate)
        : masterData.turnos;

      const localTimeStr = new Date(horaDesde).toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour12: false
      });

      for (const t of activeShiftsForDate) {
        const start = t.hora_inicio;
        const end = t.hora_fin;
        if (start < end) {
          if (localTimeStr >= start && localTimeStr < end) {
            return t.supervisor || "";
          }
        } else {
          if (localTimeStr >= start || localTimeStr < end) {
            return t.supervisor || "";
          }
        }
      }
    } catch (err) {
      // ignore
    }
  }

  const tId = e.turno_id || e.tipo_turno;
  if (tId) {
    const shiftObj = masterData.turnos.find(t => t.turno_id === tId || t.nombre === tId);
    if (shiftObj && shiftObj.supervisor) return shiftObj.supervisor;
  }

  return "";
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

export function formatErpIsoLocal(isoStr) {
  if (!isoStr) return "";
  const str = String(isoStr).trim();
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
    const timeStr = d.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false });
    const ms = String(d.getMilliseconds()).padStart(3, "0");
    const parts = timeStr.split(":");
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const ss = (parts[2] || "00").padStart(2, "0");
    return `${dateStr}T${hh}:${mm}:${ss}.${ms}Z`;
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
  const turnosMap = new Map(); // key = turno_id_completo -> turno record

  for (const e of events) {
    if (!e.fecha_registro) continue;
    
    // Resolver linea
    const secObj = masterData && masterData.secaderos ? masterData.secaderos.find(s => s.secadero_id === e.secadero_id) : null;
    let linea = e.linea || (secObj ? secObj.nombre : e.secadero_id || "");
    if (linea) {
      linea = linea.replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim();
    }

    // Buscar configuración de turno respectiva a la fecha de vigencia
    let shiftObj = null;
    if (masterData && masterData.turnos && masterData.turnos.length > 0) {
      const eventDate = e.fecha_registro;
      const validShifts = masterData.turnos.filter(t => !t.fecha_inicio_vigencia || t.fecha_inicio_vigencia <= eventDate);
      if (validShifts.length > 0) {
        const dates = validShifts.map(t => t.fecha_inicio_vigencia || "1970-01-01").sort();
        const maxDate = dates.pop();
        const candidateShifts = validShifts.filter(t => (t.fecha_inicio_vigencia || "1970-01-01") === maxDate);
        if (e.turno_id) {
          shiftObj = candidateShifts.find(t => t.turno_id === e.turno_id) || masterData.turnos.find(t => t.turno_id === e.turno_id);
        } else {
          shiftObj = candidateShifts[0];
        }
      } else {
        if (e.turno_id) shiftObj = masterData.turnos.find(t => t.turno_id === e.turno_id);
      }
    }

    const start = e.hora_inicio_turno || (shiftObj ? shiftObj.hora_inicio : "06:00:00");
    const end = e.hora_fin_turno || (shiftObj ? shiftObj.hora_fin : "18:00:00");
    const compositeId = getCompositeTurnoId(e.fecha_registro, start, end, e.turno_id || e.tipo_turno);
    const turnoCode = getTurnoCode(e.fecha_registro, start, end, e.turno_id || e.tipo_turno);
    const supervisor = getSupervisorForEvent(e, masterData);
    const turnoIdCompleto = getTurnoIdCompleto(e.fecha_registro, turnoCode, linea, supervisor);

    const durSec = e.estado_evento === "cerrado" ? (e.tiempo_parada != null ? Number(e.tiempo_parada) : (e.duracion_segundos != null ? Number(e.duracion_segundos) : 0)) : 0;
    const durHr = durSec / 3600;

    if (!turnosMap.has(turnoIdCompleto)) {
      const horas_totales = formatNumber(shiftObj ? shiftObj.horas_totales : 12) || 12;
      const horas_programadas = horas_totales;

      turnosMap.set(turnoIdCompleto, {
        fecha: formatDateShort(e.fecha_registro),
        linea: linea,
        turno_id: compositeId,
        turno_id_completo: turnoIdCompleto,
        turno_td_tn: turnoCode,
        nombre: shiftObj ? shiftObj.nombre : "",
        supervisor: supervisor,
        hora_inicio: formatHour2Digits(start),
        hora_fin: formatHour2Digits(end),
        horas_totales: horas_totales,
        horas_programadas: horas_programadas,
        horas_muertas: durHr
      });
    } else {
      const existingRecord = turnosMap.get(turnoIdCompleto);
      existingRecord.horas_muertas += durHr;
    }
  }

  return Array.from(turnosMap.values()).sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    if (a.linea !== b.linea) return a.linea.localeCompare(b.linea);
    return a.turno_id_completo.localeCompare(b.turno_id_completo);
  });
}

async function ensureSheetExists(title, headers) {
  const sheets = getSheetsClient();
  if (!sheets) return false;
  const sheetId = getSheetId();
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
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [headers]
      }
    });

    return true;
  } catch (err) {
    console.error(`[ GOOGLE SHEETS ] Error al verificar/crear pestaña ${title}:`, err);
    return false;
  }
}

async function getExistingRows(title) {
  const sheets = getSheetsClient();
  if (!sheets) return [];
  const sheetId = getSheetId();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${title}!A:Z`
    });
    return res.data.values || [];
  } catch (err) {
    return [];
  }
}

export async function syncRawEventToSheets(e, masterData = null) {
  return enqueueSheetsTask(async () => {
    const title = "registros_crudos_tablet";
    const headers = [
      "evento_id", "tablet_id", "secadero_id", "fecha_registro", "linea", 
      "turno_id", "turno_td_tn", "supervisor_turno", "fecha_hora_inicio", "hora_registro", "fecha_hora_fin", "duracion_minutos", 
      "estado_evento", "tipo_registro", "categoria", "tiempo muerto", 
      "observacion", "ubicacion", "version", "tipo_turno"
    ];

    const sheets = getSheetsClient();
    if (!sheets) return;
    const sheetId = getSheetId();

    const ok = await ensureSheetExists(title, headers);
    if (!ok) return;

    const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);
    const turnoCode = getTurnoCode(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

    // Fila del registro actual (abierto o cerrado)
    const row = [
      e.evento_id || "",
      e.tablet_id || "",
      e.secadero_id || "",
      e.fecha_registro || "",
      e.linea || "",
      compositeTurnoId,
      turnoCode,
      getSupervisorForEvent(e, masterData),
      formatLocalTimestamp(e.fecha_hora_inicio),
      formatLocalTime(e.hora_registro || e.fecha_hora_inicio),
      e.estado_evento === "cerrado" ? formatLocalTimestamp(e.fecha_hora_fin) : "",
      e.estado_evento === "cerrado" ? formatNumber(e.duracion_segundos !== null && e.duracion_segundos !== undefined ? Number((Number(e.duracion_segundos) / 60).toFixed(1)) : "") : "",
      e.estado_evento || "abierto",
      e.tipo_registro || "",
      e.categoria_tm || "",
      e.tiempo_muerto || "",
      e.observacion || "",
      e.ubicacion || "",
      formatNumber(e.version),
      e.tipo_turno || ""
    ];

    try {
      const existing = await getExistingRows(title);
      let foundIndex = -1;
      // Buscar coincidencia por clave única: evento_id + estado_evento
      for (let i = 1; i < existing.length; i++) {
        if (existing[i][0] === e.evento_id && existing[i][12] === e.estado_evento) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex !== -1) {
        const hasChanged = row.some((val, idx) => String(val) !== String(existing[foundIndex][idx] ?? ""));
        if (hasChanged) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `${title}!A${foundIndex + 1}:T${foundIndex + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [row] }
          });
          console.log(`[ GOOGLE SHEETS ] Evento crudo actualizado: ${e.evento_id} (${e.estado_evento})`);
        }
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${title}!A:A`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] }
        });
        console.log(`[ GOOGLE SHEETS ] Evento crudo insertado: ${e.evento_id} (${e.estado_evento})`);
      }
    } catch (err) {
      console.error("[ GOOGLE SHEETS ] Error al sincronizar evento crudo:", err);
    }
  });
}

export async function syncProcessedEventToSheets(e, masterData = null) {
  return enqueueSheetsTask(async () => {
    // Si no es un evento cerrado o es un evento técnico de fin redundante, ignorar
    if (e.estado_evento !== "cerrado" || e.inicio_evento_id) return;

    const title = "registros_procesados";
    const headers = [
      "evento_id", "fecha_de_registro", "linea", "turno_id", "turno_td_tn", "supervisor_turno", "turno_hora_desde", "turno_hora_hasta",
      "tiempo_de_turno_en_horas_programadas",
      "categoria", "tiempo_muerto", "observacion", "ubicacion",
      "tiempo_muerto_hora_desde", "tiempo_muerto_hora_hasta",
      "tiempo_muerto_en_horas", "tiempo_muerto_en_minutos"
    ];

    const sheets = getSheetsClient();
    if (!sheets) return;
    const sheetId = getSheetId();

    const ok = await ensureSheetExists(title, headers);
    if (!ok) return;

    const durSec = e.tiempo_parada != null ? Number(e.tiempo_parada) : (e.duracion_segundos != null ? Number(e.duracion_segundos) : 0);
    const durHr = Number((durSec / 3600).toFixed(2));
    const durMin = Number((durSec / 60).toFixed(1));

    let obsText = (e.observacion || e.observaciones || "").replace(/\[Sugerido\].*?\.\s*/i, "").trim();
    if (obsText) {
      obsText = obsText.replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
    }
    const observacionVal = obsText ? obsText.toUpperCase() : "-.-";

    const horasProg = formatNumber(e.horas_totales_turno ?? 12);
    const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);
    const turnoCode = getTurnoCode(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

    const row = [
      e.evento_id || "",
      formatDateShort(e.fecha_registro),
      (e.linea || "").toUpperCase(),
      compositeTurnoId,
      turnoCode,
      getSupervisorForEvent(e, masterData),
      formatHour2Digits(e.hora_inicio_turno || "06:00:00"),
      formatHour2Digits(e.hora_fin_turno || "18:00:00"),
      horasProg,
      (e.categoria_tm || "OPERATIVO").toUpperCase(),
      (e.tiempo_muerto || "PARADA").toUpperCase(),
      observacionVal,
      e.ubicacion ? e.ubicacion.toUpperCase() : "",
      formatTimeHHMMSS(e.hora_desde || e.fecha_hora_inicio),
      formatTimeHHMMSS(e.hora_hasta || e.fecha_hora_fin),
      formatDecimalComma(durHr, 2),
      formatNumber(durMin)
    ];

    try {
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
            range: `${title}!A${foundIndex + 1}:Q${foundIndex + 1}`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [row] }
          });
          console.log(`[ GOOGLE SHEETS ] Evento procesado actualizado: ${e.evento_id}`);
        }
      } else {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${title}!A:A`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: [row] }
        });
        console.log(`[ GOOGLE SHEETS ] Evento procesado insertado: ${e.evento_id}`);
      }
    } catch (err) {
      console.error("[ GOOGLE SHEETS ] Error al sincronizar evento procesado:", err);
    }
  });
}

export async function syncTurnosToSheets(turnos) {
  return enqueueSheetsTask(async () => {
    const title = "turnos";
    const headers = [
      "fecha", "linea", "turno_id", "turno_id_completo", "turno_td_tn", 
      "nombre", "supervisor", "hora_inicio", "hora_fin", 
      "horas_totales", "horas_programadas", "horas_muertas"
    ];

    const sheets = getSheetsClient();
    if (!sheets) return;
    const sheetId = getSheetId();

    const ok = await ensureSheetExists(title, headers);
    if (!ok) return;

    try {
      const existing = await getExistingRows(title);
      const turnosMap = new Map(); // key = turno_id_completo -> { rowIndex, values }
      
      const hasCompletoHeader = existing.length > 0 && existing[0][3] === "turno_id_completo";

      for (let i = 1; i < existing.length; i++) {
        const r = existing[i];
        let key = "";
        if (hasCompletoHeader && r[3]) {
          key = r[3];
        } else {
          const f = r[0] || "";
          const linea = r[1] || "";
          const code = (hasCompletoHeader ? r[4] : r[3]) || "TD";
          const sup = (hasCompletoHeader ? r[6] : r[5]) || "";
          key = getTurnoIdCompleto(f, code, linea, sup);
        }

        if (key && !turnosMap.has(key)) {
          turnosMap.set(key, { rowIndex: i, values: r });
        }
      }

      const updates = [];
      const newRows = [];
      const seenKeys = new Set(turnosMap.keys());

      for (const t of turnos) {
        const code = t.turno_td_tn || getTurnoCode(t.fecha, t.hora_inicio, t.hora_fin, t.turno_id || t.nombre);
        const turnoIdCompleto = t.turno_id_completo || getTurnoIdCompleto(t.fecha, code, t.linea, t.supervisor);
        const fFormatted = formatDateShort(t.fecha);

        const row = [
          fFormatted,
          t.linea || "",
          t.turno_id || "",
          turnoIdCompleto,
          code,
          t.nombre || "",
          t.supervisor || "",
          formatHour2Digits(t.hora_inicio),
          formatHour2Digits(t.hora_fin),
          formatNumber(t.horas_totales),
          formatNumber(t.horas_programadas),
          formatDecimalComma(t.horas_muertas, 2)
        ];

        const found = turnosMap.get(turnoIdCompleto);
        if (found) {
          const hasChanged = row.some((val, idx) => String(val) !== String(found.values[idx] ?? ""));
          if (hasChanged) {
            updates.push({
              range: `${title}!A${found.rowIndex + 1}:L${found.rowIndex + 1}`,
              values: [row]
            });
          }
        } else if (!seenKeys.has(turnoIdCompleto)) {
          seenKeys.add(turnoIdCompleto);
          newRows.push(row);
        }
      }

      if (updates.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            valueInputOption: "USER_ENTERED",
            data: updates
          }
        });
        console.log(`[ GOOGLE SHEETS ] Turnos: ${updates.length} filas actualizadas.`);
      }

      if (newRows.length > 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: sheetId,
          range: `${title}!A:A`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: newRows }
        });
        console.log(`[ GOOGLE SHEETS ] Turnos: ${newRows.length} nuevas filas añadidas.`);
      }
    } catch (err) {
      console.error("[ GOOGLE SHEETS ] Error al sincronizar turnos:", err);
    }
  });
}

export async function exportAllToSheets(events, masterData) {
  return enqueueSheetsTask(async () => {
    const sheets = getSheetsClient();
    if (!sheets) throw new Error("Google Sheets credentials not configured.");
    const sheetId = getSheetId();

    // 0. Deduplicar lista de eventos de entrada por evento_id
    const eventMap = new Map();
    for (const ev of events || []) {
      if (!ev || !ev.evento_id) continue;
      const existingEv = eventMap.get(ev.evento_id);
      if (!existingEv || (ev.estado_evento === "cerrado" && existingEv.estado_evento !== "cerrado") || (ev.version > (existingEv.version || 0))) {
        eventMap.set(ev.evento_id, ev);
      }
    }
    const deduplicatedEvents = Array.from(eventMap.values());

    // 1. Sincronizar registros crudos incrementalmente
    const titleCrudos = "registros_crudos_tablet";
    const headersCrudos = [
      "evento_id", "tablet_id", "secadero_id", "fecha_registro", "linea", 
      "turno_id", "turno_td_tn", "supervisor_turno", "fecha_hora_inicio", "hora_registro", "fecha_hora_fin", "duracion_minutos", 
      "estado_evento", "tipo_registro", "categoria", "tiempo muerto", 
      "observacion", "ubicacion", "version", "tipo_turno"
    ];
    await ensureSheetExists(titleCrudos, headersCrudos);

    const existingCrudos = await getExistingRows(titleCrudos);
    const crudosMap = new Map(); // key = `${evento_id}_${estado_evento}` -> { rowIndex, values }
    for (let i = 1; i < existingCrudos.length; i++) {
      const key = `${existingCrudos[i][0]}_${existingCrudos[i][12]}`;
      if (!crudosMap.has(key)) {
        crudosMap.set(key, { rowIndex: i, values: existingCrudos[i] });
      }
    }

    const crudosUpdates = [];
    const crudosNewRows = [];
    const seenCrudosKeys = new Set(crudosMap.keys());

    const sortedEvents = [...deduplicatedEvents].sort((a, b) => {
      const dateA = new Date(a.fecha_hora_inicio || a.inicio || 0);
      const dateB = new Date(b.fecha_hora_inicio || b.inicio || 0);
      return dateA - dateB;
    });

    for (const e of sortedEvents) {
      if (e.inicio_evento_id) continue;
      const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);
      const turnoCode = getTurnoCode(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

      // Fila 1: Inicio (abierto)
      const rowAbierto = [
        e.evento_id || "",
        e.tablet_id || "",
        e.secadero_id || "",
        e.fecha_registro || "",
        e.linea || "",
        compositeTurnoId,
        turnoCode,
        getSupervisorForEvent(e, masterData),
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
        formatNumber(e.version),
        e.tipo_turno || ""
      ];

      const keyAbierto = `${e.evento_id}_abierto`;
      const foundAbierto = crudosMap.get(keyAbierto);
      if (foundAbierto) {
        const hasChanged = rowAbierto.some((val, idx) => String(val) !== String(foundAbierto.values[idx] ?? ""));
        if (hasChanged) {
          crudosUpdates.push({
            range: `${titleCrudos}!A${foundAbierto.rowIndex + 1}:T${foundAbierto.rowIndex + 1}`,
            values: [rowAbierto]
          });
        }
      } else if (!seenCrudosKeys.has(keyAbierto)) {
        seenCrudosKeys.add(keyAbierto);
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
          turnoCode,
          getSupervisorForEvent(e, masterData),
          formatLocalTimestamp(e.fecha_hora_inicio),
          formatLocalTime(e.hora_registro || e.fecha_hora_inicio),
          formatLocalTimestamp(e.fecha_hora_fin),
          formatNumber(e.duracion_segundos !== null && e.duracion_segundos !== undefined ? Number((Number(e.duracion_segundos) / 60).toFixed(1)) : ""),
          "cerrado",
          e.tipo_registro || "",
          e.categoria_tm || "",
          e.tiempo_muerto || "",
          e.observacion || "",
          e.ubicacion || "",
          formatNumber(e.version),
          e.tipo_turno || ""
        ];

        const keyCerrado = `${e.evento_id}_cerrado`;
        const foundCerrado = crudosMap.get(keyCerrado);
        if (foundCerrado) {
          const hasChanged = rowCerrado.some((val, idx) => String(val) !== String(foundCerrado.values[idx] ?? ""));
          if (hasChanged) {
            crudosUpdates.push({
              range: `${titleCrudos}!A${foundCerrado.rowIndex + 1}:T${foundCerrado.rowIndex + 1}`,
              values: [rowCerrado]
            });
          }
        } else if (!seenCrudosKeys.has(keyCerrado)) {
          seenCrudosKeys.add(keyCerrado);
          crudosNewRows.push(rowCerrado);
        }
      }
    }

    if (crudosUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: crudosUpdates
        }
      });
      console.log(`[ GOOGLE SHEETS ] Crudos: ${crudosUpdates.length} filas actualizadas.`);
    }

    if (crudosNewRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${titleCrudos}!A:A`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: crudosNewRows }
      });
      console.log(`[ GOOGLE SHEETS ] Crudos: ${crudosNewRows.length} nuevas filas añadidas.`);
    }

    // 2. Sincronizar registros procesados incrementalmente (con actualización in-place)
    const titleProcesados = "registros_procesados";
    const headersProcesados = [
      "evento_id", "fecha_de_registro", "linea", "turno_id", "turno_td_tn", "supervisor_turno", "turno_hora_desde", "turno_hora_hasta",
      "tiempo_de_turno_en_horas_programadas",
      "categoria", "tiempo_muerto", "observacion", "ubicacion",
      "tiempo_muerto_hora_desde", "tiempo_muerto_hora_hasta",
      "tiempo_muerto_en_horas", "tiempo_muerto_en_minutos"
    ];
    await ensureSheetExists(titleProcesados, headersProcesados);

    const existingProcesados = await getExistingRows(titleProcesados);
    const procesadosMap = new Map(); // evento_id -> { rowIndex, values }
    for (let i = 1; i < existingProcesados.length; i++) {
      if (existingProcesados[i][0]) {
        if (!procesadosMap.has(existingProcesados[i][0])) {
          procesadosMap.set(existingProcesados[i][0], { rowIndex: i, values: existingProcesados[i] });
        }
      }
    }

    const procesadosUpdates = [];
    const procesadosNewRows = [];
    const seenProcesadosIds = new Set(procesadosMap.keys());

    for (const e of sortedEvents) {
      if (e.estado_evento !== "cerrado" || e.inicio_evento_id) continue;

      const durSec = e.tiempo_parada != null ? Number(e.tiempo_parada) : (e.duracion_segundos != null ? Number(e.duracion_segundos) : 0);
      const durHr = Number((durSec / 3600).toFixed(2));
      const durMin = Number((durSec / 60).toFixed(1));

      let obsText = (e.observacion || e.observaciones || "").replace(/\[Sugerido\].*?\.\s*/i, "").trim();
      if (obsText) {
        obsText = obsText.replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
      }
      const observacionVal = obsText ? obsText.toUpperCase() : "-.-";

      const horasProg = formatNumber(e.horas_totales_turno ?? 12);
      const compositeTurnoId = getCompositeTurnoId(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);
      const turnoCode = getTurnoCode(e.fecha_registro, e.hora_inicio_turno, e.hora_fin_turno, e.turno_id || e.tipo_turno);

      const row = [
        e.evento_id || "",
        formatDateShort(e.fecha_registro),
        (e.linea || "").toUpperCase(),
        compositeTurnoId,
        turnoCode,
        getSupervisorForEvent(e, masterData),
        formatHour2Digits(e.hora_inicio_turno || "06:00:00"),
        formatHour2Digits(e.hora_fin_turno || "18:00:00"),
        horasProg,
        (e.categoria_tm || "OPERATIVO").toUpperCase(),
        (e.tiempo_muerto || "PARADA").toUpperCase(),
        observacionVal,
        e.ubicacion ? e.ubicacion.toUpperCase() : "",
        formatTimeHHMMSS(e.hora_desde || e.fecha_hora_inicio),
        formatTimeHHMMSS(e.hora_hasta || e.fecha_hora_fin),
        formatDecimalComma(durHr, 2),
        formatNumber(durMin)
      ];

      const found = procesadosMap.get(e.evento_id);
      if (found) {
        const hasChanged = row.some((val, idx) => String(val) !== String(found.values[idx] ?? ""));
        if (hasChanged) {
          procesadosUpdates.push({
            range: `${titleProcesados}!A${found.rowIndex + 1}:Q${found.rowIndex + 1}`,
            values: [row]
          });
        }
      } else if (!seenProcesadosIds.has(e.evento_id)) {
        seenProcesadosIds.add(e.evento_id);
        procesadosNewRows.push(row);
      }
    }

    if (procesadosUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          valueInputOption: "USER_ENTERED",
          data: procesadosUpdates
        }
      });
      console.log(`[ GOOGLE SHEETS ] Procesados: ${procesadosUpdates.length} filas actualizadas.`);
    }

    if (procesadosNewRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: `${titleProcesados}!A:A`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: procesadosNewRows }
      });
      console.log(`[ GOOGLE SHEETS ] Procesados: ${procesadosNewRows.length} nuevas filas añadidas.`);
    }

    // 3. Sincronizar turnos
    const dailyTurnos = deriveDailyTurnos(deduplicatedEvents, masterData);
    await syncTurnosToSheets(dailyTurnos);
  });
}
