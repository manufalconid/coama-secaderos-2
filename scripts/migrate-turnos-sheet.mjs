import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { getTurnoIdCompleto, formatDateTurno, getTurnoCode } from "../apps/api/src/sheets-sync.mjs";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch (_) {}
}

async function migrateTurnosSheet() {
  let creds = null;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (rawKey && rawKey.trim().startsWith("{")) {
    creds = JSON.parse(rawKey);
  } else if (fs.existsSync("google-credentials.json")) {
    creds = JSON.parse(fs.readFileSync("google-credentials.json", "utf8"));
  }

  if (!creds) {
    throw new Error("No google credentials found.");
  }

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

  console.log(`[ MIGRACIÓN TURNOS ] Conectando al Sheet ID: ${sheetId}...`);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "turnos!A:Z"
  });

  const existing = res.data.values || [];
  console.log(`[ MIGRACIÓN TURNOS ] Filas leídas actualmente: ${existing.length}`);

  const targetHeaders = [
    "fecha", "linea", "turno_id", "turno_id_completo", "turno_td_tn", 
    "nombre", "supervisor", "hora_inicio", "hora_fin", 
    "horas_totales", "horas_programadas", "horas_muertas"
  ];

  const hasCompletoHeader = existing.length > 0 && existing[0][3] === "turno_id_completo";

  const dedupedRows = new Map(); // key = turno_id_completo -> row array

  for (let i = 1; i < existing.length; i++) {
    const r = existing[i];
    const fecha = r[0] || "";
    const linea = r[1] || "";
    const turnoId = r[2] || "";
    
    let turnoIdCompleto = "";
    let turnoTdTn = "";
    let nombre = "";
    let supervisor = "";
    let horaInicio = "";
    let horaFin = "";
    let horasTotales = "";
    let horasProgramadas = "";
    let horasMuertas = "";

    if (hasCompletoHeader) {
      turnoIdCompleto = r[3] || "";
      turnoTdTn = r[4] || "TD";
      nombre = r[5] || "";
      supervisor = r[6] || "";
      horaInicio = r[7] || "";
      horaFin = r[8] || "";
      horasTotales = r[9] || "";
      horasProgramadas = r[10] || "";
      horasMuertas = r[11] || "";
    } else {
      turnoTdTn = r[3] || "TD";
      nombre = r[4] || "";
      supervisor = r[5] || "";
      horaInicio = r[6] || "";
      horaFin = r[7] || "";
      horasTotales = r[8] || "";
      horasProgramadas = r[9] || "";
      horasMuertas = r[10] || "";
      turnoIdCompleto = getTurnoIdCompleto(fecha, turnoTdTn, linea, supervisor);
    }

    if (!turnoIdCompleto) {
      turnoIdCompleto = getTurnoIdCompleto(fecha, turnoTdTn, linea, supervisor);
    }

    const row = [
      fecha,
      linea,
      turnoId,
      turnoIdCompleto,
      turnoTdTn,
      nombre,
      supervisor,
      horaInicio,
      horaFin,
      horasTotales,
      horasProgramadas,
      horasMuertas
    ];

    if (!dedupedRows.has(turnoIdCompleto)) {
      dedupedRows.set(turnoIdCompleto, row);
    }
  }

  const finalValues = [targetHeaders, ...dedupedRows.values()];

  console.log(`[ MIGRACIÓN TURNOS ] Limpiando rango turnos!A:Z...`);
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: "turnos!A:Z"
  });

  console.log(`[ MIGRACIÓN TURNOS ] Escribiendo ${finalValues.length} filas (cabecera + ${dedupedRows.size} registros únicos)...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "turnos!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: finalValues
    }
  });

  console.log(`[ MIGRACIÓN TURNOS ] ¡Migración completada exitosamente! 0 duplicados garantizados.`);
}

migrateTurnosSheet().catch(err => {
  console.error("[ MIGRACIÓN TURNOS ] Error:", err);
  process.exit(1);
});
