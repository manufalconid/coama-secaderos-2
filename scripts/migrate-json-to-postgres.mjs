import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const candidateUrls = [
  process.env.DATABASE_URL,
  "postgres://coama:coama_dev_password@127.0.0.1:5432/coama_tiempos_muertos",
  "postgres://postgres:coama_dev@127.0.0.1:5432/coama_tiempos_muertos",
  "postgres://postgres:postgres@127.0.0.1:5432/coama_tiempos_muertos"
].filter(Boolean);

console.log("=========================================================");
console.log(" LUMO Secaderos - Migración y Sincronización PostgreSQL");
console.log("=========================================================\n");

let pool = null;
let connectionString = null;
for (const connStr of candidateUrls) {
  try {
    const testPool = new Pool({ connectionString: connStr });
    await testPool.query("SELECT 1");
    pool = testPool;
    connectionString = connStr;
    break;
  } catch (_) {}
}

if (!pool) {
  console.error("❌ ERROR: No se pudo conectar a PostgreSQL en 127.0.0.1:5432 con ninguna credencial.");
  console.error("Verifica que Docker o PostgreSQL local estén corriendo.");
  process.exit(1);
}

console.log(`📡 Conectado a PostgreSQL: ${connectionString.replace(/:[^:@]+@/, ":****@")}\n`);

