import React from "react";
import { CheckCircle2 } from "lucide-react";

interface SuggestRazonStageProps {
  suggestedReasonName: string;
  setSuggestedReasonName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGoBack: () => void;
}

export default function SuggestRazonStage({
  suggestedReasonName,
  setSuggestedReasonName,
  onSubmit,
  onGoBack
}) {
  return (
    <div className="stage-container">
      <div className="stage-title-block">
        <h2 className="stage-title">Sugerir Motivo de Parada</h2>
        <p className="stage-subtitle">Escribe la razón personalizada para enviar al supervisor</p>
      </div>
      
      <form onSubmit={onSubmit} className="form-panel">
        <div className="form-field">
          <label className="form-label">Razón Sugerida *</label>
          <input
            type="text"
            required
            placeholder="Ej: Falla en cadena transportadora secundaria"
            value={suggestedReasonName}
            onChange={e => setSuggestedReasonName(e.target.value)}
            className="input-text"
          />
        </div>

        <div className="action-footer-fixed" style={{ marginTop: "16px" }}>
          <button type="button" className="btn-control secondary" onClick={onGoBack}>
            Volver
          </button>
          <button type="submit" className="btn-control primary">
            Continuar <CheckCircle2 size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
