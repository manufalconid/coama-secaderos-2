import { randomUUID } from "node:crypto";
import { validateSyncEvent } from "../../../packages/validation/src/event-validation.mjs";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve("apps/api/data");
const DATA_FILE = path.join(DATA_DIR, "store_snapshot.json");

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

export class InMemorySyncStore {
  constructor(seed = defaultSeed(), options = {}) {
    this.events = new Map();
    this.eventOrigins = new Map();
    const proposals = options.seedProposals ? defaultManualProposals() : [];
    this.manualProposals = new Map(proposals.map(proposal => [proposal.propuesta_id, proposal]));
    this.masterData = seed;
    this.persist = !!options.persist;

    // Seed default events
    const defaultEvts = [];

    for (const evt of defaultEvts) {
      const populated = populateUnifiedFields(evt, this.masterData);
      this.events.set(populated.evento_id, populated);
      this.eventOrigins.set(populated.evento_id, evt.origenes);
    }

    if (this.persist) {
      this.loadFromDisk();
    }
  }

  saveToDisk() {
    if (!this.persist) return;
    try {
      ensureDirectoryExistence(DATA_FILE);
      const tmpFile = `${DATA_FILE}.tmp`;
      const snapshot = {
        events: Array.from(this.events.entries()),
        eventOrigins: Array.from(this.eventOrigins.entries()),
        manualProposals: Array.from(this.manualProposals.entries()),
        masterData: this.masterData
      };
      fs.writeFileSync(tmpFile, JSON.stringify(snapshot, null, 2), "utf8");
      fs.renameSync(tmpFile, DATA_FILE);
    } catch (err) {
      console.error("Error saving store snapshot to disk:", err);
    }
  }

  loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        const snapshot = JSON.parse(raw);
        if (Array.isArray(snapshot.events)) this.events = new Map(snapshot.events);
        if (Array.isArray(snapshot.eventOrigins)) this.eventOrigins = new Map(snapshot.eventOrigins);
        if (Array.isArray(snapshot.manualProposals)) this.manualProposals = new Map(snapshot.manualProposals);
        if (snapshot.masterData) this.masterData = snapshot.masterData;
        console.log("Memory store loaded from disk successfully.");
      }
    } catch (err) {
      console.error("Error loading store snapshot from disk:", err);
    }
  }

  listEventos() {
    const rawEvents = [...this.events.values()].map(evt => ({
      ...evt,
      origenes: this.eventOrigins.get(evt.evento_id) ?? []
    }));
    return mergeEvents(rawEvents);
  }

  getEvento(eventoId) {
    const raw = this.events.get(eventoId);
    if (!raw) return null;
    return {
      ...raw,
      origenes: this.eventOrigins.get(eventoId) || []
    };
  }

  saveEvento(eventoId, input) {
    const current = this.events.get(eventoId);
    if (!current) {
      throw new Error("Evento no encontrado.");
    }
    const updated = {
      ...current,
      fecha_hora_inicio: input.fecha_hora_inicio ?? current.fecha_hora_inicio,
      fecha_hora_fin: input.fecha_hora_fin ?? current.fecha_hora_fin,
      razon_id: input.razon_id !== undefined ? input.razon_id : current.razon_id,
      estado_evento: input.estado_evento ?? current.estado_evento,
      version: (current.version ?? 1) + 1,
      observacion: input.observacion !== undefined ? input.observacion : current.observacion,
      turno_id: input.turno_id !== undefined ? input.turno_id : current.turno_id,
      ubicacion: input.ubicacion !== undefined ? input.ubicacion : current.ubicacion,
      modificado_en: new Date().toISOString()
    };
    if (updated.fecha_hora_inicio && updated.fecha_hora_fin) {
      updated.duracion_segundos = Math.floor((Date.parse(updated.fecha_hora_fin) - Date.parse(updated.fecha_hora_inicio)) / 1000);
      updated.estado_evento = "cerrado";
    } else {
      updated.duracion_segundos = null;
      updated.estado_evento = "abierto";
    }
    if (input.origenes) {
      this.eventOrigins.set(eventoId, input.origenes);
      updated.origenes = input.origenes;
    } else {
      updated.origenes = this.eventOrigins.get(eventoId) ?? [];
    }

    // Clear computed fields to force recalculation in populateUnifiedFields
    delete updated.categoria_tm;
    delete updated.tiempo_muerto;
    delete updated.tiempo_parada;
    delete updated.linea;
    delete updated.hora_desde;
    delete updated.hora_hasta;

    const isInicioChanged = input.fecha_hora_inicio !== undefined && input.fecha_hora_inicio !== current.fecha_hora_inicio;
    const isTurnoChanged = input.turno_id !== undefined && input.turno_id !== current.turno_id;
    if (isInicioChanged || isTurnoChanged) {
      delete updated.hora_inicio_turno;
      delete updated.hora_fin_turno;
      delete updated.tipo_turno;
      delete updated.hora_inicio_descanso;
      delete updated.hora_fin_descanso;
      delete updated.tiempo_disponible_turno;
      if (isInicioChanged && input.turno_id === undefined) {
        delete updated.turno_id;
      }
    }

    const populated = populateUnifiedFields(updated, this.masterData);
    this.events.set(eventoId, populated);
    this.saveToDisk();
    return populated;
  }

  getMasterData() {
    return this.masterData;
  }

  listRazones() {
    return this.masterData.razones;
  }

  saveRazon(input, razonId = input?.razon_id ?? `raz-${randomUUID()}`) {
    requireName(input, "razon");
    const razon = upsertById(this.masterData.razones, "razon_id", razonId, {
      razon_id: razonId,
      origen_ids: Array.isArray(input.origen_ids) ? input.origen_ids : [],
      codigo: input.codigo ?? null,
      nombre: input.nombre.trim(),
      activa: input.activa ?? true,
      observacion_obligatoria: input.observacion_obligatoria ?? false,
      observaciones_predefinidas: input.observaciones_predefinidas ?? null,
      mostrar_perfil: input.mostrar_perfil ?? false
    });
    this.saveToDisk();
    return razon;
  }

  deleteRazon(razonId) {
    this.masterData.razones = this.masterData.razones.filter(r => r.razon_id !== razonId);
    this.saveToDisk();
    return { success: true };
  }

  listTurnos() {
    return this.masterData.turnos || [];
  }

  saveTurno(input, turnoId = input?.turno_id ?? `tur-${randomUUID()}`) {
    requireName(input, "turno");
    if (!this.masterData.turnos) {
      this.masterData.turnos = [];
    }
    const vigencia = input.fecha_inicio_vigencia || "2026-08-26";
    const idx = this.masterData.turnos.findIndex(t => t.turno_id === turnoId && t.fecha_inicio_vigencia === vigencia);
    const item = {
      turno_id: turnoId,
      nombre: input.nombre.trim(),
      hora_inicio: input.hora_inicio,
      hora_fin: input.hora_fin,
      horas_totales: Number(input.horas_totales ?? 12.00),
      horas_descanso: Number(input.horas_descanso ?? 0.00),
      activo: input.activo ?? true,
      fecha_inicio_vigencia: vigencia
    };
    if (idx >= 0) {
      this.masterData.turnos[idx] = item;
    } else {
      this.masterData.turnos.push(item);
    }
    this.saveToDisk();
    return item;
  }

  deleteTurno(turnoId) {
    if (this.masterData.turnos) {
      this.masterData.turnos = this.masterData.turnos.filter(t => t.turno_id !== turnoId);
    }
    this.saveToDisk();
    return { success: true };
  }

  listOrigenes() {
    return this.masterData.origenes;
  }

  saveOrigen(input, origenId = input?.origen_id ?? `ori-${randomUUID()}`) {
    requireName(input, "origen");
    const origen = upsertById(this.masterData.origenes, "origen_id", origenId, {
      origen_id: origenId,
      codigo: input.codigo ?? null,
      nombre: input.nombre.trim(),
      activa: input.activa ?? true
    });
    this.saveToDisk();
    return origen;
  }

  deleteOrigen(origenId) {
    this.masterData.origenes = this.masterData.origenes.filter(o => o.origen_id !== origenId);
    this.masterData.razones.forEach(r => {
      if (Array.isArray(r.origen_ids)) {
        r.origen_ids = r.origen_ids.filter(id => id !== origenId);
      }
    });
    this.saveToDisk();
    return { success: true };
  }

  listPropuestas({ estado } = {}) {
    const proposals = [...this.manualProposals.values()];
    return estado ? proposals.filter(proposal => proposal.estado_revision === estado) : proposals;
  }

  reviewPropuesta(propuestaId, input) {
    let proposal = this.manualProposals.get(propuestaId);
    if (!proposal) {
      for (const [key, item] of this.manualProposals.entries()) {
        if (key.toLowerCase() === (propuestaId || "").toLowerCase() || item.propuesta_id === propuestaId) {
          proposal = item;
          propuestaId = key;
          break;
        }
      }
    }
    if (!proposal) {
      // If proposal wasn't found in memory map, return a graceful success response
      return { propuesta_id: propuestaId, estado_revision: input?.estado_revision || "rechazada" };
    }

    if (!["pendiente", "aprobada", "rechazada", "fusionada"].includes(input?.estado_revision)) {
      throw new Error("estado_revision invalido.");
    }

    const updated = {
      ...proposal,
      estado_revision: input.estado_revision,
      revisada_en: new Date().toISOString(),
      maestro_destino_id: input.maestro_destino_id ?? null
    };
    this.manualProposals.set(propuestaId, updated);
    this.saveToDisk();
    return updated;
  }

  syncBatch(events) {
    if (!Array.isArray(events)) {
      return {
        accepted: [],
        rejected: [{ evento_id: null, errors: ["events debe ser un array."] }]
      };
    }

    const accepted = [];
    const rejected = [];

    for (const event of events) {
      const errors = validateSyncEvent(event);
      if (errors.length > 0) {
        rejected.push({ evento_id: event?.evento_id ?? null, errors });
        continue;
      }

      const current = this.events.get(event.evento_id);
      if (current && current.version > event.version) {
        rejected.push({
          evento_id: event.evento_id,
          errors: ["La version recibida es menor que la version consolidada."]
        });
        continue;
      }

      const wasClosed = !!(current && current.estado_evento === "cerrado");

      // Evitar traslapes: auto-cerrar cualquier otra parada abierta para el mismo secadero
      if (event.estado_evento === "abierto") {
        for (const [id, existing] of this.events.entries()) {
          if (
            existing.secadero_id === event.secadero_id &&
            existing.estado_evento === "abierto" &&
            existing.evento_id !== event.evento_id
          ) {
            existing.fecha_hora_fin = event.fecha_hora_inicio;
            existing.duracion_segundos = Math.max(0, Math.floor((Date.parse(event.fecha_hora_inicio) - Date.parse(existing.fecha_hora_inicio)) / 1000));
            existing.estado_evento = "cerrado";
            existing.version = (existing.version || 1) + 1;
            existing.modificado_en = new Date().toISOString();
            this.events.set(id, existing);
          }
        }
      }

      let status = "inserted";
      if (current) {
        if (current.version === event.version) {
          // Comparar si hay cambios reales en los datos de la parada
          const hasChanges = 
            current.razon_id !== (event.razon_id ?? null) ||
            current.observacion !== (event.observacion ?? null) ||
            current.ubicacion !== (event.ubicacion ?? null) ||
            Date.parse(current.fecha_hora_inicio) !== Date.parse(event.fecha_hora_inicio) ||
            (current.fecha_hora_fin ? Date.parse(current.fecha_hora_fin) : null) !== (event.fecha_hora_fin ? Date.parse(event.fecha_hora_fin) : null);

          status = hasChanges ? "updated" : "no-change";
        } else {
          status = "updated";
        }
      }

      const populated = populateUnifiedFields({
        ...event,
        turno_id: event.turno_id ?? (current ? current.turno_id : null),
        recibido_en_servidor: new Date().toISOString()
      }, this.masterData);

      this.events.set(event.evento_id, populated);
      this.eventOrigins.set(event.evento_id, event.origenes || []);

      if (event.propuesta_manual && event.propuesta_manual.texto) {
        const normText = event.propuesta_manual.texto.trim().toLowerCase();
        const normTipo = event.propuesta_manual.tipo || "razon";

        const existingPending = Array.from(this.manualProposals.values()).find(
          p => p.estado_revision === "pendiente" &&
               (p.tipo || "razon") === normTipo &&
               (p.texto || "").trim().toLowerCase() === normText
        );

        if (!existingPending) {
          const proposalId = `${event.evento_id}:${normTipo}`;
          this.manualProposals.set(proposalId, {
            propuesta_id: proposalId,
            evento_id: event.evento_id,
            estado_revision: "pendiente",
            ...event.propuesta_manual
          });
        }
      }

      accepted.push({
        evento_id: event.evento_id,
        status,
        version: event.version,
        wasClosed
      });
    }

    this.saveToDisk();
    return { accepted, rejected };
  }

  snapshot() {
    return {
      events: [...this.events.values()],
      eventOrigins: [...this.eventOrigins.entries()].map(([evento_id, origenes]) => ({ evento_id, origenes })),
      manualProposals: [...this.manualProposals.values()]
    };
  }
}