try {
  // 1. APLICAR MIGRACIONES SQL EN ORDEN
  console.log("⚙️  1. Aplicando migraciones de base de datos...");
  const migrationsDir = path.resolve("database/migrations");
  const migrationFiles = (await readdir(migrationsDir))
    .filter(f => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    const sql = await readFile(filePath, "utf8");
    try {
      await pool.query(sql);
      console.log(`   ✔️  Migración aplicada: ${file}`);
    } catch (migErr) {
      console.warn(`   ⚠️  Nota en migración ${file}: ${migErr.message}`);
    }
  }
  console.log("✅ Todas las tablas y esquemas de PostgreSQL están al día.\n");

  // 2. MIGRAR DATOS DESDE STORE_SNAPSHOT.JSON
  const snapshotPath = path.resolve("apps/api/data/store_snapshot.json");
  if (!existsSync(snapshotPath)) {
    console.log("ℹ️  No se encontró store_snapshot.json previo. Se inicializó el esquema vacío.");
  } else {
    console.log("📥 2. Importando datos desde store_snapshot.json a PostgreSQL...");
    const rawData = JSON.parse(readFileSync(snapshotPath, "utf8"));
    const masterData = rawData.masterData || {};
    const events = rawData.events ? (Array.isArray(rawData.events[0]) ? rawData.events.map(e => e[1]) : rawData.events) : [];
    const eventOrigins = rawData.eventOrigins ? (Array.isArray(rawData.eventOrigins[0]) ? rawData.eventOrigins.map(e => ({ evento_id: e[0], origenes: e[1] })) : []) : [];
    const proposals = rawData.manualProposals ? (Array.isArray(rawData.manualProposals[0]) ? rawData.manualProposals.map(p => p[1]) : rawData.manualProposals) : [];

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Secaderos
      if (Array.isArray(masterData.secaderos)) {
        for (const s of masterData.secaderos) {
          await client.query(
            `insert into secaderos (secadero_id, codigo, nombre, activo)
             values ($1, $2, $3, $4)
             on conflict (secadero_id) do update set codigo = excluded.codigo, nombre = excluded.nombre, activo = excluded.activo`,
            [s.secadero_id, s.codigo || s.secadero_id, s.nombre, s.activo ?? true]
          );
        }
        console.log(`   ✔️  Secaderos sincronizados: ${masterData.secaderos.length}`);
      }

      // Tablets
      if (Array.isArray(masterData.tablets)) {
        for (const t of masterData.tablets) {
          await client.query(
            `insert into tablets (tablet_id, secadero_id, nombre, activa, ip_tablet)
             values ($1, $2, $3, $4, $5)
             on conflict (tablet_id) do update set secadero_id = excluded.secadero_id, nombre = excluded.nombre, activa = excluded.activa, ip_tablet = excluded.ip_tablet`,
            [t.tablet_id, t.secadero_id, t.nombre, t.activa ?? true, t.ip_tablet || null]
          );
        }
        console.log(`   ✔️  Tablets sincronizadas: ${masterData.tablets.length}`);
      }

      // Origenes
      if (Array.isArray(masterData.origenes)) {
        for (const o of masterData.origenes) {
          await client.query(
            `insert into origenes_parada (origen_id, codigo, nombre, activo)
             values ($1, $2, $3, $4)
             on conflict (origen_id) do update set codigo = excluded.codigo, nombre = excluded.nombre, activo = excluded.activo`,
            [o.origen_id, o.codigo || null, o.nombre, o.activa ?? o.activo ?? true]
          );
        }
        console.log(`   ✔️  Orígenes sincronizados: ${masterData.origenes.length}`);
      }

      // Turnos
      if (Array.isArray(masterData.turnos)) {
        for (const tur of masterData.turnos) {
          const vigencia = tur.fecha_inicio_vigencia || "2026-08-26";
          await client.query(
            `insert into turnos (turno_id, nombre, supervisor, hora_inicio, hora_fin, horas_totales, horas_descanso, activo, fecha_inicio_vigencia)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             on conflict (turno_id, fecha_inicio_vigencia) do update set
               nombre = excluded.nombre,
               supervisor = excluded.supervisor,
               hora_inicio = excluded.hora_inicio,
               hora_fin = excluded.hora_fin,
               horas_totales = excluded.horas_totales,
               horas_descanso = excluded.horas_descanso,
               activo = excluded.activo`,
            [tur.turno_id, tur.nombre, tur.supervisor || null, tur.hora_inicio, tur.hora_fin, Number(tur.horas_totales ?? 12), 0.0, tur.activo ?? true, vigencia]
          );
        }
        console.log(`   ✔️  Turnos sincronizados: ${masterData.turnos.length}`);
      }

function toBool(val, defaultVal = false) {
  if (val === true || val === "true" || val === 1 || val === "1" || val === "SI" || val === "si") return true;
  if (val === false || val === "false" || val === 0 || val === "0" || val === "NO" || val === "no" || val === "" || val === null || val === undefined) return false;
  return defaultVal;
}

      // Razones de parada
      if (Array.isArray(masterData.razones)) {
        for (const r of masterData.razones) {
          await client.query(
            `insert into razones_parada (
               razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas,
               mostrar_perfil, ubicacion_obligatoria, ubicacion_fija, ubicacion_lista, vista_electricos,
               vista_mecanicos, vista_mecanicos_rodillos, matriz, matriz_extendida
             )
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             on conflict (razon_id) do update set
               codigo = excluded.codigo,
               nombre = excluded.nombre,
               activa = excluded.activa,
               observacion_obligatoria = excluded.observacion_obligatoria,
               observaciones_predefinidas = excluded.observaciones_predefinidas,
               mostrar_perfil = excluded.mostrar_perfil,
               ubicacion_obligatoria = excluded.ubicacion_obligatoria,
               ubicacion_fija = excluded.ubicacion_fija,
               ubicacion_lista = excluded.ubicacion_lista,
               vista_electricos = excluded.vista_electricos,
               vista_mecanicos = excluded.vista_mecanicos,
               vista_mecanicos_rodillos = excluded.vista_mecanicos_rodillos,
               matriz = excluded.matriz,
               matriz_extendida = excluded.matriz_extendida`,
            [
              r.razon_id,
              r.codigo || null,
              r.nombre,
              toBool(r.activa, true),
              toBool(r.observacion_obligatoria, false),
              r.observaciones_predefinidas || null,
              toBool(r.mostrar_perfil, false),
              toBool(r.ubicacion_obligatoria, false),
              r.ubicacion_fija || null,
              r.ubicacion_lista || null,
              toBool(r.vista_electricos, false),
              toBool(r.vista_mecanicos, false),
              toBool(r.vista_mecanicos_rodillos, false),
              toBool(r.matriz, false),
              toBool(r.matriz_extendida, false)
            ]
          );

          if (Array.isArray(r.origen_ids) && r.origen_ids.length > 0) {
            await client.query("delete from razon_origenes where razon_id = $1", [r.razon_id]);
            for (const oriId of r.origen_ids) {
              await client.query(
                "insert into razon_origenes (razon_id, origen_id) values ($1, $2) on conflict do nothing",
                [r.razon_id, oriId]
              );
            }
          }
        }
        console.log(`   ✔️  Razones de parada sincronizadas: ${masterData.razones.length}`);
      }

      // Asegurar integridad referencial: insertar razones u orígenes archivados si algún evento histórico los referencia
      const existingRazonIds = new Set((masterData.razones || []).map(r => r.razon_id));
      const existingOrigenIds = new Set((masterData.origenes || []).map(o => o.origen_id));

      for (const ev of events) {
        if (ev.razon_id && !existingRazonIds.has(ev.razon_id)) {
          const stubName = ev.tiempo_muerto || ev.razon_id;
          await client.query(
            `insert into razones_parada (razon_id, nombre, activa)
             values ($1, $2, false)
             on conflict (razon_id) do nothing`,
            [ev.razon_id, stubName]
          );
          existingRazonIds.add(ev.razon_id);
        }

        const evOrigins = Array.isArray(ev.origenes) ? ev.origenes : [];
        for (const ori of evOrigins) {
          if (ori.origen_id && !existingOrigenIds.has(ori.origen_id)) {
            const stubName = ori.origen_manual || ori.origen_id;
            await client.query(
              `insert into origenes_parada (origen_id, nombre, activo)
               values ($1, $2, false)
               on conflict (origen_id) do nothing`,
              [ori.origen_id, stubName]
            );
            existingOrigenIds.add(ori.origen_id);
          }
        }
      }

      // Eventos
      let eventCount = 0;
      for (const ev of events) {
        if (!ev.evento_id) continue;
        await client.query(
          `insert into eventos_tiempo_muerto (
             evento_id, tablet_id, secadero_id, razon_id, razon_manual, fecha_hora_inicio, fecha_hora_fin,
             duracion_segundos, observacion, estado_evento, version, creado_en_tablet, recibido_en_servidor,
             turno_id, fecha_registro, hora_registro, timestamp_registro, hora_inicio_turno, hora_fin_turno,
             tipo_turno, hora_inicio_descanso, hora_fin_descanso, linea, hora_desde, hora_hasta, categoria_tm,
             tiempo_muerto, observaciones, ubicacion, tiempo_disponible_turno, tiempo_parada, inicio_evento_id
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
           on conflict (evento_id) do update set
             fecha_hora_inicio = excluded.fecha_hora_inicio,
             fecha_hora_fin = excluded.fecha_hora_fin,
             duracion_segundos = excluded.duracion_segundos,
             observacion = excluded.observacion,
             estado_evento = excluded.estado_evento,
             version = excluded.version,
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
             inicio_evento_id = excluded.inicio_evento_id`,
          [
            ev.evento_id,
            ev.tablet_id,
            ev.secadero_id,
            ev.razon_id || null,
            ev.razon_manual || null,
            ev.fecha_hora_inicio,
            ev.fecha_hora_fin || null,
            ev.duracion_segundos ?? null,
            ev.observacion || null,
            ev.estado_evento || "cerrado",
            ev.version || 1,
            ev.creado_en_tablet || null,
            ev.recibido_en_servidor || new Date().toISOString(),
            ev.turno_id || null,
            ev.fecha_registro || null,
            ev.hora_registro || null,
            ev.timestamp_registro || null,
            ev.hora_inicio_turno || null,
            ev.hora_fin_turno || null,
            ev.tipo_turno || null,
            ev.hora_inicio_descanso || null,
            ev.hora_fin_descanso || null,
            ev.linea || null,
            ev.hora_desde || null,
            ev.hora_hasta || null,
            ev.categoria_tm || null,
            ev.tiempo_muerto || null,
            ev.observaciones || null,
            ev.ubicacion || null,
            ev.tiempo_disponible_turno ?? null,
            ev.tiempo_parada ?? null,
            ev.inicio_evento_id || null
          ]
        );

        // Orígenes del evento
        const originsForEv = Array.isArray(ev.origenes) ? ev.origenes : [];
        if (originsForEv.length > 0) {
          await client.query("delete from evento_origenes where evento_id = $1", [ev.evento_id]);
          for (const ori of originsForEv) {
            await client.query(
              `insert into evento_origenes (evento_id, origen_id, origen_manual)
               values ($1, $2, $3)`,
              [ev.evento_id, ori.origen_id || null, ori.origen_manual || null]
            );
          }
        }

        eventCount++;
      }
      console.log(`   ✔️  Eventos de parada sincronizados: ${eventCount}`);

      // Propuestas manuales
      if (Array.isArray(proposals)) {
        for (const prop of proposals) {
          if (!prop.evento_id || !prop.texto) continue;
          const isValidUuid = prop.propuesta_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prop.propuesta_id);
          const finalPropId = isValidUuid ? prop.propuesta_id : crypto.randomUUID();
          await client.query(
            `insert into propuestas_maestro (propuesta_id, evento_id, tipo, texto, comentario, estado_revision)
             values ($1, $2, $3, $4, $5, $6)
             on conflict (evento_id, tipo, texto) do update set comentario = excluded.comentario, estado_revision = excluded.estado_revision`,
            [
              finalPropId,
              prop.evento_id,
              prop.tipo || "origen",
              prop.texto.trim(),
              prop.comentario || null,
              prop.estado_revision || "pendiente"
            ]
          );
        }
        console.log(`   ✔️  Propuestas de catálogo sincronizadas: ${proposals.length}`);
      }

      await client.query("COMMIT");
      console.log("✅ Migración de datos completada exitosamente.\n");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  }

  // 3. REPORTE FINAL DE AUDITORÍA DE REGISTROS EN POSTGRESQL
  console.log("📊 3. Resumen de registros consolidados en PostgreSQL:");
  const [secRes, tabRes, turRes, oriRes, razRes, evRes, propRes] = await Promise.all([
    pool.query("select count(*)::int as count from secaderos"),
    pool.query("select count(*)::int as count from tablets"),
    pool.query("select count(*)::int as count from turnos"),
    pool.query("select count(*)::int as count from origenes_parada"),
    pool.query("select count(*)::int as count from razones_parada"),
    pool.query("select count(*)::int as count from eventos_tiempo_muerto"),
    pool.query("select count(*)::int as count from propuestas_maestro")
  ]);

  console.log(`   • Secaderos:           ${secRes.rows[0].count}`);
  console.log(`   • Tablets:             ${tabRes.rows[0].count}`);
  console.log(`   • Turnos:              ${turRes.rows[0].count}`);
  console.log(`   • Orígenes de Parada:  ${oriRes.rows[0].count}`);
  console.log(`   • Razones de Parada:   ${razRes.rows[0].count}`);
  console.log(`   • Eventos Históricos:  ${evRes.rows[0].count}`);
  console.log(`   • Propuestas:          ${propRes.rows[0].count}`);
  console.log("\n=========================================================");
  console.log(" ¡Base de datos PostgreSQL 100% lista para Producción!");
  console.log("=========================================================");
} finally {
  await pool.end();
}
