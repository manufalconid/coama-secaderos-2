import XLSX from "xlsx";

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

      // Limpiar tablas maestras
      await client.query("truncate table razon_origenes cascade;");
      await client.query("truncate table razones_parada cascade;");
      await client.query("truncate table origenes_parada cascade;");
      await client.query("truncate table tablets cascade;");
      await client.query("truncate table secaderos cascade;");
      await client.query("truncate table turnos cascade;");

      // Insertar Secaderos
      for (const s of secaderosParsed.values()) {
        await client.query(
          "insert into secaderos (secadero_id, codigo, nombre, activo) values ($1, $2, $3, $4)",
          [s.secadero_id, s.codigo, s.nombre, s.activo]
        );
      }

      // Insertar Tablets
      for (const t of tabletsParsed) {
        await client.query(
          "insert into tablets (tablet_id, secadero_id, nombre, activa, ip_tablet) values ($1, $2, $3, $4, $5)",
          [t.tablet_id, t.secadero_id, t.nombre, t.activa, t.ip_tablet]
        );
      }

      // Insertar Orígenes
      for (const o of origenesParsed.values()) {
        await client.query(
          "insert into origenes_parada (origen_id, codigo, nombre, activo) values ($1, $2, $3, $4)",
          [o.origen_id, o.codigo, o.nombre, o.activa]
        );
      }

      // Insertar Razones
      for (const r of razonesParsed) {
        await client.query(
          `
            insert into razones_parada (
              razon_id, codigo, nombre, activa, observacion_obligatoria, observaciones_predefinidas, mostrar_perfil
            ) values ($1, $2, $3, $4, $5, $6, $7)
          `,
          [r.razon_id, r.codigo, r.nombre, r.activa, r.observacion_obligatoria, r.observaciones_predefinidas, r.mostrar_perfil]
        );
      }

      // Insertar Razon-Origenes links
      for (const l of linksParsed) {
        await client.query(
          "insert into razon_origenes (razon_id, origen_id) values ($1, $2)",
          [l.razon_id, l.origen_id]
        );
      }

      // Insertar Turnos
      for (const t of turnosParsed) {
        await client.query(
          `
            insert into turnos (
              turno_id, nombre, hora_inicio, hora_fin, horas_totales, horas_descanso, activo, fecha_inicio_vigencia
            ) values ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [t.turno_id, t.nombre, t.hora_inicio, t.hora_fin, t.horas_totales, t.horas_descanso, t.activo, t.fecha_inicio_vigencia]
        );
      }

      await client.query("COMMIT");
      console.log("[ OK ] Parametros importados y guardados en base de datos Postgres.");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } else {
    // Modo Memoria
    store.masterData.secaderos = Array.from(secaderosParsed.values());
    store.masterData.tablets = tabletsParsed;
    store.masterData.origenes = Array.from(origenesParsed.values());
    store.masterData.razones = razonesParsed;
    store.masterData.turnos = turnosParsed;
    if (typeof store.saveToDisk === "function") {
      store.saveToDisk();
    }
    console.log("[ OK ] Parametros importados y guardados en memoria.");
  }

  return { success: true, message: "Parámetros actualizados correctamente." };
}
