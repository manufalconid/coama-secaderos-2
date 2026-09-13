import { google } from "googleapis";
import fs from "fs";
import { getTurnoIdCompleto, formatDateTurno, getTurnoCode } from "../apps/api/src/sheets-sync.mjs";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch (_) {}
}

async function inspectTurnos() {
  const creds = JSON.parse(fs.readFileSync("google-credentials.json", "utf8"));
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "turnos!A:K"
  });
  const rows = res.data.values || [];
  console.log(`Total filas en 'turnos': ${rows.length}`);
  console.log("Headers actuales:", rows[0]);

  const seenMap = new Map();
  const dupes = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const fecha = r[0];
    const linea = r[1];
    const turnoTd = r[3] || "TD";
    const supervisor = r[5] || "";
    
    // Calculamos el turno_id_completo
    const fechaPadded = formatDateTurno(fecha);
    const sec = (linea || "").replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim();
    const sup = (supervisor || "").trim();
    const turnoIdCompleto = sup ? `${fechaPadded}-${turnoTd}-${sec}-${sup}` : `${fechaPadded}-${turnoTd}-${sec}`;

    if (seenMap.has(turnoIdCompleto)) {
      dupes.push({ rowIndex: i + 1, turnoIdCompleto, prevRow: seenMap.get(turnoIdCompleto) });
    } else {
      seenMap.set(turnoIdCompleto, i + 1);
    }
  }

  console.log(`Total claves únicas de turno_id_completo: ${seenMap.size}`);
  console.log(`Total duplicados encontrados con la nueva clave: ${dupes.length}`);
  if (dupes.length > 0) {
    console.log("Primeros 5 duplicados:", dupes.slice(0, 5));
  }

  console.log("\nEjemplo de primeras 5 filas convertidas:");
  for (let i = 1; i <= Math.min(5, rows.length - 1); i++) {
    const r = rows[i];
    const fechaPadded = formatDateTurno(r[0]);
    const turnoTd = r[3] || "TD";
    const sec = (r[1] || "").replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim();
    const sup = (r[5] || "").trim();
    const turnoIdCompleto = sup ? `${fechaPadded}-${turnoTd}-${sec}-${sup}` : `${fechaPadded}-${turnoTd}-${sec}`;
    console.log(`Fila ${i + 1}: ${r[0]} | ${r[1]} | ${r[2]} | ${turnoIdCompleto} | ${r[3]} | ${r[4]} | ${r[5]} | ${r[10]}`);
  }
}

inspectTurnos().catch(console.error);
