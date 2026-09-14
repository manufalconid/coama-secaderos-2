import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import XLSX from "xlsx";
import {
  formatDateShort,
  formatDateTurno,
  formatTimeHHMMSS,
  getTurnoCode,
  getTurnoIdCompleto,
  getSupervisorForEvent
} from "./sheets-sync.mjs";
import { populateUnifiedFields } from "./store.mjs";

function getCredentialsObject() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (rawKey && rawKey.trim().startsWith("{")) {
    try {
      return JSON.parse(rawKey);
    } catch (e) {
      console.error("[ GRID EXPORT ] Error al parsear GOOGLE_SERVICE_ACCOUNT_KEY:", e.message);
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
        console.error(`[ GRID EXPORT ] Error leyendo credenciales en ${p}:`, e.message);
      }
    }
  }

  return null;
}

function getSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const credentials = getCredentialsObject();
  if (!sheetId || !credentials) {
    return null;
  }
  try {
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    });
    return google.sheets({ version: "v4", auth });
  } catch (err) {
    console.error("[ GRID EXPORT ] Error al inicializar cliente Google Sheets:", err);
    return null;
  }
}

export function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // Format D/M/YYYY or DD/MM/YYYY
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, "0");
    const month = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Excel serial number fallback
  const num = Number(str);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const jsDate = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().slice(0, 10);
    }
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch (_) {}

  return null;
}

export function formatISODateToDisplay(isoStr) {
  if (!isoStr) return "";
  const parts = isoStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoStr;
}

export function parseNumericCell(val) {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const cleanStr = String(val).trim().replace(",", ".");
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

export async function fetchGoogleSheetsProcessedRows() {
  const sheets = getSheetsClient();
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheets || !sheetId) return null;

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "registros_procesados!A1:R"
    });
    return res.data.values || [];
  } catch (err) {
    console.error("[ GRID EXPORT ] Error al leer registros_procesados desde Google Sheets:", err.message);
    return null;
  }
}

/**
 * Obtiene las líneas y rango de fechas disponibles en Google Sheets (o fallback de BD)
 */
export async function getGridOptions(store) {
  const sheetRows = await fetchGoogleSheetsProcessedRows();
  const linesSet = new Set();
  let minDate = null;
  let maxDate = null;
  let totalRows = 0;

  if (sheetRows && sheetRows.length > 1) {
    totalRows = sheetRows.length - 1;
    for (let i = 1; i < sheetRows.length; i++) {
      const r = sheetRows[i];
      const linea = (r[2] || "").trim().toUpperCase();
      if (linea) linesSet.add(linea);

      const dateIso = parseDateToISO(r[1]);
      if (dateIso) {
        if (!minDate || dateIso < minDate) minDate = dateIso;
        if (!maxDate || dateIso > maxDate) maxDate = dateIso;
      }
    }
  }

  // Si no se pudo obtener de Google Sheets o está vacío, extraer del store
  if (linesSet.size === 0 && store) {
    try {
      const masterData = await store.getMasterData();
      (masterData.secaderos || []).forEach(s => {
        const cleanName = (s.nombre || s.secadero_id || "").replace(/^secadero\s+/i, "").toUpperCase().trim();
        if (cleanName) linesSet.add(cleanName);
      });

      const events = await store.listEventos();
      events.forEach(e => {
        const cleanLinea = (e.linea || e.secadero_id || "").replace(/^secadero\s+/i, "").toUpperCase().trim();
        if (cleanLinea) linesSet.add(cleanLinea);

        const dateIso = parseDateToISO(e.fecha_registro || e.fecha_hora_inicio);
        if (dateIso) {
          if (!minDate || dateIso < minDate) minDate = dateIso;
          if (!maxDate || dateIso > maxDate) maxDate = dateIso;
        }
      });
      totalRows = events.filter(e => e.estado_evento === "cerrado").length;
    } catch (err) {
      console.warn("[ GRID OPTIONS ] Fallback al store local:", err.message);
    }
  }

  const lines = Array.from(linesSet).sort();
  if (lines.length === 0) {
    lines.push("BENECKE", "OMECO", "RAUTE");
  }

  return {
    lines,
    minDate: minDate || new Date().toISOString().slice(0, 10),
    maxDate: maxDate || new Date().toISOString().slice(0, 10),
    totalRows
  };
}

