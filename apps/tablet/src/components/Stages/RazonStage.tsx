import React from "react";
import TouchButton from "../TouchButton";
import { Plus, ArrowLeft } from "lucide-react";

interface RazonStageProps {
  filteredReasons: any[];
  selectedReasonId: string;
  handleSelectReason: (id: string) => void;
  onSuggestCustom: () => void;
  onGoBack: () => void;
}

export default function RazonStage({
  filteredReasons,
  selectedReasonId,
  handleSelectReason,
  onSuggestCustom,
  onGoBack
}: RazonStageProps) {
  return (
    <div className="stage-container fixed-stage">
      <div className="stage-title-block">
        <h2 className="stage-title">Declarar Parada [Paso 2 de 4]</h2>
        <p className="stage-subtitle">Selecciona el motivo (Tiempo Muerto) de la detención</p>
      </div>
      
      <div className="reasons-list-container">
        {filteredReasons.map((r: any) => {
          const isSelected = r.razon_id === selectedReasonId;
          return (
            <TouchButton
              key={r.razon_id}
              onConfirm={() => handleSelectReason(r.razon_id)}
              confirmText="TOCA DE NUEVO PARA ELEGIR MOTIVO"
              className={`reason-list-item ${isSelected ? "selected" : ""}`}
              style={{
                padding: "16px 20px",
                fontSize: "16px",
                fontWeight: "bold",
                borderRadius: "6px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {r.codigo && <span className="reason-item-code">{r.codigo}</span>}
                <span className="reason-item-name">{r.nombre}</span>
              </div>
            </TouchButton>
          );
        })}
      </div>

      <div className="action-footer-fixed" style={{ display: "flex", gap: "12px", justifyContent: "space-between" }}>
        <TouchButton
          onConfirm={onGoBack}
          confirmText="CONFIRMAR VOLVER"
          className="btn-control secondary back-btn"
          style={{ width: "180px" }}
        >
          <ArrowLeft size={16} /> Volver al Origen
        </TouchButton>

        <TouchButton
          onConfirm={onSuggestCustom}
          confirmText="CONFIRMAR MOTIVO PERSONALIZADO"
          className="btn-control secondary suggest-btn"
          style={{ flex: 1 }}
        >
          <Plus size={16} /> Sugerir motivo personalizado (+)
        </TouchButton>
      </div>
    </div>
  );
}