function requireName(input, label) {
  if (typeof input?.nombre !== "string" || input.nombre.trim().length === 0) {
    throw new Error(`El nombre de ${label} es obligatorio.`);
  }
}

function upsertById(collection, idField, id, values) {
  const index = collection.findIndex(item => item[idField] === id);
  if (index === -1) {
    collection.push(values);
    return values;
  }

  collection[index] = {
    ...collection[index],
    ...values,
    [idField]: id
  };
  return collection[index];
}

function defaultSeed() {
  return {
    secaderos: [
      { secadero_id: "sec-omeco", codigo: "OMECO", nombre: "OMECO", activo: true },
      { secadero_id: "sec-benecke", codigo: "BENECKE", nombre: "BENECKE", activo: true },
      { secadero_id: "sec-raute", codigo: "RAUTE", nombre: "RAUTE", activo: true }
    ],
    tablets: [
      { tablet_id: "tab-sec-omeco", secadero_id: "sec-omeco", nombre: "Tablet OMECO", ip_tablet: "192.168.10.51", activa: true },
      { tablet_id: "tab-sec-benecke", secadero_id: "sec-benecke", nombre: "Tablet BENECKE", ip_tablet: "192.168.10.52", activa: true },
      { tablet_id: "tab-sec-raute", secadero_id: "sec-raute", nombre: "Tablet RAUTE", ip_tablet: "192.168.10.53", activa: true }
    ],
    origenes: [
      { origen_id: "ori-electrico", nombre: "ELECTRICO", activa: true },
      { origen_id: "ori-externo", nombre: "EXTERNO", activa: true },
      { origen_id: "ori-logistica", nombre: "LOGISTICA", activa: true },
      { origen_id: "ori-mecanico", nombre: "MECANICO", activa: true },
      { origen_id: "ori-neumatico", nombre: "NEUMATICO", activa: true },
      { origen_id: "ori-operativo", nombre: "OPERATIVO", activa: true },
      { origen_id: "ori-proceso", nombre: "PROCESO", activa: true }
    ],
    razones: [
      { razon_id: "raz-cargador", origen_ids: ["ori-electrico", "ori-mecanico"], codigo: "P001", nombre: "CARGADOR", activa: true },
      { razon_id: "raz-corte-energia", origen_ids: ["ori-externo"], codigo: "P002", nombre: "CORTE DE ENERGIA", activa: true },
      { razon_id: "raz-evacuacion-paquetes", origen_ids: ["ori-logistica", "ori-operativo", "ori-proceso"], codigo: "P003", nombre: "EVACUACIÓN DE PAQUETES", activa: true },
      { razon_id: "raz-falta-abastecimiento", origen_ids: ["ori-logistica", "ori-operativo"], codigo: "P004", nombre: "FALTA ABASTECIMIENTO", activa: true },
      { razon_id: "raz-cadena", origen_ids: ["ori-mecanico"], codigo: "P005", nombre: "CADENA", activa: true },
      { razon_id: "raz-compresor", origen_ids: ["ori-mecanico", "ori-neumatico"], codigo: "P006", nombre: "COMPRESOR", activa: true },
      { razon_id: "raz-mecanico", origen_ids: ["ori-mecanico"], codigo: "P007", nombre: "MECANICO", activa: true },
      { razon_id: "raz-rodillo-entrada", origen_ids: ["ori-mecanico"], codigo: "P008", nombre: "RODILLO DE ENTRADA", activa: true },
      { razon_id: "raz-varios", origen_ids: ["ori-mecanico"], codigo: "P009", nombre: "Varios", activa: true },
      { razon_id: "raz-falta-aire", origen_ids: ["ori-neumatico"], codigo: "P010", nombre: "FALTA AIRE", activa: true },
      { razon_id: "raz-caldera", origen_ids: ["ori-operativo", "ori-proceso"], codigo: "P011", nombre: "CALDERA", activa: true },
      { razon_id: "raz-cambio-medida", origen_ids: ["ori-operativo", "ori-proceso"], codigo: "P012", nombre: "CAMBIO DE MEDIDA", activa: true },
      { razon_id: "raz-capacitacion", origen_ids: ["ori-operativo"], codigo: "P013", nombre: "CAPACITACION", activa: true },
      { razon_id: "raz-parada-humedad", origen_ids: ["ori-operativo", "ori-proceso"], codigo: "P014", nombre: "PARADA POR HUMEDAD", activa: true },
      { razon_id: "raz-parada-programada", origen_ids: ["ori-operativo", "ori-proceso"], codigo: "P015", nombre: "PARADA PROGRAMADA", activa: true },
      { razon_id: "raz-recarga-secadero", origen_ids: ["ori-logistica", "ori-operativo", "ori-proceso"], codigo: "P016", nombre: "RECARGA DEL SECADERO", activa: true },
      { razon_id: "raz-secadero-trancado", origen_ids: ["ori-operativo", "ori-proceso"], codigo: "P017", nombre: "SECADERO TRANCADO", activa: true },
      { razon_id: "raz-motores-no-encienden", origen_ids: ["ori-electrico"], codigo: "P018", nombre: "MOTORES NO ENCIENDEN", activa: true },
      { razon_id: "raz-problema-electrico", origen_ids: ["ori-electrico"], codigo: "P019", nombre: "PROBLEMA ELECTRICO", activa: true },
      { razon_id: "raz-tablero-control", origen_ids: ["ori-electrico"], codigo: "P020", nombre: "TABLERO DE CONTROL", activa: true },
      { razon_id: "raz-cinta-mesa-salida", origen_ids: ["ori-mecanico"], codigo: "P021", nombre: "CINTA DE MESA DE SALIDA", activa: true },
      { razon_id: "raz-mesa-entrada", origen_ids: ["ori-mecanico"], codigo: "P022", nombre: "MESA DE ENTRADA", activa: true },
      { razon_id: "raz-mesa-salida", origen_ids: ["ori-mecanico"], codigo: "P023", nombre: "MESA DE SALIDA", activa: true },
      { razon_id: "raz-polea", origen_ids: ["ori-mecanico"], codigo: "P024", nombre: "POLEA", activa: true },
      { razon_id: "raz-limpieza", origen_ids: ["ori-operativo"], codigo: "P025", nombre: "LIMPIEZA", activa: true },
      { razon_id: "raz-motor-principal", origen_ids: ["ori-electrico"], codigo: "P026", nombre: "MOTOR PRINCIPAL", activa: true },
      { razon_id: "raz-recargar-aceite", origen_ids: ["ori-mecanico"], codigo: "P027", nombre: "RECARGAR ACEITE", activa: true },
      { razon_id: "raz-banio", origen_ids: ["ori-operativo"], codigo: "P028", nombre: "BAÑO", activa: true },
      { razon_id: "raz-falta-personal", origen_ids: ["ori-operativo"], codigo: "P029", nombre: "FALTA PERSONAL", activa: true },
      { razon_id: "raz-falta-presion-vapor", origen_ids: ["ori-operativo"], codigo: "P030", nombre: "FALTA PRESION VAPOR", activa: true },
      { razon_id: "raz-sin-material", origen_ids: ["ori-proceso"], codigo: "P031", nombre: "SIN MATERIAL", activa: true },
      { razon_id: "raz-atascamiento", origen_ids: ["ori-operativo", "ori-mecanico"], codigo: "P032", nombre: "ATASCAMIENTO", activa: true, observacion_obligatoria: true, observaciones_predefinidas: null, mostrar_perfil: true }
    ],
    turnos: [
      { turno_id: "tur-dia", nombre: "Turno Día (06:00 a 18:00)", hora_inicio: "06:00:00", hora_fin: "18:00:00", horas_totales: 12.00, horas_descanso: 1.00, activo: true },
      { turno_id: "tur-noche", nombre: "Turno Noche (18:00 a 06:00)", hora_inicio: "18:00:00", hora_fin: "06:00:00", horas_totales: 12.00, horas_descanso: 1.00, activo: true }
    ]
  };
}

