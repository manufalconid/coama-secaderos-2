import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

    const formatLocalTime = (isoStr) => {
      if (!isoStr) return "";
      const str = String(isoStr).trim();
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(str)) return str;
      try {
        const d = new Date(str);
        if (isNaN(d.getTime())) return str;
        return d.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false });
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
      formatLocalTime(ev.hora_desde || ev.fecha_hora_inicio),
      formatLocalTime(ev.hora_hasta || ev.fecha_hora_fin),
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

function populateUnifiedFields(event, masterData) {
  const timestamp_registro = event.timestamp_registro || event.creado_en_tablet || new Date().toISOString();
  
  let fecha_registro = event.fecha_registro;
  let hora_registro = event.hora_registro;
  try {
    const localD = new Date(timestamp_registro);
    const dateStr = localD.toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" });
    const timeStr = localD.toLocaleTimeString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour12: false });
    if (!fecha_registro) {
      const [d, m, y] = dateStr.split("/");
      fecha_registro = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (!hora_registro) {
      hora_registro = timeStr;
    }
  } catch (err) {
    console.error("Error formatting date/time for sync", err);
  }

  const hora_desde = event.hora_desde || event.fecha_hora_inicio;
  const hora_hasta = event.hora_hasta || event.fecha_hora_fin;
  
  let tiempo_parada = event.tiempo_parada;
  if (tiempo_parada == null && hora_desde && hora_hasta) {
    tiempo_parada = Math.floor((new Date(hora_hasta) - new Date(hora_desde)) / 1000);
  } else if (tiempo_parada == null && event.duracion_segundos != null) {
    tiempo_parada = event.duracion_segundos;
  }

  const observaciones = event.observaciones || event.observacion || "";

  let linea = event.linea;
  if (!linea) {
    const secadero = masterData.secaderos.find(s => s.secadero_id === event.secadero_id);
    linea = secadero ? secadero.nombre : event.secadero_id;
  }
  if (linea) {
    linea = linea.replace("Secadero ", "").toUpperCase();
  }

  let categoria_tm = event.categoria_tm;
  if (!categoria_tm && Array.isArray(event.origenes) && event.origenes.length > 0) {
    const oNames = event.origenes.map(o => {
      if (o.origen_manual) return o.origen_manual;
      const m = masterData.origenes.find(x => x.origen_id === o.origen_id);
      return m ? m.nombre : o.origen_id;
    });
    categoria_tm = oNames.join(", ");
  }

  let tiempo_muerto = event.tiempo_muerto;
  if (!tiempo_muerto) {
    if (event.razon_manual) {
      tiempo_muerto = event.razon_manual;
    } else if (event.razon_id) {
      const r = masterData.razones.find(x => x.razon_id === event.razon_id);
      tiempo_muerto = r ? r.nombre : event.razon_id;
    }
  }

  let activeTurno = null;
  if (Array.isArray(masterData.turnos) && masterData.turnos.length > 0 && hora_desde) {
    try {
      const localTimeStr = new Date(hora_desde).toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour12: false
      });
      for (const t of masterData.turnos) {
        const start = t.hora_inicio;
        const end = t.hora_fin;
        if (start < end) {
          if (localTimeStr >= start && localTimeStr < end) {
            activeTurno = t;
            break;
          }
        } else {
          if (localTimeStr >= start || localTimeStr < end) {
            activeTurno = t;
            break;
          }
        }
      }
    } catch (e) {
      console.error("Error matching shifts", e);
    }
  }

  const hora_inicio_turno = event.hora_inicio_turno || (activeTurno ? activeTurno.hora_inicio : null);
  const hora_fin_turno = event.hora_fin_turno || (activeTurno ? activeTurno.hora_fin : null);
  const tipo_turno = event.tipo_turno || (activeTurno ? activeTurno.nombre : null);
  
  const hora_inicio_descanso = event.hora_inicio_descanso || (activeTurno && activeTurno.turno_id === "tur-dia" ? "12:00:00" : (activeTurno && activeTurno.turno_id === "tur-noche" ? "00:00:00" : null));
  const hora_fin_descanso = event.hora_fin_descanso || (activeTurno && activeTurno.turno_id === "tur-dia" ? "13:00:00" : (activeTurno && activeTurno.turno_id === "tur-noche" ? "01:00:00" : null));

  const tiempo_disponible_turno = event.tiempo_disponible_turno != null ? event.tiempo_disponible_turno : (activeTurno ? Number(activeTurno.horas_totales) : 12.00);
  const horas_totales_turno = activeTurno ? Number(activeTurno.horas_totales) : 12;
  const turno_id = event.turno_id || (activeTurno ? activeTurno.turno_id : null);

  return {
    ...event,
    fecha_registro,
    hora_registro,
    timestamp_registro,
    hora_inicio_turno,
    hora_fin_turno,
    tipo_turno,
    horas_totales_turno,
    hora_inicio_descanso,
    hora_fin_descanso,
    linea,
    hora_desde,
    hora_hasta,
    categoria_tm,
    tiempo_muerto,
    observaciones,
    ubicacion: event.ubicacion || null,
    tiempo_disponible_turno,
    tiempo_de_descanso,
    tiempo_parada,
    turno_id
  };
}

run();
