const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_EVENT_STATES = new Set(["abierto", "cerrado", "corregido", "anulado"]);
const VALID_PROPOSAL_TYPES = new Set(["razon"]);
const VALID_LINEAS = new Set(["OMECO", "BENECKE", "RAUTE"]);

export function validateSyncEvent(event) {
  const errors = [];

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return ["El evento debe ser un objeto."];
  }

  requireString(errors, event.evento_id, "evento_id");
  if (event.evento_id && !UUID_RE.test(event.evento_id)) {
    errors.push("evento_id debe ser un UUID valido.");
  }

  requireString(errors, event.tablet_id, "tablet_id");
  requireString(errors, event.secadero_id, "secadero_id");
  requireIsoDate(errors, event.fecha_hora_inicio, "fecha_hora_inicio");

  if (event.fecha_hora_fin != null) {
    requireIsoDate(errors, event.fecha_hora_fin, "fecha_hora_fin");
  }

  if (!VALID_EVENT_STATES.has(event.estado_evento)) {
    errors.push("estado_evento debe ser abierto, cerrado, corregido o anulado.");
  }

  if (!Number.isInteger(event.version) || event.version < 1) {
    errors.push("version debe ser un entero mayor o igual a 1.");
  }

  if (event.estado_evento === "cerrado") {
    if (!Array.isArray(event.origenes) || event.origenes.length === 0) {
      errors.push("La parada debe tener al menos un origen.");
    }
  }

  if (Array.isArray(event.origenes)) {
    event.origenes.forEach((origin, index) => {
      const hasMaster = typeof origin?.origen_id === "string" && origin.origen_id.trim().length > 0;
      if (!hasMaster) {
        errors.push(`origenes[${index}] debe tener origen_id.`);
      }
    });
  }

  if (event.estado_evento === "cerrado" && !event.fecha_hora_fin) {
    errors.push("Un evento cerrado debe tener fecha_hora_fin.");
  }

  if (event.fecha_hora_inicio && event.fecha_hora_fin) {
    const duration = calculateDurationSeconds(event.fecha_hora_inicio, event.fecha_hora_fin);
    if (duration == null || duration < 0) {
      errors.push("fecha_hora_fin debe ser posterior o igual a fecha_hora_inicio.");
    }
    if (event.duracion_segundos != null && Math.abs(event.duracion_segundos - duration) > 1) {
      errors.push("duracion_segundos no coincide con inicio y fin.");
    }
  }

  if (event.propuesta_manual != null) {
    validateManualProposal(errors, event.propuesta_manual);
  }

  // Validaciones opcionales para campos unificados (si vienen informados)
  if (event.linea != null) {
    let normalizedLinea = typeof event.linea === "string" ? event.linea.replace(/^sec-/i, "").replace(/^Secadero\s+/i, "").toUpperCase().trim() : event.linea;
    if (typeof normalizedLinea !== "string" || !VALID_LINEAS.has(normalizedLinea)) {
      errors.push("linea debe ser OMECO, BENECKE o RAUTE.");
    }
  }

  if (event.hora_desde != null) {
    requireIsoDate(errors, event.hora_desde, "hora_desde");
  }

  if (event.hora_hasta != null) {
    requireIsoDate(errors, event.hora_hasta, "hora_hasta");
  }

  if (event.timestamp_registro != null) {
    requireIsoDate(errors, event.timestamp_registro, "timestamp_registro");
  }

  if (event.tiempo_disponible_turno != null) {
    if (typeof event.tiempo_disponible_turno !== "number" || isNaN(event.tiempo_disponible_turno)) {
      errors.push("tiempo_disponible_turno debe ser un numero.");
    }
  }

  if (event.tiempo_parada != null) {
    if (!Number.isInteger(event.tiempo_parada) || event.tiempo_parada < 0) {
      errors.push("tiempo_parada debe ser un entero no negativo.");
    }
  }

  return errors;
}

export function calculateDurationSeconds(startIso, endIso) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return null;
  }
  return Math.round((end - start) / 1000);
}

function requireString(errors, value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} es obligatorio.`);
  }
}

function requireIsoDate(errors, value, field) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    errors.push(`${field} debe ser fecha ISO valida.`);
  }
}

function validateManualProposal(errors, proposal) {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    errors.push("propuesta_manual debe ser un objeto.");
    return;
  }

  if (!VALID_PROPOSAL_TYPES.has(proposal.tipo)) {
    errors.push("propuesta_manual.tipo debe ser razon u origen.");
  }

  if (typeof proposal.texto !== "string" || proposal.texto.trim().length === 0) {
    errors.push("propuesta_manual.texto es obligatorio.");
  }
}
