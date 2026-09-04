import React from "react";
import TouchButton from "../TouchButton";
import { ArrowLeft, ArrowRight, MessageSquare, PlusCircle } from "lucide-react";

interface ObservacionStageProps {
  origenName: string;
  razonName: string;
  suggestedReasonName: string;
  selectedReasonObj: any;
  formObservacion: string;
  setFormObservacion: (obs: string) => void;
  parsedPredefinedObservations: string[];
  onBack: () => void;
  onNext: () => void;
}

export default function ObservacionStage({
  origenName,
  razonName,
  suggestedReasonName,
  selectedReasonObj,
  formObservacion,
  setFormObservacion,
  parsedPredefinedObservations,
  onBack,
  onNext
}: ObservacionStageProps) {
  const isRequired = selectedReasonObj?.observacion_obligatoria;
  const isNextDisabled = isRequired && !formObservacion.trim();

  const handleSelectPredefined = (obs: string) => {
    setFormObservacion(obs);
  };

  return (
    <div className="stage-container">
      <div className="stage-title-block">
        <h2 className="stage-title">Observaciones de la Parada [Paso 3 de 4]</h2>
        <p className="stage-subtitle">
          Selecciona una opción predefinida o escribe una observación detallada
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "800px" }}>
        {/* Resumen del motivo seleccionado */}
        <div className="summary-grid" style={{ marginBottom: "20px" }}>
          <div className="summary-card">
            <span className="summary-label">ORIGEN SELECCIONADO</span>
            <span className="summary-value">{origenName || "--"}</span>
          </div>
          <div className="summary-card">
            <span className="summary-label">MOTIVO / RAZÓN</span>
            <span className="summary-value highlight">
              {suggestedReasonName ? `[Sug.] ${suggestedReasonName}` : razonName || "--"}
            </span>
          </div>
        </div>

        {/* Opciones predefinidas como botones grandes */}
        {parsedPredefinedObservations.length > 0 && (
          <div className="form-field" style={{ marginBottom: "20px" }}>
            <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <MessageSquare size={18} color="var(--brand-lumo-gold)" />
              <span>Opciones Predefinidas (Toca para seleccionar):</span>
            </label>
            <div className="choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", marginTop: "10px" }}>
              {parsedPredefinedObservations.map((obs: string) => {
                const isSelected = formObservacion === obs;
                return (
                  <TouchButton
                    key={obs}
                    onConfirm={() => handleSelectPredefined(obs)}
                    confirmText="TOCA PARA SELECCIONAR"
                    className={`choice-card ${isSelected ? "selected" : ""}`}
                    style={{
                      padding: "16px",
                      fontSize: "15px",
                      fontWeight: isSelected ? "bold" : "600",
                      textAlign: "center",
                      borderRadius: "6px",
                      border: isSelected ? "2px solid var(--brand-lumo-gold)" : "1px solid var(--border-subtle)",
                      background: isSelected ? "rgba(250, 204, 21, 0.2)" : "var(--bg-input)",
                      color: isSelected ? "#fff" : "var(--text-muted)"
                    }}
                  >
                    {obs}
                  </TouchButton>
                );
              })}
            </div>
          </div>
        )}

        {/* Detalle o Comentario Personalizado */}
        <div className="form-field">
          <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <PlusCircle size={18} color="var(--brand-lumo-gold)" />
              <span>Detallar Observación Personalizada {isRequired ? "(Obligatorio *)" : "(Opcional)"}</span>
            </span>
            {isRequired && !formObservacion.trim() && (
              <span style={{ color: "var(--state-alert)", fontSize: "12px", fontWeight: "bold" }}>
                Selecciona una opción o escribe un detalle *
              </span>
            )}
          </label>
          <input
            type="text"
            placeholder="Escribe aquí si deseas agregar más detalles de la falla o motivo..."
            value={formObservacion}
            onChange={e => setFormObservacion(e.target.value)}
            className="input-text"
            style={{
              fontSize: "16px",
              padding: "16px",
              borderRadius: "6px",
              width: "100%",
              marginTop: "8px",
              background: "var(--bg-input)",
              color: "#fff",
              border: "1px solid var(--border-subtle)"
            }}
          />
        </div>

        {/* Botones de navegación */}
        <div className="action-footer-fixed" style={{ marginTop: "28px", display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <TouchButton
            onConfirm={onBack}
            confirmText="CONFIRMAR VOLVER"
            className="btn-control secondary"
            style={{ width: "160px" }}
          >
            <ArrowLeft size={18} /> Volver
          </TouchButton>

          <TouchButton
            onConfirm={onNext}
            confirmText="CONFIRMAR SIGUIENTE"
            disabled={isNextDisabled}
            className="btn-control primary"
            style={{
              flex: 1,
              maxWidth: "320px",
              opacity: isNextDisabled ? 0.5 : 1,
              cursor: isNextDisabled ? "not-allowed" : "pointer"
            }}
          >
            Siguiente <ArrowRight size={18} />
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