/**
 * Genera el archivo Excel Grid de Tiempos Muertos con los filtros aplicados
 */
export async function exportGridExcel(store, { fechaInicio, fechaFin, lineas }) {
  const targetHeaders = [
    "Fecha",
    "Hora",
    "supervisor",
    "Turno (turno completo id)",
    "Linea",
    "Horadesde",
    "Horahasta",
    "Categoría TM",
    "Tiempo Muerto",
    "Observaciones",
    "Ubicacion",
    "Tiempo perdido horas",
    "tiempo perdido minutos"
  ];

  // Normalizar filtros
  const startISO = parseDateToISO(fechaInicio);
  const endISO = parseDateToISO(fechaFin);

  let allowedLines = null;
  if (Array.isArray(lineas) && lineas.length > 0) {
    const isAll = lineas.some(l => String(l).toUpperCase() === "TODAS" || String(l).toUpperCase() === "ALL");
    if (!isAll) {
      allowedLines = new Set(lineas.map(l => String(l).trim().toUpperCase()));
    }
  } else if (typeof lineas === "string" && lineas.trim() && lineas.toUpperCase() !== "TODAS" && lineas.toUpperCase() !== "ALL") {
    allowedLines = new Set([lineas.trim().toUpperCase()]);
  }

  const gridRows = [];

  // 1. Intentar consultar directamente desde Google Sheets (hoja registros_procesados)
  const sheetRows = await fetchGoogleSheetsProcessedRows();

  if (sheetRows && sheetRows.length > 1) {
    // Columnas esperadas en registros_procesados:
    // 0: evento_id, 1: fecha_de_registro, 2: linea, 3: turno_id, 4: turno_id_completo, 5: turno_td_tn,
    // 6: supervisor_turno, 7: turno_hora_desde, 8: turno_hora_hasta, 9: tiempo_de_turno_en_horas_programadas,
    // 10: categoria, 11: tiempo_muerto, 12: observacion, 13: ubicacion, 14: tiempo_muerto_hora_desde,
    // 15: tiempo_muerto_hora_hasta, 16: tiempo_muerto_en_horas, 17: tiempo_muerto_en_minutos

    for (let i = 1; i < sheetRows.length; i++) {
      const r = sheetRows[i];
      const rowFechaRaw = r[1] || "";
      const rowFechaISO = parseDateToISO(rowFechaRaw);
      const rowLinea = (r[2] || "").trim().toUpperCase();

      // Filtro de fecha
      if (startISO && rowFechaISO && rowFechaISO < startISO) continue;
      if (endISO && rowFechaISO && rowFechaISO > endISO) continue;

      // Filtro de línea
      if (allowedLines && !allowedLines.has(rowLinea)) continue;

      // Mapeo a las 13 columnas solicitadas
      const fechaVal = rowFechaRaw || (rowFechaISO ? formatISODateToDisplay(rowFechaISO).replace(/-/g, "/") : "");
      const horaVal = r[14] || "";
      const supervisorVal = r[6] || "";
      const turnoCompletoIdVal = r[4] || "";
      const lineaVal = rowLinea;
      const horaDesdeVal = r[14] || "";
      const horaHastaVal = r[15] || "";
      const categoriaVal = r[10] || "";
      const tiempoMuertoVal = r[11] || "";
      const observacionesVal = r[12] || "";
      const ubicacionVal = r[13] || "";
      const tiempoPerdidoHorasVal = parseNumericCell(r[16]);
      const tiempoPerdidoMinutosVal = parseNumericCell(r[17]);

      gridRows.push([
        fechaVal,
        horaVal,
        supervisorVal,
        turnoCompletoIdVal,
        lineaVal,
        horaDesdeVal,
        horaHastaVal,
        categoriaVal,
        tiempoMuertoVal,
        observacionesVal,
        ubicacionVal,
        tiempoPerdidoHorasVal,
        tiempoPerdidoMinutosVal
      ]);
    }
  } else if (store) {
    // 2. Fallback si Google Sheets no está disponible: consultar BD local
    const events = await store.listEventos();
    const masterData = await store.getMasterData();
    const closedEvents = events
      .filter(e => e.estado_evento === "cerrado" && !e.inicio_evento_id)
      .sort((a, b) => new Date(a.fecha_hora_inicio || a.hora_desde || 0) - new Date(b.fecha_hora_inicio || b.hora_desde || 0));

    for (const rawEv of closedEvents) {
      const ev = populateUnifiedFields(rawEv, masterData);
      const rowFechaISO = parseDateToISO(ev.fecha_registro || ev.fecha_hora_inicio);
      const rowLinea = (ev.linea || ev.secadero_id || "").replace(/^secadero\s+/i, "").toUpperCase().trim();

      if (startISO && rowFechaISO && rowFechaISO < startISO) continue;
      if (endISO && rowFechaISO && rowFechaISO > endISO) continue;
      if (allowedLines && !allowedLines.has(rowLinea)) continue;

      const durSec = ev.tiempo_parada != null ? Number(ev.tiempo_parada) : (ev.duracion_segundos != null ? Number(ev.duracion_segundos) : 0);
      const durHr = Number((durSec / 3600).toFixed(2));
      const durMin = Number((durSec / 60).toFixed(1));

      const turnoCode = getTurnoCode(ev.fecha_registro, ev.hora_inicio_turno, ev.hora_fin_turno, ev.turno_id || ev.tipo_turno);
      const supervisor = getSupervisorForEvent(ev, masterData);
      const turnoIdCompleto = getTurnoIdCompleto(ev.fecha_registro, turnoCode, rowLinea, supervisor);

      let obsText = (ev.observaciones || ev.observacion || "").replace(/\[Sugerido\].*?\.\s*/i, "").trim();
      if (obsText) {
        obsText = obsText.replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
      }
      const observacionVal = obsText ? obsText.toUpperCase() : "-.-";

      gridRows.push([
        formatDateShort(ev.fecha_registro || ev.fecha_hora_inicio),
        formatTimeHHMMSS(ev.hora_desde || ev.fecha_hora_inicio),
        supervisor,
        turnoIdCompleto,
        rowLinea,
        formatTimeHHMMSS(ev.hora_desde || ev.fecha_hora_inicio),
        formatTimeHHMMSS(ev.hora_hasta || ev.fecha_hora_fin),
        (ev.categoria_tm || "OPERATIVO").toUpperCase(),
        (ev.tiempo_muerto || "PARADA").toUpperCase(),
        observacionVal,
        ev.ubicacion ? ev.ubicacion.toUpperCase() : "",
        durHr,
        durMin
      ]);
    }
  }

  // Armar libro Excel
  const allData = [targetHeaders, ...gridRows];
  const ws = XLSX.utils.aoa_to_sheet(allData);

  // Anchos óptimos de columnas
  ws["!cols"] = [
    { wch: 13 }, // Fecha
    { wch: 11 }, // Hora
    { wch: 24 }, // supervisor
    { wch: 42 }, // Turno (turno completo id)
    { wch: 13 }, // Linea
    { wch: 13 }, // Horadesde
    { wch: 13 }, // Horahasta
    { wch: 25 }, // Categoría TM
    { wch: 32 }, // Tiempo Muerto
    { wch: 38 }, // Observaciones
    { wch: 18 }, // Ubicacion
    { wch: 22 }, // Tiempo perdido horas
    { wch: 24 }  // tiempo perdido minutos
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grid Tiempos Muertos");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  // Construir nombre de archivo solicitado:
  // "Grid tiempos muertos FECHA INICIO FECHA FIN LumoDS"
  let datePart = "";
  if (startISO && endISO) {
    const sDisplay = formatISODateToDisplay(startISO);
    const eDisplay = formatISODateToDisplay(endISO);
    if (sDisplay === eDisplay) {
      datePart = ` ${sDisplay}`;
    } else {
      datePart = ` ${sDisplay} al ${eDisplay}`;
    }
  } else if (startISO) {
    datePart = ` desde ${formatISODateToDisplay(startISO)}`;
  } else if (endISO) {
    datePart = ` hasta ${formatISODateToDisplay(endISO)}`;
  }

  const filename = `Grid tiempos muertos${datePart} LumoDS.xlsx`;

  return {
    buffer,
    filename,
    rowCount: gridRows.length
  };
}