function defaultManualProposals() {
  return [];
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
    linea = linea.replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim();
  }

  let categoria_tm = null;
  if (Array.isArray(event.origenes) && event.origenes.length > 0) {
    const oNames = event.origenes.map(o => {
      if (o.origen_manual) return o.origen_manual;
      const m = masterData.origenes.find(x => x.origen_id === o.origen_id);
      return m ? m.nombre : o.origen_id;
    });
    categoria_tm = oNames.join(", ");
  } else {
    categoria_tm = event.categoria_tm;
  }

  let tiempo_muerto = null;
  if (event.razon_manual) {
    tiempo_muerto = event.razon_manual;
  } else if (event.razon_id) {
    const r = masterData.razones.find(x => x.razon_id === event.razon_id);
    tiempo_muerto = r ? r.nombre : event.razon_id;
  } else {
    tiempo_muerto = event.tiempo_muerto;
  }

  let activeTurno = null;
  if (Array.isArray(masterData.turnos) && masterData.turnos.length > 0 && hora_desde) {
    try {
      const eventDate = new Date(hora_desde).toLocaleDateString("sv-SE", {
        timeZone: "America/Argentina/Buenos_Aires"
      }); // SV-SE returns YYYY-MM-DD

      const validDates = masterData.turnos
        .map(t => t.fecha_inicio_vigencia)
        .filter(d => d && d <= eventDate);
      
      const maxDate = validDates.length > 0 ? validDates.sort().pop() : null;

      const activeShiftsForDate = maxDate 
        ? masterData.turnos.filter(t => t.fecha_inicio_vigencia === maxDate)
        : masterData.turnos;

      const localTimeStr = new Date(hora_desde).toLocaleTimeString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour12: false
      });
      for (const t of activeShiftsForDate) {
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

  const tiempo_disponible_turno = event.tiempo_disponible_turno != null ? event.tiempo_disponible_turno : (activeTurno ? Number(activeTurno.horas_totales) - Number(activeTurno.horas_descanso) : 11.00);
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
    tiempo_parada,
    turno_id
  };
}

