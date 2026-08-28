import { readdir, readFile } from "node:fs/promises";
import pg from "pg";
import { PgSyncStore } from "../apps/api/src/postgres-store.mjs";

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL ??
  "postgres://coama:coama_dev_password@127.0.0.1:5432/coama_tiempos_muertos";

const pool = new Pool({ connectionString });
const store = new PgSyncStore({ pool });

const event = {
  evento_id: "11111111-1111-4111-8111-111111111111",
  tablet_id: "tab-sec-1",
  secadero_id: "sec-1",
  razon_id: "raz-mantenimiento",
  fecha_hora_inicio: "2026-08-03T10:00:00.000Z",
  fecha_hora_fin: "2026-08-03T10:25:00.000Z",
  duracion_segundos: 1500,
  observacion: "Prueba de sincronizacion PostgreSQL con multiples origenes.",
  estado_evento: "cerrado",
  version: 1,
  origenes: [
    { origen_id: "ori-secadero" },
    { origen_id: "ori-caldera" }
  ],
  propuesta_manual: {
    tipo: "origen",
    texto: "Valvula intermedia",
    comentario: "No estaba en la lista de origenes."
  }
};

try {
  await applyMigrations("database/migrations");
  await applySqlFile("database/seeds/dev_seed.sql");
  await cleanTestEvent(event.evento_id);

  const firstSync = await store.syncBatch([event]);
  const secondSync = await store.syncBatch([event]);
  const invalidSync = await store.syncBatch([
    {
      ...event,
      evento_id: "22222222-2222-4222-8222-222222222222",
      origenes: []
    }
  ]);

  const counts = await readCounts(event.evento_id);
  const result = {
    firstSync,
    secondSync,
    invalidSync,
    counts,
    expected: {
      firstSync: "inserted",
      secondSync: "updated sin duplicar",
      invalidSync: "rechazado por no tener origen",
      eventCount: 1,
      eventOriginCount: 2,
      manualProposalCount: 1
    }
  };

  console.log(JSON.stringify(result, null, 2));

  if (
    firstSync.accepted[0]?.status !== "inserted" ||
    secondSync.accepted[0]?.status !== "updated" ||
    invalidSync.rejected.length !== 1 ||
    counts.eventCount !== 1 ||
    counts.eventOriginCount !== 2 ||
    counts.manualProposalCount !== 1
  ) {
    process.exitCode = 1;
  }
} finally {
  await store.close();
}

async function applySqlFile(path) {
  const sql = await readFile(path, "utf8");
  await pool.query(sql);
}

async function applyMigrations(path) {
  const entries = await readdir(path);
  const migrations = entries
    .filter(entry => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  for (const migration of migrations) {
    await applySqlFile(`${path}/${migration}`);
  }
}

async function cleanTestEvent(eventId) {
  await pool.query("delete from propuestas_maestro where evento_id = $1", [eventId]);
  await pool.query("delete from evento_origenes where evento_id = $1", [eventId]);
  await pool.query("delete from eventos_tiempo_muerto where evento_id = $1", [eventId]);
}

async function readCounts(eventId) {
  const result = await pool.query(
    `
      select
        (select count(*)::int from eventos_tiempo_muerto where evento_id = $1) as "eventCount",
        (select count(*)::int from evento_origenes where evento_id = $1) as "eventOriginCount",
        (select count(*)::int from propuestas_maestro where evento_id = $1) as "manualProposalCount"
    `,
    [eventId]
  );

  return result.rows[0];
}
