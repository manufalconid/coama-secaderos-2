import React from "react";

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
        <h2 className="stage-title">Declarar Parada [Paso 1 de 3]</h2>
        <p className="stage-subtitle">Selecciona el origen general de la detención</p>
      </div>
      <div className="origen-selection-grid">
        {origenes.map((o: any) => {
          const isSelected = o.origen_id === selectedOrigenId;
          return (
            <button
              key={o.origen_id}
              className={`choice-card origen-card ${isSelected ? "selected" : ""}`}
              onClick={() => handleSelectOrigen(o.origen_id)}
            >
              {o.nombre}
            </button>
          );
        })}
      </div>
      <div className="action-footer">
        <button className="btn-control danger" onClick={handleResetDeclarationFlow}>
          Cancelar / Volver
        </button>
      </div>
    </div>
  );
}
