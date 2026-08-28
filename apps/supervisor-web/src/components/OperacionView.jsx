import React from "react";
import { Clock3, Tablet } from "lucide-react";

export default function OperacionView({ secaderos, totalDowntime = "0m", onSelectSecadero }) {
  return (
    <>
      <div className="main-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-0.5px" }}>Control Operacional de Planta</h1>
          <p style={{ color: "var(--text-dim)", fontSize: "12px", marginTop: "2px" }}>Monitoreo en tiempo real de los 3 secaderos</p>
        </div>

        {/* KPI DE TIEMPO MUERTO COMPACTO A LA DERECHA */}
        <div className="clean-card" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: "14px", background: "linear-gradient(135deg, #121212, rgba(250, 204, 21, 0.03))", borderColor: "rgba(250, 204, 21, 0.15)", minWidth: "260px" }}>
          <Clock3 size={20} style={{ color: "var(--brand-lumo)" }} />
          <div>
            <div className="kpi-clean-title" style={{ fontSize: "8.5px", margin: 0, color: "var(--text-dim)" }}>Tiempo muerto acumulado en el turno</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span className="kpi-clean-val" style={{ fontSize: "20px", color: "var(--brand-lumo)" }}>{totalDowntime}</span>
              <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>turno actual</span>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETAS DE LOS 3 SECADEROS DE PLANTA */}
      <div className="secaderos-3-grid">
        {secaderos.map(sec => {
          const isOmeco = sec.id === "sec-omeco";
          return (
            <div key={sec.id} className={`clean-card ${sec.estado === "PARADO" ? "card-live-alert" : ""}`}>
              <div className="secadero-card-top">
                <h3>{sec.nombre}</h3>
                
                {/* ESTADO + HACE CUANTO LO ESTÁ */}
                <span className={`state-tag ${(sec.estado === "SIN_TABLET" || sec.estado === "DESCONECTADO") ? "pendiente" : sec.estado.toLowerCase()}`}>
                  {sec.estado === "SIN_TABLET" ? (
                    "SIN TABLET"
                  ) : sec.estado === "DESCONECTADO" ? (
                    "DESCONECTADO"
                  ) : (
                    <>
                      {sec.estado}{" "}
                      {sec.duracionEstado && sec.duracionEstado !== "--" && (
                        <span style={{ fontSize: "9.5px", fontWeight: "400", opacity: 0.8, textTransform: "none", marginLeft: "4px" }}>
                          (hace {sec.duracionEstado})
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>

              {isOmeco ? (
                <div className="render-box">
                  <img src="/secadero-omeco.png" alt="Secadero OMECO" className="render-img" />
                </div>
              ) : (
                <div className="render-box" style={{ background: "transparent", minHeight: "120px" }}>
                  <Tablet size={32} color="var(--text-dim)" />
                  <span style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "6px" }}>Sin tablet asignada</span>
                </div>
              )}

              <div className="data-list" style={{ marginBottom: "18px" }}>
                <div className="data-item">
                  <span>Tiempo muerto acumulado en el turno:</span>
                  <strong style={{ color: "var(--brand-lumo)" }}>{sec.tiempoMuertoTurno}</strong>
                </div>
                <div className="data-item">
                  <span>Última Sync:</span>
                  <span style={{ fontSize: "11.5px" }}>{sec.ultimaComm}</span>
                </div>
              </div>

              <button className="btn-secondary" style={{ width: "100%" }} onClick={() => onSelectSecadero(sec.id)}>
                Ver Eventos & Alertas
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
