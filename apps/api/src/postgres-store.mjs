import { randomUUID } from "node:crypto";
import pg from "pg";
import { validateSyncEvent } from "../../../packages/validation/src/event-validation.mjs";

const { Pool } = pg;
const DEFAULT_DATABASE_URL =
  "postgres://coama:coama_dev_password@127.0.0.1:5432/coama_tiempos_muertos";

export class PgSyncStore {
  constructor(options = {}) {
    const connectionString = options.connectionString ?? process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
    if (!options.pool && !connectionString) {
      throw new Error("DATABASE_URL es obligatorio para usar PostgreSQL.");
    }

    this.pool = options.pool ?? new Pool({ connectionString });
  }

  async close() {
    await this.pool.end();
  }

  async getMasterData() {
    const client = await this.pool.connect();
    try {
      const [razonesRes, origenesRes, secaderosRes, tabletsRes, razonOrigenesRes, turnosRes] = await Promise.all([
        client.query(
          "select razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas, mostrar_perfil from razones_parada order by nombre"
        ),
        client.query(
          "select origen_id, codigo, nombre, activo as activa from origenes_parada order by nombre"
        ),
        client.query(
          "select secadero_id, codigo, nombre, activo from secaderos order by codigo"
        ),
        client.query(
          "select tablet_id, secadero_id, nombre, activa, ip_tablet from tablets order by nombre"
        ),
        client.query(
          "select razon_id, origen_id from razon_origenes"
        ),
        client.query(
          "select turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo, fecha_inicio_vigencia from turnos order by fecha_inicio_vigencia desc, nombre"
        )
      ]);

      const origenesMap = new Map();
      for (const row of razonOrigenesRes.rows) {
        if (!origenesMap.has(row.razon_id)) {
          origenesMap.set(row.razon_id, []);
        }
        origenesMap.get(row.razon_id).push(row.origen_id);
      }

      const razones = razonesRes.rows.map(r => ({
        ...r,
        origen_ids: origenesMap.get(r.razon_id) ?? []
      }));

      const turnos = turnosRes.rows.map(t => ({
        ...t,
        horas_totales: Number(t.horas_totales),
        horas_descanso: Number(t.horas_descanso),
        fecha_inicio_vigencia: t.fecha_inicio_vigencia ? new Date(t.fecha_inicio_vigencia).toLocaleDateString("sv-SE") : "2026-08-26"
      }));

      return {
        razones,
        origenes: origenesRes.rows,
        secaderos: secaderosRes.rows,
        tablets: tabletsRes.rows,
        turnos
      };
    } finally {
      client.release();
    }
  }

  async listRazones() {
    const [razonesRes, razonOrigenesRes] = await Promise.all([
      this.pool.query(
        "select razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas, mostrar_perfil from razones_parada order by nombre"
      ),
      this.pool.query(
        "select razon_id, origen_id from razon_origenes"
      )
    ]);

    const origenesMap = new Map();
    for (const row of razonOrigenesRes.rows) {
      if (!origenesMap.has(row.razon_id)) {
        origenesMap.set(row.razon_id, []);
      }
      origenesMap.get(row.razon_id).push(row.origen_id);
    }

    return razonesRes.rows.map(r => ({
      ...r,
      origen_ids: origenesMap.get(r.razon_id) ?? []
    }));
  }

