import React from "react";
import { AlertTriangle, CheckCircle2, Clock3, Edit3 } from "lucide-react";

interface HistoryTabProps {
  eventHistory: any[];
  masterData: any;
  syncStatus: "online" | "offline";
  settings: any;
  isSyncing: boolean;
  forceSync: () => void;
  handleStartEdit: (item: any) => void;
  formatSeconds: (secs: number) => string;
}

export default function HistoryTab({
  eventHistory,
  masterData,
  syncStatus,
  settings,
  isSyncing,
  forceSync,
  handleStartEdit,
  formatSeconds
}) {
  return (
    <div className="stage-container" style={{ justifyContent: "flex-start", paddingTop: "20px" }}>
      <div className="stage-title-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", width: "100%" }}>
        <div>
          <h2 className="stage-title">Historial del Turno</h2>
          <p className="stage-subtitle">Registros locales almacenados en esta tablet</p>
        </div>
        <button
          type="button"
          className="btn-control secondary"
          onClick={() => forceSync()}
          disabled={isSyncing}
          style={{ width: "auto", padding: "8px 16px", height: "36px", fontSize: "13px" }}
        >
          {isSyncing ? "Sincronizando..." : "🔄 Sincronizar Ahora"}
        </button>
      </div>

      {/* DIAGNÓSTICO DE ENLACE RÁPIDO */}
      <div className="summary-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", width: "100%", marginBottom: "16px" }}>
        <div className="summary-card" style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "4px", background: "rgba(255, 255, 255, 0.02)" }}>
          <span className="summary-label" style={{ fontSize: "9px" }}>ENLACE DE RED</span>
          <span className="summary-value" style={{ fontSize: "14px", color: syncStatus === "online" ? "var(--state-ok)" : "var(--state-alert)" }}>
            {syncStatus === "online" ? "🟢 CONECTADO" : "🔴 DESCONECTADO"}
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            Servidor: <code>{settings.supervisorUrl}</code>
          </span>
        </div>
        <div className="summary-card" style={{ padding: "10px", display: "flex", flexDirection: "column", gap: "4px", background: "rgba(255, 255, 255, 0.02)" }}>
          <span className="summary-label" style={{ fontSize: "9px" }}>IDENTIFICACIÓN DE TERMINAL</span>
          <span className="summary-value" style={{ fontSize: "13px" }}>
            IP Tablet: <code>{masterData.detectedIp || "No detectada"}</code>
          </span>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            ID: <code>{settings.tabletId || "Sin ID"}</code> | Secadero: <code>{settings.secaderoId || "Ninguno"}</code>
          </span>
        </div>
      </div>
      
      {eventHistory.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={36} color="var(--text-dim)" />
          <p>No hay eventos registrados en este dispositivo.</p>
        </div>
      ) : (
        <div className="history-view">
          {eventHistory.map((item) => {
            const isClosed = item.estado_evento === "cerrado";
            const reasonObj = masterData.razones.find((r: any) => r.razon_id === item.razon_id);
            const originObj = masterData.origenes.find((o: any) => o.origen_id === item.origen_id);
            
            const startStr = new Date(item.fecha_hora_inicio).toLocaleTimeString("es-AR", {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div className="history-card-item" key={item.evento_id}>
                <div className="history-card-left">
                  <div className={`indicator-circle ${item.estado_evento}`}>
                    {isClosed ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}
                  </div>
                  <div className="history-card-info">
                    <span className="history-card-title">
                      {isClosed ? (
                        <>
                          {reasonObj ? reasonObj.nombre : (item.observacion.startsWith("[Sugerido]") ? "Razón Sugerida" : "Parada")}
                          {originObj && <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "normal" }}> ({originObj.nombre})</span>}
                        </>
                      ) : (
                        "Parada sin finalizar..."
                      )}
                    </span>
                    <span className="history-card-time">
                      Inicio: {startStr} {isClosed && item.duracion_segundos && `| Duración: ${formatSeconds(item.duracion_segundos)}`}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span className={`sync-status-badge ${item.sincronizado ? "sincronizado" : "pendiente"}`}>
                    {item.sincronizado ? "Sincro" : "Pendiente"}
                  </span>
                  <button className="btn-circle" style={{ width: "32px", height: "32px" }} onClick={() => handleStartEdit(item)}>
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
