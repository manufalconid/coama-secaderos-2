import XLSX from "xlsx";
import { syncTurnosToSheets } from "./sheets-sync.mjs";

export async function exportParametros(store) {
  // 1. Obtener los datos maestros actuales
  const masterData = await store.getMasterData();

  const tablets = masterData?.tablets || [];
  const secaderos = masterData?.secaderos || [];
  const razones = masterData?.razones || [];
  const origenes = masterData?.origenes || [];
  const turnos = masterData?.turnos || [];

  // 2. Crear las hojas del Excel
  // Hoja 1: Tablets y Secaderos
  const tabletsHeaders = ["Tablet ID", "Secadero ID", "Nombre Tablet", "Secadero/Linea", "IP Tablet", "Activa"];
  const tabletsRows = [tabletsHeaders];
  for (const t of tablets) {
    const secObj = secaderos.find(s => s.secadero_id === t.secadero_id);
    tabletsRows.push([
      t.tablet_id,
      t.secadero_id,
      t.nombre,
      secObj ? secObj.nombre : t.secadero_id,
      t.ip_tablet || "",
      t.activa ? "SI" : "NO"
    ]);
  }

  // Hoja 2: Catálogo de Paradas
  const paradasHeaders = [
    "Categoria (Origen)",
    "Tiempo Muerto (Razon)",
    "Codigo",
    "Observaciones Predefinidas",
    "Observacion Obligatoria",
    "Mostrar Perfil Secadero"
  ];
  const paradasRows = [paradasHeaders];
  for (const r of razones) {
    const origNames = (r.origen_ids || [])
      .map(oid => origenes.find(o => o.origen_id === oid)?.nombre || oid)
      .join(", ");
    paradasRows.push([
      origNames || "OPERATIVO",
      r.nombre,
      r.codigo || "",
      r.observaciones_predefinidas || "",
      r.observacion_obligatoria ? "SI" : "NO",
      r.mostrar_perfil ? "SI" : "NO"
    ]);
  }

  // Hoja 3: Configuración de Turnos
  const turnosHeaders = [
    "Turno ID",
    "Nombre",
    "Hora Inicio",
    "Hora Fin",
    "Horas Totales",
    "Horas Descanso",
    "Fecha Vigencia",
    "Activo"
  ];
  const turnosRows = [turnosHeaders];
  for (const t of turnos) {
    turnosRows.push([
      t.turno_id,
      t.nombre,
      t.hora_inicio,
      t.hora_fin,
      t.horas_totales,
      t.horas_descanso,
      t.fecha_inicio_vigencia || "2026-08-26",
      t.activo ? "SI" : "NO"
    ]);
  }

  // 3. Crear el libro de trabajo (workbook)
  const wb = XLSX.utils.book_new();
  
  const ws1 = XLSX.utils.aoa_to_sheet(tabletsRows);
  const ws2 = XLSX.utils.aoa_to_sheet(paradasRows);
  const ws3 = XLSX.utils.aoa_to_sheet(turnosRows);

  XLSX.utils.book_append_sheet(wb, ws1, "Tablets y Secaderos");
  XLSX.utils.book_append_sheet(wb, ws2, "Catalogo de Paradas");
  XLSX.utils.book_append_sheet(wb, ws3, "Configuracion de Turnos");

  // 4. Generar el buffer binario
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

export async function importParametros(store, buffer) {
  // 1. Leer el libro desde el buffer
  const wb = XLSX.read(buffer, { type: "buffer" });

  const tabletsSheet = wb.Sheets["Tablets y Secaderos"];
  const paradasSheet = wb.Sheets["Catalogo de Paradas"];
  const turnosSheet = wb.Sheets["Configuracion de Turnos"];

  if (!tabletsSheet || !paradasSheet || !turnosSheet) {
    throw new Error("El archivo XLSX debe contener las hojas: 'Tablets y Secaderos', 'Catalogo de Paradas', y 'Configuracion de Turnos'.");
  }

  const tabletsData = XLSX.utils.sheet_to_json(tabletsSheet);
  const paradasData = XLSX.utils.sheet_to_json(paradasSheet);
  const turnosData = XLSX.utils.sheet_to_json(turnosSheet);

  // Parsear Tablets y Secaderos
  const secaderosParsed = new Map();
  const tabletsParsed = [];
  for (const row of tabletsData) {
    const tabletId = (row["Tablet ID"] || "").toString().trim().toLowerCase();
    const secaderoId = (row["Secadero ID"] || "").toString().trim().toLowerCase();
    const nameTablet = (row["Nombre Tablet"] || "").toString().trim();
    const nameSecadero = (row["Secadero/Linea"] || "").toString().trim();
    const ipVal = (row["IP Tablet"] || "").toString().trim();
    const activaVal = (row["Activa"] || "").toString().trim().toUpperCase();

    if (!tabletId || !secaderoId || !nameSecadero) continue;

    if (!secaderosParsed.has(secaderoId)) {
      secaderosParsed.set(secaderoId, {
        secadero_id: secaderoId,
        codigo: nameSecadero.toUpperCase(),
        nombre: nameSecadero,
        activo: true
      });
    }

    tabletsParsed.push({
      tablet_id: tabletId,
      secadero_id: secaderoId,
      nombre: nameTablet || `Tablet ${nameSecadero}`,
      ip_tablet: ipVal || null,
      activa: activaVal === "SI" || activaVal === "TRUE"
    });
  }

  // Parsear Catálogo de Paradas
  const origenesParsed = new Map();
  const razonesParsed = [];
  const linksParsed = [];

  for (const row of paradasData) {
    const origNamesRaw = (row["Categoria (Origen)"] || "").toString().trim();
    const razonName = (row["Tiempo Muerto (Razon)"] || "").toString().trim();
    const codigo = (row["Codigo"] || "").toString().trim();
    const obsPre = (row["Observaciones Predefinidas"] || "").toString().trim();
    const obligVal = (row["Observacion Obligatoria"] || "").toString().trim().toUpperCase();
    const perfilVal = (row["Mostrar Perfil Secadero"] || "").toString().trim().toUpperCase();

    if (!razonName) continue;

    const razonId = `raz-${razonName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`;
    
    // Parse origins mapping (supports comma-separated multiple origins in Excel too)
    const origs = origNamesRaw.split(",").map(o => o.trim()).filter(Boolean);
    const mappedOrigenIds = [];

    for (const origName of origs) {
      const origId = `ori-${origName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`;
      if (!origenesParsed.has(origId)) {
        origenesParsed.set(origId, {
          origen_id: origId,
          codigo: origName.toUpperCase(),
          nombre: origName,
          activa: true
        });
      }
      mappedOrigenIds.push(origId);
      linksParsed.push({ razon_id: razonId, origen_id: origId });
    }

    razonesParsed.push({
      razon_id: razonId,
      codigo: codigo || null,
      nombre: razonName,
      activa: true,
      observacion_obligatoria: obligVal === "SI" || obligVal === "TRUE",
      observaciones_predefinidas: obsPre || null,
      mostrar_perfil: perfilVal === "SI" || perfilVal === "TRUE",
      origen_ids: mappedOrigenIds
    });
  }

  // Parsear Turnos
  const turnosParsed = [];
  for (const row of turnosData) {
    const turnoId = (row["Turno ID"] || "").toString().trim().toLowerCase();
    const name = (row["Nombre"] || "").toString().trim();
    const start = (row["Hora Inicio"] || "").toString().trim();
    const end = (row["Hora Fin"] || "").toString().trim();
    const tot = Number(row["Horas Totales"] || 12.0);
    const desc = Number(row["Horas Descanso"] || 0.0);
    const vig = (row["Fecha Vigencia"] || "").toString().trim();
    const act = (row["Activo"] || "").toString().trim().toUpperCase();

    if (!turnoId || !name || !start || !end) continue;

    turnosParsed.push({
      turno_id: turnoId,
      nombre: name,
      hora_inicio: start,
      hora_fin: end,
      horas_totales: tot,
      horas_descanso: desc,
      fecha_inicio_vigencia: vig || "2026-08-26",
      activo: act !== "NO" && act !== "FALSE"
    });
  }

  // 2. Persistir en la base de datos según el modo del store
  if (store.pool) {
    const client = await store.pool.connect();
    try {
      await client.query("BEGIN");

      // 2.1. Upsert de Secaderos
      for (const s of secaderosParsed.values()) {
        await client.query(
          `
            insert into secaderos (secadero_id, codigo, nombre, activo, modificado_en)
            values ($1, $2, $3, $4, now())
            on conflict (secadero_id) do update set
              codigo = excluded.codigo,
              nombre = excluded.nombre,
              activo = excluded.activo,
              modificado_en = now()
          `,
          [s.secadero_id, s.codigo, s.nombre, s.activo]
        );
      }
      // Desactivar secaderos no incluidos en el excel
      const importedSecaderoIds = Array.from(secaderosParsed.keys());
      if (importedSecaderoIds.length > 0) {
        const placeholders = importedSecaderoIds.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `update secaderos set activo = false, modificado_en = now() where secadero_id not in (${placeholders})`,
          importedSecaderoIds
        );
      } else {
        await client.query("update secaderos set activo = false, modificado_en = now()");
      }

      // 2.2. Upsert de Tablets
      for (const t of tabletsParsed) {
        await client.query(
          `
            insert into tablets (tablet_id, secadero_id, nombre, activa, ip_tablet, modificado_en)
            values ($1, $2, $3, $4, $5, now())
            on conflict (tablet_id) do update set
              secadero_id = excluded.secadero_id,
              nombre = excluded.nombre,
              activa = excluded.activa,
              ip_tablet = excluded.ip_tablet,
              modificado_en = now()
          `,
          [t.tablet_id, t.secadero_id, t.nombre, t.activa, t.ip_tablet]
        );
      }
      // Desactivar tablets no incluidas en el excel
      const importedTabletIds = tabletsParsed.map(t => t.tablet_id);
      if (importedTabletIds.length > 0) {
        const placeholders = importedTabletIds.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `update tablets set activa = false, modificado_en = now() where tablet_id not in (${placeholders})`,
          importedTabletIds
        );
      } else {
        await client.query("update tablets set activa = false, modificado_en = now()");
      }

      // 2.3. Upsert de Orígenes
      for (const o of origenesParsed.values()) {
        await client.query(
          `
            insert into origenes_parada (origen_id, codigo, nombre, activo, modificado_en)
            values ($1, $2, $3, $4, now())
            on conflict (origen_id) do update set
              codigo = excluded.codigo,
              nombre = excluded.nombre,
              activo = excluded.activo,
              modificado_en = now()
          `,
          [o.origen_id, o.codigo, o.nombre, o.activa]
        );
      }
      // Desactivar orígenes no incluidos en el excel
      const importedOrigenIds = Array.from(origenesParsed.keys());
      if (importedOrigenIds.length > 0) {
        const placeholders = importedOrigenIds.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `update origenes_parada set activo = false, modificado_en = now() where origen_id not in (${placeholders})`,
          importedOrigenIds
        );
      } else {
        await client.query("update origenes_parada set activo = false, modificado_en = now()");
      }

      // 2.4. Upsert de Razones
      for (const r of razonesParsed) {
        await client.query(
          `
            insert into razones_parada (
              razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas, mostrar_perfil, modificado_en
            ) values ($1, $2, $3, $4, $5, $6, $7, now())
            on conflict (razon_id) do update set
              codigo = excluded.codigo,
              nombre = excluded.nombre,
              activa = excluded.activa,
              observacion_obligatoria = excluded.observacion_obligatoria,
              observaciones_predefinidas = excluded.observaciones_predefinidas,
              mostrar_perfil = excluded.mostrar_perfil,
              modificado_en = now()
          `,
          [r.razon_id, r.codigo, r.nombre, r.activa, r.observacion_obligatoria, r.observaciones_predefinidas, r.mostrar_perfil]
        );
      }
      // Desactivar razones no incluidas en el excel
      const importedRazonIds = razonesParsed.map(r => r.razon_id);
      if (importedRazonIds.length > 0) {
        const placeholders = importedRazonIds.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `update razones_parada set activa = false, modificado_en = now() where razon_id not in (${placeholders})`,
          importedRazonIds
        );
      } else {
        await client.query("update razones_parada set activa = false, modificado_en = now()");
      }

      // 2.5. Actualizar asociaciones razon_origenes
      // Eliminamos relaciones existentes solo para las razones que estamos importando (para evitar duplicaciones y limpiar las antiguas)
      if (importedRazonIds.length > 0) {
        const placeholders = importedRazonIds.map((_, i) => `$${i + 1}`).join(", ");
        await client.query(
          `delete from razon_origenes where razon_id in (${placeholders})`,
          importedRazonIds
        );
      }
      // Insertar las nuevas relaciones de mapeo
      for (const l of linksParsed) {
        await client.query(
          "insert into razon_origenes (razon_id, origen_id) values ($1, $2)",
          [l.razon_id, l.origen_id]
        );
      }

      // 2.6. Upsert de Turnos
      for (const t of turnosParsed) {
        await client.query(
          `
            insert into turnos (
              turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo, fecha_inicio_vigencia, modificado_en
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, now())
            on conflict (turno_id, fecha_inicio_vigencia) do update set
              nombre = excluded.nombre,
              hora_inicio = excluded.hora_inicio,
              hora_fin = excluded.hora_fin,
              horas_totales = excluded.horas_totales,
              horas_descanso = excluded.horas_descanso,
              activo = excluded.activo,
              modificado_en = now()
          `,
          [t.turno_id, t.nombre, t.hora_inicio, t.hora_fin, t.horas_totales, t.horas_descanso, t.activo, t.fecha_inicio_vigencia]
        );
      }
      // Desactivar turnos no incluidos en el excel
      if (turnosParsed.length > 0) {
        const placeholders = turnosParsed.map((_, i) => `($${i * 2 + 1}::text, $${i * 2 + 2}::date)`).join(", ");
        const params = [];
        for (const t of turnosParsed) {
          params.push(t.turno_id, t.fecha_inicio_vigencia);
        }
        await client.query(
          `update turnos set activo = false, modificado_en = now() where (turno_id, fecha_inicio_vigencia) not in (${placeholders})`,
          params
        );
      } else {
        await client.query("update turnos set activo = false, modificado_en = now()");
      }

      await client.query("COMMIT");
      console.log("[ OK ] Parametros importados (Upsert) y guardados en base de datos Postgres sin perdida de historiales.");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } else {
    // Modo Memoria - Upsert y soft-delete para consistencia
    // 1. Secaderos
    const existingSecaderos = store.masterData.secaderos || [];
    const newSecaderosMap = new Map(secaderosParsed);
    for (const s of existingSecaderos) {
      if (!newSecaderosMap.has(s.secadero_id)) {
        s.activo = false;
        newSecaderosMap.set(s.secadero_id, s);
      }
    }
    store.masterData.secaderos = Array.from(newSecaderosMap.values());

    // 2. Tablets
    const existingTablets = store.masterData.tablets || [];
    const newTabletsMap = new Map(tabletsParsed.map(t => [t.tablet_id, t]));
    for (const t of existingTablets) {
      if (!newTabletsMap.has(t.tablet_id)) {
        t.activa = false;
        newTabletsMap.set(t.tablet_id, t);
      }
    }
    store.masterData.tablets = Array.from(newTabletsMap.values());

    // 3. Orígenes
    const existingOrigenes = store.masterData.origenes || [];
    const newOrigenesMap = new Map(origenesParsed);
    for (const o of existingOrigenes) {
      if (!newOrigenesMap.has(o.origen_id)) {
        o.activa = false; // en memoria usamos activa
        newOrigenesMap.set(o.origen_id, o);
      }
    }
    store.masterData.origenes = Array.from(newOrigenesMap.values());

    // 4. Razones
    const existingRazones = store.masterData.razones || [];
    const newRazonesMap = new Map(razonesParsed.map(r => [r.razon_id, r]));
    for (const r of existingRazones) {
      if (!newRazonesMap.has(r.razon_id)) {
        r.activa = false;
        newRazonesMap.set(r.razon_id, r);
      }
    }
    store.masterData.razones = Array.from(newRazonesMap.values());

    // 5. Turnos
    const existingTurnos = store.masterData.turnos || [];
    const newTurnosMap = new Map(turnosParsed.map(t => [`${t.turno_id}:${t.fecha_inicio_vigencia}`, t]));
    for (const t of existingTurnos) {
      const key = `${t.turno_id}:${t.fecha_inicio_vigencia}`;
      if (!newTurnosMap.has(key)) {
        t.activo = false;
        newTurnosMap.set(key, t);
      }
    }
    store.masterData.turnos = Array.from(newTurnosMap.values());

    if (typeof store.saveToDisk === "function") {
      store.saveToDisk();
    }
    console.log("[ OK ] Parametros importados (Upsert) y guardados en memoria sin borrar historiales.");
  }

  // Sincronizar tabla de turnos con Google Sheets
  syncTurnosToSheets(turnosParsed).catch(err => console.error("Error sincronizando turnos a Google Sheets:", err));

  return { success: true, message: "Parámetros actualizados correctamente." };
}