  async saveRazon(input, razonId = input?.razon_id ?? `raz-${randomUUID()}`) {
    requireName(input, "razon");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
          insert into razones_parada (razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas, mostrar_perfil, modificado_en)
          values ($1, $2, $3, $4, $5, $6, $7, now())
          on conflict (razon_id) do update set
            codigo = excluded.codigo,
            nombre = excluded.nombre,
            activa = excluded.activa,
            observacion_obligatoria = excluded.observacion_obligatoria,
            observaciones_predefinidas = excluded.observaciones_predefinidas,
            mostrar_perfil = excluded.mostrar_perfil,
            modificado_en = now()
          returning razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas, mostrar_perfil
        `,
        [
          razonId,
          normalizeOptionalString(input.codigo),
          input.nombre.trim(),
          input.activa ?? true,
          input.observacion_obligatoria ?? false,
          normalizeOptionalString(input.observaciones_predefinidas),
          input.mostrar_perfil ?? false
        ]
      );

      await client.query("delete from razon_origenes where razon_id = $1", [razonId]);

      if (Array.isArray(input.origen_ids) && input.origen_ids.length > 0) {
        for (const origenId of input.origen_ids) {
          await client.query(
            "insert into razon_origenes (razon_id, origen_id) values ($1, $2)",
            [razonId, origenId]
          );
        }
      }

      await client.query("COMMIT");

      return {
        ...result.rows[0],
        origen_ids: input.origen_ids ?? []
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteRazon(razonId) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("delete from razon_origenes where razon_id = $1", [razonId]);
      const res = await client.query("delete from razones_parada where razon_id = $1", [razonId]);
      await client.query("COMMIT");
      return { success: res.rowCount > 0 };
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23503") {
        throw new Error("No se puede eliminar esta razón porque está siendo utilizada en el historial de eventos.");
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async listTurnos() {
    const result = await this.pool.query(
      "select turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo from turnos order by nombre"
    );
    return result.rows.map(t => ({
      ...t,
      horas_totales: Number(t.horas_totales),
      horas_descanso: Number(t.horas_descanso)
    }));
  }

  async saveTurno(input, turnoId = input?.turno_id ?? `tur-${randomUUID()}`) {
    requireName(input, "turno");
    const result = await this.pool.query(
      `
        insert into turnos (turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo, modificado_en)
        values ($1, $2, $3, $4, $5, $6, $7, now())
        on conflict (turno_id) do update set
          nombre = excluded.nombre,
          hora_inicio = excluded.hora_inicio,
          hora_fin = excluded.hora_fin,
          horas_totales = excluded.horas_totales,
          horas_descanso = excluded.horas_descanso,
          activo = excluded.activo,
          modificado_en = now()
        returning turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo
      `,
      [
        turnoId,
        input.nombre.trim(),
        input.hora_inicio,
        input.hora_fin,
        Number(input.horas_totales ?? 12.00),
        Number(input.horas_descanso ?? 0.00),
        input.activo ?? true
      ]
    );
    const row = result.rows[0];
    return {
      ...row,
      horas_totales: Number(row.horas_totales),
      horas_descanso: Number(row.horas_descanso)
    };
  }

  async deleteTurno(turnoId) {
    const result = await this.pool.query("delete from turnos where turno_id = $1", [turnoId]);
    return { success: result.rowCount > 0 };
  }

  async listOrigenes() {
    const result = await this.pool.query(
      "select origen_id, codigo, nombre, activo as activa from origenes_parada order by nombre"
    );
    return result.rows;
  }

  async saveOrigen(input, origenId = input?.origen_id ?? `ori-${randomUUID()}`) {
    requireName(input, "origen");
    const result = await this.pool.query(
      `
        insert into origenes_parada (origen_id, codigo, nombre, activo, modificado_en)
        values ($1, $2, $3, $4, now())
        on conflict (origen_id) do update set
          codigo = excluded.codigo,
          nombre = excluded.nombre,
          activo = excluded.activo,
          modificado_en = now()
        returning origen_id, codigo, nombre, activo as activa
      `,
      [
        origenId,
        normalizeOptionalString(input.codigo),
        input.nombre.trim(),
        input.activa ?? true
      ]
    );
    return result.rows[0];
  }

  async deleteOrigen(origenId) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("delete from razon_origenes where origen_id = $1", [origenId]);
      const res = await client.query("delete from origenes_parada where origen_id = $1", [origenId]);
      await client.query("COMMIT");
      return { success: res.rowCount > 0 };
    } catch (err) {
      await client.query("ROLLBACK");
      if (err.code === "23503") {
        throw new Error("No se puede eliminar este origen porque está siendo utilizado en el historial de eventos.");
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async listPropuestas({ estado } = {}) {
    const params = [];
    let where = "";
    if (estado) {
      params.push(estado);
      where = "where estado_revision = $1";
    }

    const result = await this.pool.query(
      `
        select
          propuesta_id,
          evento_id,
          tipo,
          texto,
          comentario,
          estado_revision,
          revisada_en,
          maestro_destino_id,
          creado_en
        from propuestas_maestro
        ${where}
        order by creado_en desc
      `,
      params
    );
    return result.rows;
  }

  async reviewPropuesta(propuestaId, input) {
    if (!["pendiente", "aprobada", "rechazada", "fusionada"].includes(input?.estado_revision)) {
      throw new Error("estado_revision invalido.");
    }

    const result = await this.pool.query(
      `
        update propuestas_maestro
        set
          estado_revision = $2,
          revisada_en = now(),
          maestro_destino_id = $3
        where propuesta_id = $1
        returning
          propuesta_id,
          evento_id,
          tipo,
          texto,
          comentario,
          estado_revision,
          revisada_en,
          maestro_destino_id,
          creado_en
      `,
      [
        propuestaId,
        input.estado_revision,
        input.maestro_destino_id ?? null
      ]
    );

    if (result.rowCount === 0) {
      throw new Error("Propuesta no encontrada.");
    }

    return result.rows[0];
  }

  async syncBatch(events) {
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

      try {
        const result = await this.syncEvent(event);
        accepted.push(result);
      } catch (error) {
        rejected.push({
          evento_id: event.evento_id,
          errors: [error.message]
        });
      }
    }

    return { accepted, rejected };
  }

  async syncEvent(event) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");

      const current = await client.query(
        "select version, turno_id, estado_evento from eventos_tiempo_muerto where evento_id = $1 for update",
        [event.evento_id]
      );

      if (current.rowCount > 0 && current.rows[0].version > event.version) {
        throw new Error("La version recibida es menor que la version consolidada.");
      }

      const wasClosed = current.rowCount > 0 && current.rows[0].estado_evento === "cerrado";

      let status = "inserted";
      if (current.rowCount > 0) {
        const dbEvt = current.rows[0];
        if (dbEvt.version === event.version) {
          // Comparar si hay cambios reales en los datos de la parada
          const hasChanges = 
            dbEvt.razon_id !== (event.razon_id ?? null) ||
            dbEvt.observacion !== (event.observacion ?? null) ||
            dbEvt.ubicacion !== (event.ubicacion ?? null) ||
            Date.parse(dbEvt.fecha_hora_inicio) !== Date.parse(event.fecha_hora_inicio) ||
            (dbEvt.fecha_hora_fin ? Date.parse(dbEvt.fecha_hora_fin) : null) !== (event.fecha_hora_fin ? Date.parse(event.fecha_hora_fin) : null);

          status = hasChanges ? "updated" : "no-change";
        } else {
          status = "updated";
        }
      }
      
      const masterData = await this.getMasterDataInternal(client);
      const populated = populateUnifiedFields({
        ...event,
        turno_id: event.turno_id ?? (current.rowCount > 0 ? current.rows[0].turno_id : null)
      }, masterData);

      // Evitar traslapes: auto-cerrar cualquier otra parada abierta para el mismo secadero
      if (event.estado_evento === "abierto") {
        await client.query(
          `
            update eventos_tiempo_muerto
            set
              fecha_hora_fin = $1,
              duracion_segundos = greatest(0, extract(epoch from ($1::timestamptz - fecha_hora_inicio))::integer),
              estado_evento = 'cerrado',
              version = version + 1,
              modificado_en = now()
            where
              secadero_id = $2
              and estado_evento = 'abierto'
              and evento_id <> $3
          `,
          [populated.fecha_hora_inicio, populated.secadero_id, populated.evento_id]
        );
      }

      await upsertEvent(client, populated);
      await replaceOrigins(client, event);
      await upsertManualProposal(client, event);

      await client.query("commit");

      return {
        evento_id: event.evento_id,
        status,
        version: event.version,
        wasClosed
      };
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async getMasterDataInternal(client) {
    const [razonesRes, origenesRes, secaderosRes, tabletsRes, razonOrigenesRes, turnosRes] = await Promise.all([
      client.query(
        "select razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas, mostrar_perfil from razones_parada order by nombre"
      ),
      client.query(
        "select origen_id, codigo, nombre, activo as activa from origenes_parada order by nombre"
      ),
      client.query(
        "select secadero_id, codigo, nombre, activo from secaderos order by codigo"
      ),
      client.query(
        "select tablet_id, secadero_id, nombre, activa, ip_tablet from tablets order by nombre"
      ),
      client.query(
        "select razon_id, origen_id from razon_origenes"
      ),
      client.query(
        "select turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo, fecha_inicio_vigencia from turnos order by fecha_inicio_vigencia desc, nombre"
      )
    ]);

    const origenesMap = new Map();
    for (const row of razonOrigenesRes.rows) {
      if (!origenesMap.has(row.razon_id)) {
        origenesMap.set(row.razon_id, []);
      }
      origenesMap.get(row.razon_id).push(row.origen_id);
    }

    const razones = razonesRes.rows.map(r => ({
      ...r,
      origen_ids: origenesMap.get(r.razon_id) ?? []
    }));

    const turnos = turnosRes.rows.map(t => ({
      ...t,
      horas_totales: Number(t.horas_totales),
      horas_descanso: Number(t.horas_descanso),
      fecha_inicio_vigencia: t.fecha_inicio_vigencia ? new Date(t.fecha_inicio_vigencia).toLocaleDateString("sv-SE") : "2026-08-26"
    }));

    return {
      razones,
      origenes: origenesRes.rows,
      secaderos: secaderosRes.rows,
      tablets: tabletsRes.rows,
      turnos
    };
  }

  async listEventos() {
    const client = await this.pool.connect();
    try {
      const eventsRes = await client.query(
        "select * from eventos_tiempo_muerto order by fecha_hora_inicio desc"
      );
      const originsRes = await client.query(
        "select evento_id, origen_id, origen_manual from evento_origenes"
      );

      const originsMap = new Map();
      for (const row of originsRes.rows) {
        if (!originsMap.has(row.evento_id)) {
          originsMap.set(row.evento_id, []);
        }
        originsMap.get(row.evento_id).push({
          origen_id: row.origen_id,
          origen_manual: row.origen_manual
        });
      }

      const rawEvents = eventsRes.rows.map(evt => ({
        ...evt,
        origenes: originsMap.get(evt.evento_id) ?? []
      }));
      return mergeEvents(rawEvents);
    } finally {
      client.release();
    }
  }

  async getEvento(eventoId) {
    const client = await this.pool.connect();
    try {
      const eventRes = await client.query("select * from eventos_tiempo_muerto where evento_id = $1", [eventoId]);
      if (eventRes.rowCount === 0) return null;
      const originsRes = await client.query("select origen_id, origen_manual from evento_origenes where evento_id = $1", [eventoId]);
      return {
        ...eventRes.rows[0],
        origenes: originsRes.rows
      };
    } finally {
      client.release();
    }
  }

  async saveEvento(eventoId, input) {
    const client = await this.pool.connect();
    try {
      await client.query("begin");

      const currentRes = await client.query(
        "select * from eventos_tiempo_muerto where evento_id = $1 for update",
        [eventoId]
      );
      if (currentRes.rowCount === 0) {
        throw new Error("Evento no encontrado.");
      }

      const current = currentRes.rows[0];
      const newInicio = input.fecha_hora_inicio !== undefined ? input.fecha_hora_inicio : current.fecha_hora_inicio;
      const newFin = input.fecha_hora_fin !== undefined ? input.fecha_hora_fin : current.fecha_hora_fin;
      const newRazonId = input.razon_id !== undefined ? input.razon_id : current.razon_id;
      const newObservacion = input.observacion !== undefined ? input.observacion : current.observacion;
      const newTurnoId = input.turno_id !== undefined ? input.turno_id : current.turno_id;
      const newUbicacion = input.ubicacion !== undefined ? input.ubicacion : current.ubicacion;
      
      let newEstado = input.estado_evento !== undefined ? input.estado_evento : current.estado_evento;
      if (newEstado !== "anulado" && newEstado !== "corregido") {
        if (newInicio && newFin) {
          newEstado = "cerrado";
        } else {
          newEstado = "abierto";
        }
      }
      const newVersion = current.version + 1;

      let newDuracion = null;
      if (newInicio && newFin) {
        newDuracion = Math.floor((new Date(newFin) - new Date(newInicio)) / 1000);
      }

      // Fetch master data to run populateUnifiedFields
      const masterData = await this.getMasterDataInternal(client);
      
      // Load current or updated origins
      let origs = [];
      if (input.origenes) {
        origs = input.origenes;
      } else {
        const origsRes = await client.query("select origen_id, origen_manual from evento_origenes where evento_id = $1", [eventoId]);
        origs = origsRes.rows;
      }

      const populated = populateUnifiedFields({
        evento_id: eventoId,
        tablet_id: current.tablet_id,
        secadero_id: current.secadero_id,
        razon_id: newRazonId,
        razon_manual: current.razon_manual,
        fecha_hora_inicio: newInicio,
        fecha_hora_fin: newFin,
        duracion_segundos: newDuracion,
        observacion: newObservacion,
        estado_evento: newEstado,
        version: newVersion,
        turno_id: newTurnoId,
        ubicacion: newUbicacion,
        origenes: origs,
        timestamp_registro: current.timestamp_registro,
        fecha_registro: current.fecha_registro,
        hora_registro: current.hora_registro
      }, masterData);

      const updateRes = await client.query(
        `
          update eventos_tiempo_muerto
          set
            fecha_hora_inicio = $2,
            fecha_hora_fin = $3,
            razon_id = $4,
            estado_evento = $5,
            duracion_segundos = $6,
            version = $7,
            observacion = $8,
            turno_id = $9,
            fecha_registro = $10,
            hora_registro = $11,
            timestamp_registro = $12,
            hora_inicio_turno = $13,
            hora_fin_turno = $14,
            tipo_turno = $15,
            hora_inicio_descanso = $16,
            hora_fin_descanso = $17,
            linea = $18,
            hora_desde = $19,
            hora_hasta = $20,
            categoria_tm = $21,
            tiempo_muerto = $22,
            observaciones = $23,
            ubicacion = $24,
            tiempo_disponible_turno = $25,
            tiempo_parada = $26,
            modificado_en = now()
          where evento_id = $1
          returning *
        `,
        [
          eventoId,
          populated.fecha_hora_inicio,
          populated.fecha_hora_fin,
          populated.razon_id,
          populated.estado_evento,
          populated.duracion_segundos,
          populated.version,
          populated.observacion,
          populated.turno_id,
          populated.fecha_registro,
          populated.hora_registro,
          populated.timestamp_registro,
          populated.hora_inicio_turno,
          populated.hora_fin_turno,
          populated.tipo_turno,
          populated.hora_inicio_descanso,
          populated.hora_fin_descanso,
          populated.linea,
          populated.hora_desde,
          populated.hora_hasta,
          populated.categoria_tm,
          populated.tiempo_muerto,
          populated.observaciones,
          populated.ubicacion,
          populated.tiempo_disponible_turno,
          populated.tiempo_parada
        ]
      );

      if (input.origenes) {
        await client.query("delete from evento_origenes where evento_id = $1", [eventoId]);
        for (const origin of input.origenes) {
          await client.query(
            `
               insert into evento_origenes (evento_id, origen_id, origen_manual)
               values ($1, $2, $3)
            `,
            [
              eventoId,
              normalizeOptionalString(origin.origen_id),
              normalizeOptionalString(origin.origen_manual)
            ]
          );
        }
      }

      await client.query("commit");

      const finalOrigins = await client.query(
        "select origen_id, origen_manual from evento_origenes where evento_id = $1",
        [eventoId]
      );

      return {
        ...updateRes.rows[0],
        origenes: finalOrigins.rows
      };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }

  async snapshot() {
    const client = await this.pool.connect();
    try {
      const [events, eventOrigins, manualProposals] = await Promise.all([
        client.query("select * from eventos_tiempo_muerto order by fecha_hora_inicio, evento_id"),
        client.query("select * from evento_origenes order by evento_id, evento_origen_id"),
        client.query("select * from propuestas_maestro order by creado_en, propuesta_id")
      ]);

      return {
        events: events.rows,
        eventOrigins: eventOrigins.rows,
        manualProposals: manualProposals.rows
      };
    } finally {
      client.release();
    }
  }
}

async function upsertEvent(client, event) {
  await client.query(
    `
      insert into eventos_tiempo_muerto (
        evento_id,
        tablet_id,
        secadero_id,
        razon_id,
        razon_manual,
        fecha_hora_inicio,
        fecha_hora_fin,
        duracion_segundos,
        observacion,
        estado_evento,
        version,
        creado_en_tablet,
        recibido_en_servidor,
        modificado_en,
        turno_id,
        fecha_registro,
        hora_registro,
        timestamp_registro,
        hora_inicio_turno,
        hora_fin_turno,
        tipo_turno,
        hora_inicio_descanso,
        hora_fin_descanso,
        linea,
        hora_desde,
        hora_hasta,
        categoria_tm,
        tiempo_muerto,
        observaciones,
        ubicacion,
        tiempo_disponible_turno,
        tiempo_parada,
        inicio_evento_id
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), now(), $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31)
      on conflict (evento_id) do update set
        tablet_id = excluded.tablet_id,
        secadero_id = excluded.secadero_id,
        razon_id = excluded.razon_id,
        razon_manual = excluded.razon_manual,
        fecha_hora_inicio = excluded.fecha_hora_inicio,
        fecha_hora_fin = excluded.fecha_hora_fin,
        duracion_segundos = excluded.duracion_segundos,
        observacion = excluded.observacion,
        estado_evento = excluded.estado_evento,
        version = excluded.version,
        creado_en_tablet = excluded.creado_en_tablet,
        turno_id = excluded.turno_id,
        fecha_registro = excluded.fecha_registro,
        hora_registro = excluded.hora_registro,
        timestamp_registro = excluded.timestamp_registro,
        hora_inicio_turno = excluded.hora_inicio_turno,
        hora_fin_turno = excluded.hora_fin_turno,
        tipo_turno = excluded.tipo_turno,
        hora_inicio_descanso = excluded.hora_inicio_descanso,
        hora_fin_descanso = excluded.hora_fin_descanso,
        linea = excluded.linea,
        hora_desde = excluded.hora_desde,
        hora_hasta = excluded.hora_hasta,
        categoria_tm = excluded.categoria_tm,
        tiempo_muerto = excluded.tiempo_muerto,
        observaciones = excluded.observaciones,
        ubicacion = excluded.ubicacion,
        tiempo_disponible_turno = excluded.tiempo_disponible_turno,
        tiempo_parada = excluded.tiempo_parada,
        inicio_evento_id = excluded.inicio_evento_id,
        modificado_en = now()
    `,
    [
      event.evento_id,
      event.tablet_id,
      event.secadero_id,
      event.razon_id ?? null,
      event.razon_manual ?? null,
      event.fecha_hora_inicio,
      event.fecha_hora_fin ?? null,
      event.duracion_segundos ?? null,
      event.observacion ?? null,
      event.estado_evento,
      event.version,
      event.creado_en_tablet ?? null,
      event.turno_id ?? null,
      event.fecha_registro ?? null,
      event.hora_registro ?? null,
      event.timestamp_registro ?? null,
      event.hora_inicio_turno ?? null,
      event.hora_fin_turno ?? null,
      event.tipo_turno ?? null,
      event.hora_inicio_descanso ?? null,
      event.hora_fin_descanso ?? null,
      event.linea ?? null,
      event.hora_desde ?? null,
      event.hora_hasta ?? null,
      event.categoria_tm ?? null,
      event.tiempo_muerto ?? null,
      event.observaciones ?? null,
      event.ubicacion ?? null,
      event.tiempo_disponible_turno ?? null,
      event.tiempo_parada ?? null,
      event.inicio_evento_id ?? null
    ]
  );
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
  const turno_id = event.turno_id || (activeTurno ? activeTurno.turno_id : null);

  return {
    ...event,
    fecha_registro,
    hora_registro,
    timestamp_registro,
    hora_inicio_turno,
    hora_fin_turno,
    tipo_turno,
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
  };
}

async function replaceOrigins(client, event) {
  await client.query("delete from evento_origenes where evento_id = $1", [event.evento_id]);

  for (const origin of event.origenes) {
    await client.query(
      `
        insert into evento_origenes (evento_id, origen_id, origen_manual)
        values ($1, $2, $3)
      `,
      [
        event.evento_id,
        normalizeOptionalString(origin.origen_id),
        normalizeOptionalString(origin.origen_manual)
      ]
    );
  }
}

async function upsertManualProposal(client, event) {
  if (!event.propuesta_manual) {
    return;
  }

  await client.query(
    `
      insert into propuestas_maestro (
        propuesta_id,
        evento_id,
        tipo,
        texto,
        comentario,
        estado_revision
      )
      values ($1, $2, $3, $4, $5, 'pendiente')
      on conflict (evento_id, tipo, texto) do update set
        comentario = excluded.comentario
    `,
    [
      randomUUID(),
      event.evento_id,
      event.propuesta_manual.tipo,
      event.propuesta_manual.texto.trim(),
      event.propuesta_manual.comentario ?? null
    ]
  );
}

function normalizeOptionalString(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function requireName(input, label) {
  if (typeof input?.nombre !== "string" || input.nombre.trim().length === 0) {
    throw new Error(`El nombre de ${label} es obligatorio.`);
  }
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
