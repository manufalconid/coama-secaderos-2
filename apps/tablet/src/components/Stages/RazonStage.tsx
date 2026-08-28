import React from "react";
import { Plus } from "lucide-react";

interface RazonStageProps {
  filteredReasons: any[];
  handleSelectReason: (id: string) => void;
  onSuggestCustom: () => void;
  onGoBack: () => void;
}

export default function RazonStage({
  filteredReasons,
  handleSelectReason,
  onSuggestCustom,
  onGoBack
}) {
  return (
    <div className="stage-container fixed-stage">
      <div className="stage-title-block">
        <h2 className="stage-title">Declarar Parada [Paso 2 de 3]</h2>
        <p className="stage-subtitle">Selecciona el motivo específico de la detención</p>
      </div>
      
      <div className="reasons-list-container">
        {filteredReasons.map((r: any) => (
          <button
            key={r.razon_id}
            className="reason-list-item"
            onClick={() => handleSelectReason(r.razon_id)}
          >
            {r.codigo && <span className="reason-item-code">{r.codigo}</span>}
            <span className="reason-item-name">{r.nombre}</span>
          </button>
        ))}
      </div>

      <div className="action-footer-fixed">
        <button
          className="btn-control secondary suggest-btn"
          onClick={onSuggestCustom}
        >
          <Plus size={16} /> Sugerir motivo personalizado (+)
        </button>
        <button className="btn-control secondary back-btn" onClick={onGoBack}>
          Volver al Origen
        </button>
      </div>
    </div>
  );
}
