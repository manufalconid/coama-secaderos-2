import React, { useState, useRef } from "react";
import { Tablet, Sliders, Monitor, FileSpreadsheet } from "lucide-react";

function formatTimestampSafe(dateInput, fallbackText = "Sin reportes") {
  if (!dateInput || dateInput === "Sin reporte" || dateInput === "Nunca") return fallbackText;
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return fallbackText;
    const diffSecs = Math.floor((Date.now() - d.getTime()) / 1000);
    const relativeStr = diffSecs < 60 ? `Hace ${Math.max(1, diffSecs)}s` : `Hace ${Math.floor(diffSecs / 60)}m`;
    const timeStr = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `${relativeStr} (${timeStr})`;
  } catch {
    return fallbackText;
  }
}

export default function ParametrosView({
  activeMaster = "razones",
  changeMaster,
  masterData = { razones: [], origenes: [], turnos: [], secaderos: [] },
  filteredRows = [],
  config = { label: "Parámetros", idField: "id" },
  query = "",
  setQuery,
  categoryFilter = "",
  setCategoryFilter,
  selected = null,
  selectRow,
  onDownloadXlsx,
  onUploadXlsx,
  tabletsStatus = [],
  refreshTablets,
  onPingTablets,
  isPingingTablets = false,
  MASTER_CONFIG = {}
}) {
  const [viewSection, setViewSection] = useState("all"); // 'all' | 'catalog' | 'tablets'
  const tabletsSectionRef = useRef(null);

  const safeMasterData = masterData || { razones: [], origenes: [], turnos: [], secaderos: [] };
  const origenesList = safeMasterData.origenes || [];
  const idField = config?.idField || "id";

  const handleViewSectionChange = (val) => {
    setViewSection(val);
    if (val === "tablets" && tabletsSectionRef.current) {
      setTimeout(() => {
        tabletsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <>
      <div className="main-header" style={{ marginBottom: "16px" }}>
        <div>
          <h1>Parámetros del Sistema</h1>
          <p>Razones y orígenes configurados para el registro en las tablets</p>
        </div>

        {/* 2 DESPLEGABLES SOLICITADOS EN LA PARTE SUPERIOR */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* DESPLEGABLE 1: CATÁLOGO DE PARÁMETROS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <label style={{ fontSize: "10px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase" }}>Catálogo de Parámetro</label>
            <select
              value={activeMaster}
              onChange={e => changeMaster && changeMaster(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "4px",
                border: "1px solid var(--brand-lumo-gold)",
                background: "rgba(250, 204, 21, 0.08)",
                color: "#fff",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              {Object.entries(MASTER_CONFIG || {}).map(([key, item]) => (
                <option key={key} value={key} style={{ background: "#111", color: "#fff" }}>
                  {item.label} ({safeMasterData[key]?.length || 0})
                </option>
              ))}
            </select>
          </div>

          {/* DESPLEGABLE 2: ESTADO DE TABLETS / SECCIÓN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <label style={{ fontSize: "10px", color: "var(--text-dim)", fontWeight: "700", textTransform: "uppercase" }}>Estado & Vista de Pantalla</label>
            <select
              value={viewSection}
              onChange={e => handleViewSectionChange(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "4px",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-input)",
                color: "#fff",
                fontSize: "12.5px",
                fontWeight: "700",
                cursor: "pointer"
              }}
            >
              <option value="all">🔍 Mostrar Vista Completa (Ambas Secciones)</option>
              <option value="catalog">📋 Solo Catálogo de Parámetros</option>
              <option value="tablets">📱 Ir a Estado & Monitoreo de Tablets</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "16px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--brand-lumo-gold)", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "4px" }}>Parametrización desde Excel (XLSX)</span>
          <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>Descarga la planilla de configuración completa, edítala en Excel o Google Sheets, y súbela nuevamente para actualizar tablets, turnos e IP.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={onDownloadXlsx} style={{ display: "inline-flex", alignItems: "center", gap: "6px", height: "36px", padding: "0 16px", fontSize: "12.5px", borderRadius: "4px" }}>
            📥 Descargar Planilla
          </button>
          <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", height: "36px", padding: "0 16px", fontSize: "12.5px", borderRadius: "4px" }}>
            📤 Subir Planilla
            <input
              type="file"
              accept=".xlsx"
              style={{ display: "none" }}
              onChange={onUploadXlsx}
            />
          </label>
        </div>
      </div>

      {(viewSection === "all" || viewSection === "catalog") && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", marginBottom: "24px" }}>
          <div className="clean-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={query || ""}
                  onChange={e => setQuery && setQuery(e.target.value)}
                  placeholder="Buscar..."
                  style={{ width: "220px", padding: "8px 12px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", fontSize: "13px" }}
                />
                {activeMaster === "razones" && (
                  <select
                    value={categoryFilter || ""}
                    onChange={e => setCategoryFilter && setCategoryFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", fontSize: "13px" }}
                  >
                    <option value="">Todos los orígenes</option>
                    {origenesList.map(o => (
                      <option key={o.origen_id} value={o.origen_id}>{o.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  {activeMaster === "razones" && <th>Origen Padre</th>}
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(filteredRows || []).map(row => {
                  const parentNames = activeMaster === "razones"
                    ? (row.origen_ids || []).map(id => origenesList.find(o => o.origen_id === id)?.nombre).filter(Boolean).join(", ")
                    : "";
                  const rowKey = row[idField] || row.nombre || Math.random();
                  const isSelected = selected && selected[idField] === row[idField];
                  return (
                    <tr key={rowKey} style={{ cursor: "pointer", background: isSelected ? "rgba(250,204,21,0.08)" : "" }} onClick={() => selectRow && selectRow(row, activeMaster)}>
                      <td><strong>{row.nombre}</strong></td>
                      {activeMaster === "razones" && <td>{parentNames || "--"}</td>}
                      <td><span className={`state-tag ${row.activa ? "operando" : "pendiente"}`}>{row.activa ? "Activa" : "Inactiva"}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DETALLE COMPLETO DE RAZONES Y PARÁMETROS SEGÚN EL EXCEL */}
          <div className="clean-card" style={{ maxHeight: "80vh", overflowY: "auto" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "15px", fontWeight: "700", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
              Detalles del Parámetro
            </h3>
            {selected ? (
              <div style={{ display: "grid", gap: "14px", fontSize: "12.5px" }}>
                <div>
                  <strong style={{ color: "var(--text-dim)", fontSize: "10.5px", textTransform: "uppercase" }}>Nombre de la Razón:</strong>
                  <div style={{ marginTop: "2px", fontSize: "15px", fontWeight: "bold", color: "var(--brand-lumo-gold)" }}>{selected.nombre}</div>
                </div>

                {selected.codigo && (
                  <div>
                    <strong style={{ color: "var(--text-dim)", fontSize: "10.5px", textTransform: "uppercase" }}>Código Excel / Identificador:</strong>
                    <div style={{ marginTop: "2px" }}><code>{selected.codigo}</code></div>
                  </div>
                )}
                
                {activeMaster === "razones" && (
                  <>
                    <div>
                      <strong style={{ color: "var(--text-dim)", fontSize: "10.5px", textTransform: "uppercase" }}>Orígenes Padres / Categorías:</strong>
                      <div style={{ marginTop: "4px" }}>
                        {(selected.origen_ids || [])
                          .map(id => origenesList.find(o => o.origen_id === id)?.nombre)
                          .filter(Boolean)
                          .map((name, idx) => (
                            <span key={idx} className="mono" style={{ display: "inline-block", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "3px", marginRight: "4px", marginBottom: "4px", fontSize: "11px" }}>
                              {name}
                            </span>
                          )) || "--"}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", background: "rgba(255,255,255,0.02)", padding: "10px", borderRadius: "4px", border: "1px solid var(--border-subtle)" }}>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Obs. Obligatoria?:</strong>
                        <div style={{ marginTop: "2px", fontWeight: "700", color: selected.observacion_obligatoria ? "var(--brand-lumo-gold)" : "var(--text-muted)" }}>
                          {selected.observacion_obligatoria ? "SÍ (Requerida)" : "NO (Opcional)"}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Ubicación Obligatoria?:</strong>
                        <div style={{ marginTop: "2px", fontWeight: "700", color: (selected.ubicacion_obligatoria ?? selected.mostrar_perfil) ? "var(--brand-lumo-gold)" : "var(--text-muted)" }}>
                          {(selected.ubicacion_obligatoria ?? selected.mostrar_perfil) ? "SÍ (Requerida)" : "NO"}
                        </div>
                      </div>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Vista Eléctricos?:</strong>
                        <div style={{ marginTop: "2px" }}>{selected.vista_electricos ? "SÍ" : "NO"}</div>
                      </div>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Vista Mecánicos?:</strong>
                        <div style={{ marginTop: "2px" }}>{selected.vista_mecanicos ? "SÍ" : "NO"}</div>
                      </div>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Mecán. Rodillos?:</strong>
                        <div style={{ marginTop: "2px" }}>{selected.vista_mecanicos_rodillos ? "SÍ" : "NO"}</div>
                      </div>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Matriz Extendida?:</strong>
                        <div style={{ marginTop: "2px" }}>{selected.matriz_extendida ? "SÍ" : "NO"}</div>
                      </div>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Perfil Completo?:</strong>
                        <div style={{ marginTop: "2px" }}>{(selected.mostrar_perfil_completo ?? selected.mostrar_perfil) ? "SÍ" : "NO"}</div>
                      </div>
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10px", textTransform: "uppercase" }}>¿Perfil Niveles?:</strong>
                        <div style={{ marginTop: "2px" }}>{selected.mostrar_perfil_niveles ? "SÍ" : "NO"}</div>
                      </div>
                    </div>

                    {selected.ubicacion_fija && (
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10.5px", textTransform: "uppercase" }}>Ubicación Fija / Predefinida:</strong>
                        <div style={{ marginTop: "2px" }}><code style={{ color: "var(--brand-lumo-gold)" }}>{selected.ubicacion_fija}</code></div>
                      </div>
                    )}

                    {selected.ubicacion_lista && (
                      <div>
                        <strong style={{ color: "var(--text-dim)", fontSize: "10.5px", textTransform: "uppercase" }}>Opciones de Lista de Ubicaciones:</strong>
                        <div style={{ marginTop: "2px", fontSize: "11.5px", color: "var(--text-muted)" }}>{selected.ubicacion_lista}</div>
                      </div>
                    )}

                    <div>
                      <strong style={{ color: "var(--text-dim)", fontSize: "10.5px", textTransform: "uppercase" }}>Observaciones Predefinidas en Tablet:</strong>
                      <div style={{ marginTop: "4px", fontSize: "11.5px", color: selected.observaciones_predefinidas ? "#fff" : "var(--text-dim)", fontStyle: selected.observaciones_predefinidas ? "normal" : "italic" }}>
                        {selected.observaciones_predefinidas || "Sin observaciones predefinidas."}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <strong style={{ color: "var(--text-dim)", fontSize: "10.5px", textTransform: "uppercase" }}>Estado Global:</strong>
                  <div style={{ marginTop: "4px" }}>
                    <span className={`state-tag ${selected.activa ? "operando" : "pendiente"}`}>
                      {selected.activa ? "Activa (Disponible en Tablets)" : "Inactiva"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>Selecciona una fila de la lista para ver sus detalles de configuración completos.</p>
            )}
          </div>
        </div>
      )}

      {/* MONITOREO DE CONECTIVIDAD DE TABLETS CON DIAGNÓSTICO EN TIEMPO REAL */}
      {(viewSection === "all" || viewSection === "tablets") && (
        <div className="clean-card" ref={tabletsSectionRef} style={{ marginTop: viewSection === "all" ? "12px" : "0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", color: "var(--brand-lumo-gold)" }}>Monitoreo & Diagnóstico de Terminales (Tablets)</h2>
              <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
                Diagnóstico en tiempo real de la conectividad bidireccional entre el servidor y cada tablet
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {onPingTablets && (
                <button 
                  className="btn-primary" 
                  onClick={onPingTablets} 
                  disabled={isPingingTablets} 
                  style={{ height: "32px", fontSize: "12px", gap: "6px" }}
                >
                  {isPingingTablets ? "⏳ Probando..." : "⚡ Probar Conexión Ahora"}
                </button>
              )}
              <button className="btn-secondary" onClick={refreshTablets} style={{ height: "32px", fontSize: "12px" }}>
                🔄 Actualizar
              </button>
            </div>
          </div>

          <table className="clean-table">
            <thead>
              <tr>
                <th>Tablet ID / Terminal</th>
                <th>Secadero Asignado</th>
                <th>IP Configurada</th>
                <th>IP Detectada (RX)</th>
                <th>Último Reporte Tablet → Servidor</th>
                <th>Ping Servidor → Tablet</th>
                <th>Última Vez Vista</th>
                <th>Estado Global</th>
              </tr>
            </thead>
            <tbody>
              {(tabletsStatus || []).length > 0 ? (
                tabletsStatus.map(t => {
                  const sec = (safeMasterData.secaderos || []).find(s => s.secadero_id === t.secadero_id);
                  const secName = sec ? sec.nombre : t.secadero_id || "Sin Asignar";

                  const lastRxDate = t.lastSeenRx || t.lastSeen;
                  const lastRxStr = formatTimestampSafe(lastRxDate, "Sin reportes");

                  const lastContactIso = t.lastContactIso || lastRxDate;
                  const lastGlobalStr = formatTimestampSafe(lastContactIso, "Nunca");

                  const pingStatus = t.lastPingStatus || "--";
                  const isPingOk = pingStatus === "OK" || pingStatus.includes("Host responde");
                  const latencyStr = t.lastPingLatencyMs != null ? `${t.lastPingLatencyMs} ms` : "--";

                  return (
                    <tr key={t.tablet_id || t.nombre || Math.random()}>
                      <td>
                        <strong>{t.nombre || "Tablet"}</strong>
                        <div style={{ fontSize: "10.5px", color: "var(--text-dim)" }}><code>{t.tablet_id}</code></div>
                      </td>
                      <td><strong style={{ color: "var(--brand-lumo)" }}>{secName}</strong></td>
                      <td><code>{t.ip_tablet || "--"}</code></td>
                      <td><code>{t.lastRxIp || t.lastIp || "--"}</code></td>
                      <td style={{ fontSize: "11.5px" }}>{lastRxStr}</td>
                      <td style={{ fontSize: "11.5px" }}>
                        <span style={{ color: isPingOk ? "var(--accent-emerald)" : "var(--accent-rose)", fontWeight: "600" }}>
                          {isPingOk ? "🟢 " : "🔴 "} {pingStatus}
                        </span>
                        {t.lastPingLatencyMs != null && (
                          <span style={{ fontSize: "10px", opacity: 0.75, marginLeft: "4px" }}>({latencyStr})</span>
                        )}
                      </td>
                      <td style={{ fontSize: "11.5px", fontWeight: "600" }}>{lastGlobalStr}</td>
                      <td>
                        <span className={`state-tag ${t.conectada ? "operando" : "parado"}`} style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                          {t.conectada ? "🟢 ONLINE" : "🟡 DESCONOCIDO"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                    No hay tablets registradas o no se pudo cargar la información de conectividad.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

