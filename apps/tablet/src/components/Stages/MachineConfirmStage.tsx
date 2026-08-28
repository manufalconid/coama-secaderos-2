import React from "react";

interface MachineConfirmStageProps {
  secaderos: any[];
  secaderoId: string;
  onSelectMachine: (id: string) => void;
  inputUrl: string;
  setInputUrl: (url: string) => void;
  onConnect: (url: string) => void;
}

export default function MachineConfirmStage({
  secaderos,
  secaderoId,
  onSelectMachine,
  inputUrl,
  setInputUrl,
  onConnect
}) {
  return (
    <div className="stage-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div className="stage-title-block">
        <h2 className="stage-title">Asignar Secadero / Máquina</h2>
        <p className="stage-subtitle">Selecciona el secadero correspondiente a esta terminal</p>
      </div>
      
      {secaderos.length === 0 ? (
        <p style={{ color: "var(--state-warning)", margin: "20px 0" }}>No hay secaderos disponibles. Configura la IP del servidor abajo para conectar.</p>
      ) : (
        <div className="choice-grid" style={{ marginBottom: "30px" }}>
          {secaderos.map((s: any) => (
            <button
              key={s.secadero_id}
              className={`choice-card ${secaderoId === s.secadero_id ? "selected" : ""}`}
              onClick={() => onSelectMachine(s.secadero_id)}
            >
              {s.nombre}
            </button>
          ))}
        </div>
      )}

      <div className="clean-card" style={{ maxWidth: "480px", width: "100%", padding: "20px", border: "1px solid var(--border-subtle)", background: "rgba(255,255,255,0.01)" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700" }}>⚙️ Conexión al Servidor</h3>
        <div className="form-field" style={{ marginBottom: "16px" }}>
          <label className="form-label" style={{ fontSize: "12px", color: "var(--text-muted)" }}>URL del Servidor Supervisor (IP)</label>
          <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
            <input
              type="url"
              placeholder="http://192.168.10.15:8080"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              className="input-text"
              style={{ flex: 1, height: "38px", background: "var(--bg-input)", color: "#fff", border: "1px solid var(--border-subtle)", padding: "0 10px" }}
            />
            <button
              className="btn-primary"
              style={{ height: "38px", padding: "0 16px", fontSize: "13px" }}
              onClick={(e) => {
                e.preventDefault();
                onConnect(inputUrl.trim());
              }}
            >
              Conectar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
