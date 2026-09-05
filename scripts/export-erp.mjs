import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { populateUnifiedFields } from "../apps/api/src/store.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output to erp");

const apiHost = process.env.API_HOST ?? "127.0.0.1";
const apiPort = process.env.API_PORT ?? 8080;
const apiUrl = `http://${apiHost}:${apiPort}`;

async function run() {
  console.log("====================================================");
  console.log("   LUMO DATA SOLUTIONS - EXPORTADOR ERP SIANETWORK   ");
  console.log("====================================================");

  // 1. Verificar si la carpeta de salida existe, si no, crearla
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Carpeta creada: ${outputDir}`);
  }

  // 2. Obtener datos de la API
  let masterData, snapshot;
  try {
    const mdRes = await fetch(`${apiUrl}/master-data`);
    if (!mdRes.ok) throw new Error("Fallo al obtener master-data");
    masterData = await mdRes.json();

    const snapRes = await fetch(`${apiUrl}/debug/snapshot`);
    if (!snapRes.ok) throw new Error("Fallo al obtener snapshot");
    snapshot = await snapRes.json();
  } catch (err) {
    console.error(`\n[ ERROR ] No se pudo conectar con la API en ${apiUrl}.`);
    console.error("Asegurese de iniciar el servidor con Iniciar_Lumo_Secaderos.vbs.");
    process.exit(1);
  }

  const events = snapshot.events || [];

  if (events.length === 0) {
    console.log("\n[ INFO ] No hay paradas registradas en el sistema para exportar.");
    return;
  }

  // 3. Formatear y filtrar los datos
  // Exportaremos todas las paradas CERRADAS y descartamos finEvent duplicados (inicio_evento_id)
  const closedEvents = events
    .filter(e => e.estado_evento === "cerrado" && !e.inicio_evento_id)
    .sort((a, b) => new Date(a.fecha_hora_inicio || a.hora_desde || 0) - new Date(b.fecha_hora_inicio || b.hora_desde || 0));

  if (closedEvents.length === 0) {
    console.log("\n[ INFO ] No hay paradas CERRADAS listas para exportar al ERP.");
    return;
  }

  // Columnas exactas solicitadas por el ERP (14 columnas)
  const headers = [
    "fecha_de_registro",
    "linea",
    "turno_id",
    "turno_hora_desde",
    "turno_hora_hasta",
    "tiempo_de_turno_en_horas_programadas",
    "categoria",
    "tiempo_muerto",
    "observacion",
    "ubicacion",
    "tiempo_muerto_hora_desde",
    "tiempo_muerto_hora_hasta",
    "tiempo_muerto_en_horas",
    "tiempo_muerto_en_minutos"
  ];

  const rows = [headers.join(";")];

  for (const rawEv of closedEvents) {
    // Populate event using helper to make sure all columns are filled
    const ev = populateUnifiedFields(rawEv, masterData);

    const durSec = ev.tiempo_parada != null ? Number(ev.tiempo_parada) : (ev.duracion_segundos != null ? Number(ev.duracion_segundos) : 0);
    
    // Formato decimal con coma para Microsoft Excel en español / ERP
    const durHrFixed = (durSec / 3600).toFixed(2);
    const durMinFixed = (durSec / 60).toFixed(1);
    const durHr = durHrFixed === "0.00" ? "0" : durHrFixed.replace(".", ",");
    const durMin = durMinFixed === "0.0" ? "0" : durMinFixed.replace(".", ",");

    // Limpieza de observación según especificación
    let obsText = (ev.observaciones || ev.observacion || "").replace(/\[Sugerido\].*?\.\s*/i, "").trim();
    if (obsText) {
      obsText = obsText.replace(/;/g, ",").replace(/\r?\n/g, " ").trim();
    }
    const observacionVal = obsText ? obsText.toUpperCase() : "-.-";

    // Horas programadas según maestro de turnos (ej. 12)
    const horasProg = ev.horas_totales_turno ?? 12;
    const horasProgStr = Number.isInteger(Number(horasProg)) ? Number(horasProg).toString() : Number(horasProg).toFixed(1).replace(".", ",");

    const formatErpIsoLocal = (isoStr) => {
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
      } catch (e) {
        return str;
      }
    };

    const start = ev.hora_inicio_turno || "06:00:00";
    const end = ev.hora_fin_turno || "18:00:00";
    const isTD = start <= "12:00:00" && end > "12:00:00";
    const compositeTurnoId = `${ev.fecha_registro || ""}-${isTD ? "TD" : "TN"}`;

    const row = [
      ev.fecha_registro || "",
      (ev.linea || "").toUpperCase(),
      compositeTurnoId,
      start,
      end,
      horasProgStr,
      (ev.categoria_tm || "OPERATIVO").toUpperCase(),
      (ev.tiempo_muerto || "PARADA").toUpperCase(),
      observacionVal,
      ev.ubicacion ? ev.ubicacion.toUpperCase() : "",
      formatErpIsoLocal(ev.hora_desde || ev.fecha_hora_inicio),
      formatErpIsoLocal(ev.hora_hasta || ev.fecha_hora_fin),
      durHr,
      durMin
    ];

    // Escapar comillas y formatear
    const escapedRow = row.map(val => {
      const str = String(val ?? "").replace(/;/g, ",").replace(/\r?\n/g, " ");
      if (str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });

    rows.push(escapedRow.join(";"));
  }

  // Generar nombre de archivo con fecha de hoy en Argentina (YYYY-MM-DD)
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  const filename = `LUMO_SECADEROS_PARADAS_${todayStr}.csv`;
  const outputPath = path.join(outputDir, filename);
  const generalPath = path.join(outputDir, "COAMA_Exportacion_ERP.csv");

  const content = "\ufeff" + rows.join("\r\n"); // \ufeff añade BOM UTF-8 y CRLF para Excel
  fs.writeFileSync(outputPath, content, "utf8");
  fs.writeFileSync(generalPath, content, "utf8");
  console.log(`\n[ OK ] Exportacion generada correctamente:`);
  console.log(`       Nombre: ${filename} y COAMA_Exportacion_ERP.csv`);
  console.log(`       Ruta:   ${outputPath}`);
  console.log(`       Total de paradas unicas exportadas: ${closedEvents.length}`);
}

run();
