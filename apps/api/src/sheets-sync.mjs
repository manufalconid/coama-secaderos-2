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
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    sheetsClient = google.sheets({ version: "v4", auth });
    return sheetsClient;
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al inicializar cliente:", err);
    return null;
  }
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

export async function syncRawEventToSheets(e) {
  const title = "registros_crudos_tablet";
  const headers = [
    "evento_id", "tablet_id", "secadero_id", "linea", 
    "fecha_hora_inicio", "fecha_hora_fin", "duracion_segundos", 
    "estado_evento", "tipo_registro", "origen_id", "razon_id", 
    "observacion", "version", "fecha_registro", "hora_registro", "tipo_turno"
  ];

  const sheets = getSheetsClient();
  if (!sheets) return;

  const ok = await ensureSheetExists(title, headers);
  if (!ok) return;

  try {
    const row = [
      e.evento_id || "",
      e.tablet_id || "",
      e.secadero_id || "",
      e.linea || "",
      e.fecha_hora_inicio || "",
      e.fecha_hora_fin || "",
      e.duracion_segundos !== null && e.duracion_segundos !== undefined ? e.duracion_segundos : "",
      e.estado_evento || "",
      e.tipo_registro || "",
      e.origen_id || "",
      e.razon_id || "",
      e.observacion || "",
      e.version !== null && e.version !== undefined ? e.version : "",
      e.fecha_registro || "",
      e.hora_registro || "",
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
    console.log(`[ GOOGLE SHEETS ] Evento crudo guardado aditivamente: ${e.evento_id}`);
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
      e.tiempo_de_descanso != null ? e.tiempo_de_descanso.toString() : "1.00",
      e.tiempo_disponible_turno != null ? e.tiempo_disponible_turno.toString() : "11.00",
      e.categoria_tm || "",
      e.tiempo_muerto || "",
      e.observacion || e.observaciones || "",
      e.ubicacion || "",
      e.hora_desde || "",
      e.hora_hasta || "",
      e.tiempo_parada != null ? durHr : "",
      e.tiempo_parada != null ? durMin : ""
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
  const headers = ["turno_id", "nombre", "hora_inicio", "hora_fin", "horas_totales", "horas_descanso"];

  const sheets = getSheetsClient();
  if (!sheets) return;

  const ok = await ensureSheetExists(title, headers);
  if (!ok) return;

  try {
    const rows = turnos.map(t => [
      t.turno_id || "",
      t.nombre || "",
      t.hora_inicio || "",
      t.hora_fin || "",
      t.horas_totales != null ? t.horas_totales.toString() : "",
      t.horas_descanso != null ? t.horas_descanso.toString() : ""
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
    console.log(`[ GOOGLE SHEETS ] Tabla de turnos actualizada con ${turnos.length} registros.`);
  } catch (err) {
    console.error("[ GOOGLE SHEETS ] Error al sincronizar turnos:", err);
  }
}
