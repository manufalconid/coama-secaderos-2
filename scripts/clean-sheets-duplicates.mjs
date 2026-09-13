import { google } from "googleapis";
import fs from "fs";

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch (_) {}
}

async function cleanSheetDuplicates() {
  console.log("Iniciando limpieza y deduplicación en Google Sheets...");
  const creds = JSON.parse(fs.readFileSync("google-credentials.json", "utf8"));
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
  const sheets = google.sheets({ version: "v4", auth });
  const sheetId = process.env.GOOGLE_SHEET_ID;

  // 1. Limpiar 'registros_procesados'
  console.log("\n--- Limpiando 'registros_procesados' ---");
  const procRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "registros_procesados!A:Q"
  });
  const procRows = procRes.data.values || [];
  if (procRows.length > 0) {
    const header = procRows[0];
    const uniqueProcRows = [];
    const seenProcIds = new Set();
    let dupesCount = 0;

    for (let i = 1; i < procRows.length; i++) {
      const row = procRows[i];
      const id = row[0];
      if (!id) continue;
      if (seenProcIds.has(id)) {
        dupesCount++;
        console.log(`  [DUPLICADO ELIMINADO] Fila ${i + 1} con ID: ${id}`);
      } else {
        seenProcIds.add(id);
        uniqueProcRows.push(row);
      }
    }

    console.log(`Filas originales: ${procRows.length - 1} | Únicas: ${uniqueProcRows.length} | Duplicados eliminados: ${dupesCount}`);

    if (dupesCount > 0) {
      // Limpiar pestaña y reescribir ordenado
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: "registros_procesados!A:Q"
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "registros_procesados!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [header, ...uniqueProcRows]
        }
      });
      console.log("✅ 'registros_procesados' limpiado y reescrito sin duplicados.");
    } else {
      console.log("No había duplicados en 'registros_procesados'.");
    }
  }

  // 2. Limpiar 'registros_crudos_tablet'
  console.log("\n--- Limpiando 'registros_crudos_tablet' ---");
  const crudRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "registros_crudos_tablet!A:T"
  });
  const crudRows = crudRes.data.values || [];
  if (crudRows.length > 0) {
    const header = crudRows[0];
    const uniqueCrudRows = [];
    const seenCrudKeys = new Set();
    let dupesCount = 0;

    for (let i = 1; i < crudRows.length; i++) {
      const row = crudRows[i];
      const id = row[0];
      const estado = row[12];
      if (!id || !estado) continue;
      const key = `${id}_${estado}`;
      if (seenCrudKeys.has(key)) {
        dupesCount++;
        console.log(`  [DUPLICADO ELIMINADO] Fila ${i + 1} con Key: ${key}`);
      } else {
        seenCrudKeys.add(key);
        uniqueCrudRows.push(row);
      }
    }

    console.log(`Filas originales: ${crudRows.length - 1} | Únicas: ${uniqueCrudRows.length} | Duplicados eliminados: ${dupesCount}`);

    if (dupesCount > 0) {
      // Limpiar pestaña y reescribir ordenado
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: "registros_crudos_tablet!A:T"
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: "registros_crudos_tablet!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [header, ...uniqueCrudRows]
        }
      });
      console.log("✅ 'registros_crudos_tablet' limpiado y reescrito sin duplicados.");
    } else {
      console.log("No había duplicados en 'registros_crudos_tablet'.");
    }
  }

  console.log("\n🎉 ¡Limpieza de Google Sheets finalizada con éxito!");
}

cleanSheetDuplicates().catch(console.error);
