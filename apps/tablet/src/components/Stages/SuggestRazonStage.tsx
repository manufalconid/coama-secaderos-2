import React from "react";
import TouchButton from "../TouchButton";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface SuggestRazonStageProps {
  suggestedReasonName: string;
  setSuggestedReasonName: (name: string) => void;
  onSubmit: () => void;
  onGoBack: () => void;
}

export default function SuggestRazonStage({
  suggestedReasonName,
  setSuggestedReasonName,
  onSubmit,
  onGoBack
}: SuggestRazonStageProps) {
  const isSubmitDisabled = !suggestedReasonName.trim();

  return (
    <div className="stage-container">
      <div className="stage-title-block">
        <h2 className="stage-title">Sugerir Motivo Personalizado</h2>
        <p className="stage-subtitle">Escribe la razón no catalogada para esta detención</p>
      </div>
      
      <div className="form-panel" style={{ width: "100%", maxWidth: "600px" }}>
        <div className="form-field">
          <label className="form-label">Razón Sugerida *</label>
          <input
            type="text"
            required
            placeholder="Ej: Falla en cadena transportadora secundaria"
            value={suggestedReasonName}
            onChange={e => setSuggestedReasonName(e.target.value)}
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

        <div className="action-footer-fixed" style={{ marginTop: "24px", display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <TouchButton
            onConfirm={onGoBack}
            confirmText="CONFIRMAR VOLVER"
            className="btn-control secondary"
            style={{ width: "160px" }}
          >
            <ArrowLeft size={18} /> Volver
          </TouchButton>

          <TouchButton
            onConfirm={onSubmit}
            confirmText="CONFIRMAR CONTINUAR"
            disabled={isSubmitDisabled}
            className="btn-control primary"
            style={{
              flex: 1,
              maxWidth: "300px",
              opacity: isSubmitDisabled ? 0.5 : 1,
              cursor: isSubmitDisabled ? "not-allowed" : "pointer"
            }}
          >
            Continuar <ArrowRight size={18} />
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
