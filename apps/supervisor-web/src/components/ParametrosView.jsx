import React from "react";
import { Tablet } from "lucide-react";

export default function ParametrosView({
  activeMaster,
  changeMaster,
  masterData,
  filteredRows,
  config,
  query,
  setQuery,
  categoryFilter,
  setCategoryFilter,
  selected,
  selectRow,
  onDownloadXlsx,
  onUploadXlsx,
  tabletsStatus,
  refreshTablets,
  MASTER_CONFIG
}) {
  return (
    <>
      <div className="main-header">
        <div>
          <h1>Parámetros del Sistema</h1>
          <p>Razones y orígenes configurados para el registro en las tablets</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {Object.entries(MASTER_CONFIG).map(([key, item]) => (
            <button key={key} className={key === activeMaster ? "btn-primary" : "btn-secondary"} onClick={() => changeMaster(key)}>
              {item.label}
            </button>
          ))}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
        <div className="clean-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar..."
                style={{ width: "220px", padding: "8px 12px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", fontSize: "13px" }}
              />
              {activeMaster === "razones" && (
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "2px", border: "1px solid var(--border-subtle)", background: "var(--bg-input)", color: "#fff", fontSize: "13px" }}
                >
                  <option value="">Todos los orígenes</option>
                  {(masterData?.origenes || []).map(o => (
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
              {filteredRows.map(row => {
                const parentNames = activeMaster === "razones"
                  ? (row.origen_ids || []).map(id => masterData.origenes.find(o => o.origen_id === id)?.nombre).filter(Boolean).join(", ")
                  : "";
                return (
                  <tr key={row[config.idField]} style={{ cursor: "pointer", background: selected?.[config.idField] === row[config.idField] ? "rgba(250,204,21,0.06)" : "" }} onClick={() => selectRow(row)}>
                    <td><strong>{row.nombre}</strong></td>
                    {activeMaster === "razones" && <td>{parentNames || "--"}</td>}
                    <td><span className={`state-tag ${row.activa ? "operando" : "pendiente"}`}>{row.activa ? "Activa" : "Inactiva"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="clean-card">
          <h3 style={{ margin: "0 0 16px 0", fontSize: "15px" }}>Detalles del Parámetro</h3>
          {selected ? (
            <div style={{ display: "grid", gap: "16px", fontSize: "13px" }}>
              <div>
                <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Nombre:</strong>
                <div style={{ marginTop: "4px", fontSize: "14px", fontWeight: "bold" }}>{selected.nombre}</div>
              </div>
              
              {activeMaster === "razones" && (
                <>
                  <div>
                    <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Orígenes Padres:</strong>
                    <div style={{ marginTop: "4px" }}>
                      {(selected.origen_ids || [])
                        .map(id => masterData.origenes.find(o => o.origen_id === id)?.nombre)
                        .filter(Boolean)
                        .join(", ") || "--"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>¿Obs. Obligatoria?:</strong>
                      <div style={{ marginTop: "4px" }}>{selected.observacion_obligatoria ? "SÍ" : "NO"}</div>
                    </div>
                    <div>
                      <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>¿Ubicación Obligatoria?:</strong>
                      <div style={{ marginTop: "4px" }}>{(selected.ubicacion_obligatoria ?? selected.mostrar_perfil) ? "SÍ" : "NO"}</div>
                    </div>
                    <div>
                      <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>¿Perfil Completo?:</strong>
                      <div style={{ marginTop: "4px" }}>{(selected.mostrar_perfil_completo ?? selected.mostrar_perfil) ? "SÍ" : "NO"}</div>
                    </div>
                    <div>
                      <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>¿Perfil Niveles?:</strong>
                      <div style={{ marginTop: "4px" }}>{selected.mostrar_perfil_niveles ? "SÍ" : "NO"}</div>
                    </div>
                  </div>
                  <div>
                    <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Observaciones Predefinidas:</strong>
                    <div style={{ marginTop: "4px" }}>{selected.observaciones_predefinidas || "--"}</div>
                  </div>
                </>
              )}

              <div>
                <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Estado:</strong>
                <div style={{ marginTop: "4px" }}>
                  <span className={`state-tag ${selected.activa ? "operando" : "pendiente"}`}>
                    {selected.activa ? "Activa" : "Inactiva"}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "10px", padding: "10px", border: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.01)", borderRadius: "4px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                💡 El catálogo de paradas y orígenes se edita únicamente en la planilla Excel para asegurar la consistencia en todas las tablets de la planta.
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>Selecciona una fila de la lista para ver sus detalles de configuración.</p>
          )}
        </div>
      </div>

      {/* MONITOREO DE CONECTIVIDAD DE TABLETS */}
      <div className="clean-card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "16px", color: "var(--brand-lumo-gold)" }}>Monitoreo de Terminales (Tablets)</h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--text-muted)" }}>
              Estado en tiempo real de las tablets de los secaderos conectadas a la red local
            </p>
          </div>
          <button className="btn-secondary" onClick={refreshTablets} style={{ height: "32px", fontSize: "12px" }}>
            🔄 Actualizar Conexiones
          </button>
        </div>

        <table className="clean-table">
          <thead>
            <tr>
              <th>Tablet ID</th>
              <th>Secadero Asignado</th>
              <th>Nombre de Terminal</th>
              <th>IP Configurada</th>
              <th>Última IP Detectada</th>
              <th>Última Conexión</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {tabletsStatus && tabletsStatus.length > 0 ? (
              tabletsStatus.map(t => {
                const sec = masterData.secaderos?.find(s => s.secadero_id === t.secadero_id);
                const secName = sec ? sec.nombre : t.secadero_id || "Sin Asignar";
                const lastSeenStr = t.lastSeen 
                  ? new Date(t.lastSeen).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " (" + new Date(t.lastSeen).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) + ")"
                  : "Sin reportes";
                
                return (
                  <tr key={t.tablet_id}>
                    <td><code>{t.tablet_id}</code></td>
                    <td><strong>{secName}</strong></td>
                    <td>{t.nombre}</td>
                    <td><code>{t.ip_tablet || "--"}</code></td>
                    <td><code>{t.lastIp || "--"}</code></td>
                    <td>{lastSeenStr}</td>
                    <td>
                      <span className={`state-tag ${t.conectada ? "operando" : "parado"}`} style={{ padding: "4px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "700" }}>
                        {t.conectada ? "🟢 ONLINE" : "🔴 OFFLINE"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                  No hay tablets registradas o no se pudo cargar la información de conectividad.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
