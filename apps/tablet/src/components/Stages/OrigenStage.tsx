import React from "react";
import TouchButton from "../TouchButton";
import { ArrowLeft, Tag } from "lucide-react";

interface OrigenStageProps {
  origenes: any[];
  selectedOrigenId: string;
  selectedReasonName?: string;
  handleSelectOrigen: (id: string) => void;
  onGoBack: () => void;
}

export default function OrigenStage({
  origenes,
  selectedOrigenId,
  selectedReasonName,
  handleSelectOrigen,
  onGoBack
}: OrigenStageProps) {
  return (
    <div className="landscape-stage-wrapper">
      {/* AREA PRINCIPAL (IZQUIERDA / CENTRO) */}
      <div className="stage-main-area">
        {/* ENCABEZADO ULTRA-COMPACTO */}
        <div className="compact-stage-header">
          <div className="compact-stage-title">
            <span>CATEGORIA</span>
            <span className="required-asterisk">*</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
            Paso 2 de 4 • Selecciona la categoría del evento
          </span>
        </div>

        {selectedReasonName && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(250, 204, 21, 0.1)",
              border: "1px solid var(--brand-lumo-gold)",
              padding: "4px 12px",
              borderRadius: "16px",
              color: "var(--brand-lumo-gold)",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "10px",
              width: "fit-content"
            }}
          >
            <Tag size={13} /> Motivo: {selectedReasonName}
          </div>
        )}

        {/* GRID DE CATEGORIAS EN MODO APAISADO */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: "10px",
            flex: 1,
            alignContent: "center",
            padding: "4px 0"
          }}
        >
          {origenes.map((o: any) => {
            const isSelected = o.origen_id === selectedOrigenId;
            return (
              <TouchButton
                key={o.origen_id}
                onConfirm={() => handleSelectOrigen(o.origen_id)}
                confirmText="TOCA PARA ELEGIR CATEGORÍA"
                className={`choice-card origen-card ${isSelected ? "selected" : ""}`}
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  padding: "16px 12px",
                  borderRadius: "8px",
                  border: isSelected
                    ? "2px solid var(--brand-lumo-gold)"
                    : "1px solid var(--border-subtle)",
                  background: isSelected
                    ? "rgba(250, 204, 21, 0.2)"
                    : "var(--bg-card)"
                }}
              >
                {o.nombre}
              </TouchButton>
            );
          })}
        </div>
      </div>

      {/* BARRA LATERAL ULTRA-COMPACTA DE ACCIONES (DERECHA, 135px) */}
      <div className="stage-sidebar-actions" style={{ justifyContent: "flex-end" }}>
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
