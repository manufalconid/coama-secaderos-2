import React from "react";
import TouchButton from "../TouchButton";
import { X } from "lucide-react";

interface OrigenStageProps {
  origenes: any[];
  selectedOrigenId: string;
  handleSelectOrigen: (id: string) => void;
  handleResetDeclarationFlow: () => void;
}

export default function OrigenStage({
  origenes,
  selectedOrigenId,
  handleSelectOrigen,
  handleResetDeclarationFlow
}: OrigenStageProps) {
  return (
    <div className="stage-container fixed-stage">
      <div className="stage-title-block">
        <h2 className="stage-title">Declarar Parada [Paso 1 de 4]</h2>
        <p className="stage-subtitle">Selecciona el origen (Categoría) de la detención</p>
      </div>
      <div className="origen-selection-grid">
        {origenes.map((o: any) => {
          const isSelected = o.origen_id === selectedOrigenId;
          return (
            <TouchButton
              key={o.origen_id}
              onConfirm={() => handleSelectOrigen(o.origen_id)}
              confirmText="TOCA DE NUEVO PARA ELEGIR ORIGEN"
              className={`choice-card origen-card ${isSelected ? "selected" : ""}`}
              style={{
                fontSize: "18px",
                fontWeight: "bold",
                padding: "24px 16px",
                borderRadius: "8px"
              }}
            >
              {o.nombre}
            </TouchButton>
          );
        })}
      </div>
      <div className="action-footer">
        <TouchButton
          onConfirm={handleResetDeclarationFlow}
          confirmText="CONFIRMAR CANCELAR"
          className="btn-control danger"
          style={{ width: "200px" }}
        >
          <X size={18} /> Cancelar
        </TouchButton>
      </div>
    </div>
  );
}
