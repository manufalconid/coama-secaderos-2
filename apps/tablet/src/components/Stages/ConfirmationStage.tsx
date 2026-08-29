import React from "react";
import { Save } from "lucide-react";

interface ConfirmationStageProps {
  assignedSecaderoName: string;
  origenName: string;
  razonName: string;
  suggestedReasonName: string;
  elapsedTime: number;
  selectedReasonObj: any;
  formObservacion: string;
  setFormObservacion: (obs: string) => void;
  formUbicacion: string;
  setFormUbicacion: (ub: string) => void;
  parsedPredefinedObservations: string[];
  formatSeconds: (secs: number) => string;
  handleResetDeclarationFlow: () => void;
  handleConfirmSaveStoppage: () => void;
}

export default function ConfirmationStage({
  assignedSecaderoName,
  origenName,
  razonName,
  suggestedReasonName,
  elapsedTime,
  selectedReasonObj,
  formObservacion,
  setFormObservacion,
  formUbicacion,
  setFormUbicacion,
  parsedPredefinedObservations,
  formatSeconds,
  handleResetDeclarationFlow,
  handleConfirmSaveStoppage
}) {
  const isObsRequired = selectedReasonObj?.observacion_obligatoria;
  const isUbicacionRequired = selectedReasonObj?.mostrar_perfil;
  const isSaveDisabled = !!(isObsRequired && (isUbicacionRequired ? !formUbicacion : !formObservacion));

  const handleSelectUbicacion = (val: string) => {
    if (formUbicacion === val) {
      if (!isSaveDisabled) {
        handleConfirmSaveStoppage();
      }
    } else {
      setFormUbicacion(val);
    }
  };

  const handleSelectObservation = (obs: string) => {
    if (formObservacion === obs) {
      if (!isSaveDisabled) {
        handleConfirmSaveStoppage();
      }
    } else {
      setFormObservacion(obs);
    }
  };

  return (
    <div className="stage-container">
      <div className="stage-title-block">
        <h2 className="stage-title">Confirmar Cierre de Parada [Paso 3 de 3]</h2>
        <p className="stage-subtitle">Verifica los datos de detención antes de guardar</p>
      </div>

      <div className="form-panel" style={{ width: "100%", maxWidth: "700px" }}>
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">MÁQUINA</span>
            <span className="summary-value">{assignedSecaderoName}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">ORIGEN</span>
            <span className="summary-value">{origenName}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">MOTIVO</span>
            <span className="summary-value highlight">
              {suggestedReasonName ? `[Sug.] ${suggestedReasonName}` : razonName}
            </span>
          </div>
          <div className="summary-card">
            <span className="summary-label">DURACIÓN</span>
            <span className="summary-value">{formatSeconds(elapsedTime)}</span>
          </div>
        </div>

        {isUbicacionRequired ? (
          <div className="form-field" style={{ marginTop: "16px" }}>
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Ubicación en el Secadero (Obligatorio)</span>
              {!formUbicacion && (
                <span style={{ color: "var(--state-alert)", fontSize: "12px" }}>Selecciona Entrada, Salida o Nivel/Puerta *</span>
              )}
            </label>
            
            <div className="secadero-profile-wrapper">
              <div className="secadero-overlay-layout">
                {/* Left: Entrada */}
                <div className="secadero-side-zone">
                  <button
                    type="button"
                    className={`secadero-zone-btn ${formUbicacion === "ENTRADA" ? "selected" : ""}`}
                    onClick={() => handleSelectUbicacion("ENTRADA")}
                  >
                    ENTRADA
                  </button>
                </div>

                {/* Center: Grid and Row Labels */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div className="secadero-grid-wrapper">
                    <div className="secadero-row-labels">
                      {[6, 5, 4, 3, 2, 1].map(lvl => (
                        <span key={lvl} className="secadero-row-label">N {lvl}</span>
                      ))}
                    </div>
                    
                    <div className="secadero-grid-container">
                      {[6, 5, 4, 3, 2, 1].map(lvl => {
                        return Array.from({ length: 13 }, (_, i) => i + 1).map(door => {
                          const val = `N${lvl}P${door}`;
                          const isSelected = formUbicacion === val;
                          return (
                            <button
                              key={`${lvl}-${door}`}
                              type="button"
                              className={`secadero-cell ${isSelected ? "selected" : ""}`}
                              onClick={() => handleSelectUbicacion(val)}
                              title={val}
                            />
                          );
                        });
                      })}
                    </div>

                    <div className="secadero-row-labels">
                      {[6, 5, 4, 3, 2, 1].map(lvl => (
                        <span key={lvl} className="secadero-row-label">N {lvl}</span>
                      ))}
                    </div>
                  </div>

                  {/* Column labels (Doors) */}
                  <div className="secadero-col-labels">
                    {Array.from({ length: 13 }, (_, i) => i + 1).map(door => (
                      <span key={door} className="secadero-col-label">{door}</span>
                    ))}
                  </div>
                </div>

                {/* Right: Salida */}
                <div className="secadero-side-zone">
                  <button
                    type="button"
                    className={`secadero-zone-btn ${formUbicacion === "SALIDA" ? "selected" : ""}`}
                    onClick={() => handleSelectUbicacion("SALIDA")}
                  >
                    SALIDA
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Comment for Layout reasons */}
            <div style={{ marginTop: "12px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Comentario Adicional (Opcional):</span>
              <input
                type="text"
                placeholder="Detalles sobre herramientas, repuestos, etc..."
                value={formObservacion}
                onChange={e => setFormObservacion(e.target.value)}
                className="input-text"
                style={{ fontSize: "16px", padding: "12px" }}
              />
            </div>
          </div>
        ) : parsedPredefinedObservations.length > 0 ? (
          <div className="form-field" style={{ marginTop: "16px" }}>
            <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Detalle / Observación {isObsRequired ? "(Obligatorio)" : "(Opcional)"}</span>
              {isObsRequired && !formObservacion && (
                <span style={{ color: "var(--state-alert)", fontSize: "12px" }}>Requerido *</span>
              )}
            </label>
            <div className="choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "10px", marginTop: "8px" }}>
              {parsedPredefinedObservations.map((obs: string) => {
                const isSelected = formObservacion === obs;
                return (
                  <button
                    key={obs}
                    type="button"
                    className={`choice-card ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectObservation(obs)}
                    style={{
                      padding: "14px",
                      fontSize: "15px",
                      fontWeight: isSelected ? "bold" : "normal",
                      border: isSelected ? "2px solid var(--brand-lumo)" : "1px solid var(--border-subtle)",
                      background: isSelected ? "rgba(250, 204, 21, 0.15)" : "var(--bg-input)",
                      color: isSelected ? "var(--text-main)" : "#fff"
                    }}
                  >
                    {obs}
                  </button>
                );
              })}
            </div>
            {!isObsRequired && (
              <div style={{ marginTop: "12px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>O escribe un comentario personalizado:</span>
                <input
                  type="text"
                  placeholder="Escribe un comentario..."
                  value={formObservacion}
                  onChange={e => setFormObservacion(e.target.value)}
                  className="input-text"
                  style={{ fontSize: "16px", padding: "12px" }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="form-field" style={{ marginTop: "16px" }}>
            <label className="form-label">Comentarios Adicionales (Opcional)</label>
            <input
              type="text"
              placeholder="Detalles sobre herramientas, repuestos, etc..."
              value={formObservacion}
              onChange={e => setFormObservacion(e.target.value)}
              className="input-text"
              style={{ fontSize: "16px", padding: "14px" }}
            />
          </div>
        )}

        <div className="action-footer-fixed" style={{ marginTop: "24px" }}>
          <button type="button" className="btn-control secondary" onClick={handleResetDeclarationFlow}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-control primary"
            disabled={isSaveDisabled}
            onClick={handleConfirmSaveStoppage}
            style={{
              opacity: isSaveDisabled ? 0.5 : 1,
              cursor: isSaveDisabled ? "not-allowed" : "pointer"
            }}
          >
            <Save size={18} /> Guardar Parada
          </button>
        </div>
      </div>
    </div>
  );
}
