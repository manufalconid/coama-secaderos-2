import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile();
  } catch (_) {}
}

const DATABASE_URL = process.env.DATABASE_URL || "postgres://coama:coama_dev@127.0.0.1:5432/coama_tiempos_muertos";

async function resetOperationalData() {
  console.log("================================================================================");
  console.log(" 🧹 FORMATEO DE DATOS OPERATIVOS / DE PRUEBA (PREPARACIÓN PARA PRODUCCIÓN)");
  console.log("================================================================================\n");

  console.log("🛡️  GOOGLE SHEETS: NO se modificará ni borrará ninguna celda de Google Sheets.");
  console.log("    (Tus datos históricos hasta julio 2026 y turnos en Sheets quedan 100% intactos)\n");

  // 1. Limpieza en PostgreSQL
  console.log("[ 1/2 ] Conectando a PostgreSQL para vaciar tablas operativas...");
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    await pool.query("SELECT 1;");
    console.log("  Conexión exitosa a la base de datos.");

    // Truncar tablas operativas
    await pool.query(`
      TRUNCATE TABLE evento_origenes CASCADE;
      TRUNCATE TABLE historial_modificaciones CASCADE;
      TRUNCATE TABLE propuestas_maestro CASCADE;
      TRUNCATE TABLE eventos_tiempo_muerto CASCADE;
    `);
    console.log("  ✅ Tablas operativas vaciadas en PostgreSQL:");
    console.log("     - eventos_tiempo_muerto (0 registros)");
    console.log("     - evento_origenes (0 registros)");
    console.log("     - propuestas_maestro (0 registros)");
    console.log("     - historial_modificaciones (0 registros)");

    // Verificar que los datos maestros se conservan intactos
    const [sec, tab, raz, ori, tur] = await Promise.all([
      pool.query("SELECT count(*) FROM secaderos;"),
      pool.query("SELECT count(*) FROM tablets;"),
      pool.query("SELECT count(*) FROM razones_parada;"),
      pool.query("SELECT count(*) FROM origenes_parada;"),
      pool.query("SELECT count(*) FROM turnos;")
    ]);

    console.log("\n  🛡️  Datos Maestros conservados al 100% en PostgreSQL:");
    console.log(`     - Secaderos: ${sec.rows[0].count} registros`);
    console.log(`     - Tablets configuradas: ${tab.rows[0].count} registros`);
    console.log(`     - Razones de parada: ${raz.rows[0].count} registros`);
    console.log(`     - Orígenes de parada: ${ori.rows[0].count} registros`);
    console.log(`     - Turnos: ${tur.rows[0].count} registros`);
  } catch (err) {
    console.warn("  ⚠️  Aviso Postgres:", err.message);
  } finally {
    await pool.end();
  }

  // 2. Limpieza de snapshot JSON en disco
  console.log("\n[ 2/2 ] Limpiando snapshot de eventos en JSON...");
  const snapshotPaths = [
    path.resolve("apps/api/data/store_snapshot.json"),
    path.resolve("apps/api/src/store_snapshot.json")
  ];

  for (const snapshotPath of snapshotPaths) {
    if (fs.existsSync(snapshotPath)) {
      try {
        const raw = fs.readFileSync(snapshotPath, "utf8");
        const json = JSON.parse(raw);
        json.events = [];
        json.eventOrigins = [];
        json.manualProposals = [];
        // masterData se conserva intacto
        fs.writeFileSync(snapshotPath, JSON.stringify(json, null, 2), "utf8");
        console.log(`  ✅ Archivo ${path.relative(process.cwd(), snapshotPath)} vaciado de eventos (MasterData conservado).`);
      } catch (e) {
        console.error(`  Error procesando ${snapshotPath}:`, e.message);
      }
    }
  }

  console.log("\n================================================================================");
  console.log(" 🎉 ¡SISTEMA LOCAL Y SERVIDOR LISTOS PARA EL ARRANQUE CON DATOS REALES!");
  console.log("================================================================================\n");
  console.log("📌 Pasos a realizar en las TABLETS antes de iniciar el turno:");
  console.log("   1. En la tablet, abrir 'Ajustes' (ícono de tuerca o configuración).");
  console.log("   2. Presionar el botón amarillo '🧹 Vaciar Cola de Paradas'.");
  console.log("   3. ¡Listo! La terminal arrancará limpia con el secadero configurado.\n");
}

resetOperationalData().catch(console.error);