export function mergeEvents(rawEvents) {
  const allEventsById = new Map();
  const finEvents = [];

  for (const evt of rawEvents) {
    if (evt.inicio_evento_id) {
      finEvents.push(evt);
    } else {
      allEventsById.set(evt.evento_id, { ...evt });
    }
  }

  for (const fin of finEvents) {
    const inicio = allEventsById.get(fin.inicio_evento_id);
    if (inicio) {
      inicio.fecha_hora_fin = fin.fecha_hora_fin;
      inicio.estado_evento = "cerrado";
      inicio.duracion_segundos = fin.duracion_segundos ?? 
        Math.max(0, Math.floor((Date.parse(fin.fecha_hora_fin || fin.fecha_hora_inicio) - Date.parse(inicio.fecha_hora_inicio)) / 1000));
      inicio.razon_id = fin.razon_id || inicio.razon_id;
      inicio.origen_id = fin.origen_id || inicio.origen_id;
      inicio.observacion = fin.observacion || inicio.observacion;
      inicio.version = Math.max(inicio.version || 1, fin.version || 1);
      
      if (fin.propuesta_manual) {
        inicio.propuesta_manual = fin.propuesta_manual;
      }
      if (fin.origenes && fin.origenes.length > 0) {
        inicio.origenes = fin.origenes;
      }
      inicio.tiempo_parada = fin.tiempo_parada || inicio.tiempo_parada;
      inicio.tiempo_muerto = fin.tiempo_muerto || inicio.tiempo_muerto;
      inicio.categoria_tm = fin.categoria_tm || inicio.categoria_tm;
      inicio.observaciones = fin.observaciones || inicio.observaciones;
      inicio.ubicacion = fin.ubicacion || inicio.ubicacion;
    } else {
      allEventsById.set(fin.evento_id, { ...fin });
    }
  }

  return Array.from(allEventsById.values());
}
