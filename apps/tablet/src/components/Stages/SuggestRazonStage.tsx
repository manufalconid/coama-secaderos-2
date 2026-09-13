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
    <div className="landscape-stage-wrapper">
      {/* AREA PRINCIPAL (IZQUIERDA / CENTRO) */}
      <div className="stage-main-area">
        {/* ENCABEZADO ULTRA-COMPACTO */}
        <div className="compact-stage-header">
          <div className="compact-stage-title">
            <span>TIEMPO MUERTO (PERSONALIZADO)</span>
            <span className="required-asterisk">*</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
            Escribe la razón no catalogada
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: "600px" }}>
          <label style={{ fontSize: "12px", fontWeight: "800", color: "var(--brand-lumo-gold)", textTransform: "uppercase", marginBottom: "6px" }}>
            Nombre del Motivo Personalizado *
          </label>
          <input
            type="text"
            required
            placeholder="Ej: Falla en cadena transportadora secundaria"
            value={suggestedReasonName}
            onChange={e => setSuggestedReasonName(e.target.value)}
            className="input-text"
            style={{
              fontSize: "17px",
              padding: "14px",
              borderRadius: "8px",
              width: "100%",
              background: "var(--bg-input)",
              color: "#fff",
              border: "2px solid var(--brand-lumo-gold)",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* BARRA LATERAL ULTRA-COMPACTA DE ACCIONES (DERECHA, 135px) */}
      <div className="stage-sidebar-actions">
        <TouchButton
          onConfirm={onSubmit}
          confirmText="CONFIRMAR CONTINUAR"
          disabled={isSubmitDisabled}
          className="btn-control primary btn-sidebar-square"
          style={{
            opacity: isSubmitDisabled ? 0.5 : 1,
            cursor: isSubmitDisabled ? "not-allowed" : "pointer"
          }}
        >
          <ArrowRight size={24} />
          <span>Siguiente</span>
        </TouchButton>

        <TouchButton
          onConfirm={onGoBack}
          confirmText="CONFIRMAR VOLVER"
          className="btn-control secondary btn-sidebar-square"
        >
          <ArrowLeft size={24} />
          <span>Volver</span>
        </TouchButton>
      </div>
    </div>
  );
}
