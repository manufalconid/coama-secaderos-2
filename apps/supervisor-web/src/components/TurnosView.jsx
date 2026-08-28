import React, { useState } from "react";

export default function TurnosView({ turnos }) {
  const [selectedTurno, setSelectedTurno] = useState(null);

  return (
    <>
      <div className="main-header">
        <div>
          <h1>Configuración de Turnos</h1>
          <p>Define los turnos operativos para la asignación de paradas y cálculo del Factor de Utilización</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        <div className="clean-card" style={{ padding: 0 }}>
          <table className="clean-table">
            <thead>
              <tr>
                <th>Nombre del Turno</th>
                <th>Horario</th>
                <th>Horas Prod.</th>
                <th>Descanso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {turnos.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "24px", color: "var(--text-dim)" }}>
                    No hay turnos configurados.
                  </td>
                </tr>
              ) : (
                turnos.map(t => (
                  <tr
                    key={t.turno_id}
                    style={{ cursor: "pointer", background: selectedTurno?.turno_id === t.turno_id ? "rgba(250,204,21,0.06)" : "" }}
                    onClick={() => setSelectedTurno(t)}
                  >
                    <td><strong>{t.nombre}</strong></td>
                    <td className="mono">{t.hora_inicio.slice(0, 5)} - {t.hora_fin.slice(0, 5)} hs</td>
                    <td>{t.horas_totales} hs</td>
                    <td>{t.horas_descanso} hs</td>
                    <td>
                      <span className={`state-tag ${t.activo ? "operando" : "pendiente"}`}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="clean-card">
          <h3 style={{ margin: "0 0 16px 0", fontSize: "15px" }}>Detalles del Turno</h3>
          {selectedTurno ? (
            <div style={{ display: "grid", gap: "16px", fontSize: "13px" }}>
              <div>
                <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Nombre del Turno:</strong>
                <div style={{ marginTop: "4px", fontSize: "14px", fontWeight: "bold" }}>{selectedTurno.nombre}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Hora de Inicio:</strong>
                  <div style={{ marginTop: "4px" }}>{selectedTurno.hora_inicio.slice(0, 5)} hs</div>
                </div>
                <div>
                  <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Hora de Fin:</strong>
                  <div style={{ marginTop: "4px" }}>{selectedTurno.hora_fin.slice(0, 5)} hs</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Horas Totales:</strong>
                  <div style={{ marginTop: "4px" }}>{selectedTurno.horas_totales} hs</div>
                </div>
                <div>
                  <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Horas Descanso:</strong>
                  <div style={{ marginTop: "4px" }}>{selectedTurno.horas_descanso} hs</div>
                </div>
              </div>
              <div>
                <strong style={{ color: "var(--text-dim)", fontSize: "11px", textTransform: "uppercase" }}>Estado:</strong>
                <div style={{ marginTop: "4px" }}>
                  <span className={`state-tag ${selectedTurno.activo ? "operando" : "pendiente"}`}>
                    {selectedTurno.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: "10px", padding: "10px", border: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.01)", borderRadius: "4px", fontSize: "12px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                💡 El horario y la vigencia de los turnos se editan únicamente en la planilla Excel para asegurar la consistencia del Factor de Utilización.
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-muted)" }}>Selecciona un turno de la lista para ver sus detalles de configuración.</p>
          )}
        </div>
      </div>
    </>
  );
}
