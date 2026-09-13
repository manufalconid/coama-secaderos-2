import React from "react";
import TouchButton from "../TouchButton";
import { ArrowLeft, ArrowRight, MessageSquare, PlusCircle, Tag } from "lucide-react";

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

  const finalReasonName = suggestedReasonName ? `[Sug.] ${suggestedReasonName}` : razonName;

  return (
    <div className="landscape-stage-wrapper">
      {/* AREA PRINCIPAL (IZQUIERDA / CENTRO) */}
      <div className="stage-main-area">
        {/* ENCABEZADO ULTRA-COMPACTO */}
        <div className="compact-stage-header">
          <div className="compact-stage-title">
            <span>OBSERVACION</span>
            {isRequired ? (
              <span className="required-asterisk">*</span>
            ) : (
              <span className="optional-badge">(Opcional)</span>
            )}
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
            Paso 4 de 4 • Agrega detalles de la detención
          </span>
        </div>

        {/* ETIQUETA COMPACTA RESUMEN */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(250, 204, 21, 0.08)",
              border: "1px solid rgba(250, 204, 21, 0.3)",
              padding: "4px 10px",
              borderRadius: "6px",
              color: "var(--brand-lumo-gold)",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            <Tag size={13} /> Motivo: {finalReasonName || "--"}
          </div>
          {origenName && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                padding: "4px 10px",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12px",
                fontWeight: "600"
              }}
            >
              Categoría: {origenName}
            </div>
          )}
        </div>

        {/* CONTENIDO DIVIDIDO EN 2 COLUMNAS (LAYOUT APAISADO) */}
        <div style={{ display: "flex", gap: "12px", flex: 1, overflow: "hidden" }}>
          {/* COLUMNA IZQUIERDA: OPCIONES PREDEFINIDAS */}
          {parsedPredefinedObservations.length > 0 && (
            <div
              style={{
                flex: "0 0 48%",
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                padding: "10px",
                overflow: "hidden"
              }}
            >
              <label
                style={{
                  fontSize: "11.5px",
                  fontWeight: "800",
                  color: "var(--brand-lumo-gold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "6px"
                }}
              >
                <MessageSquare size={13} /> Opciones Predefinidas
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "6px",
                  overflowY: "auto",
                  paddingRight: "4px",
                  flex: 1
                }}
              >
                {parsedPredefinedObservations.map((obs: string) => {
                  const isSelected = formObservacion === obs;
                  return (
                    <TouchButton
                      key={obs}
                      onConfirm={() => handleSelectPredefined(obs)}
                      confirmText="TOCA PARA SELECCIONAR"
                      className={`choice-card ${isSelected ? "selected" : ""}`}
                      style={{
                        padding: "10px 8px",
                        fontSize: "12.5px",
                        fontWeight: isSelected ? "bold" : "600",
                        textAlign: "center",
                        borderRadius: "6px",
                        border: isSelected
                          ? "2px solid var(--brand-lumo-gold)"
                          : "1px solid var(--border-subtle)",
                        background: isSelected
                          ? "rgba(250, 204, 21, 0.2)"
                          : "var(--bg-input)",
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

          {/* COLUMNA DERECHA / PRINCIPAL: TEXTO PERSONALIZADO */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "12px"
            }}
          >
            <label
              style={{
                fontSize: "11.5px",
                fontWeight: "800",
                color: "var(--brand-lumo-gold)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "6px"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <PlusCircle size={13} /> Detalle Personalizado
              </span>
              {isRequired && !formObservacion.trim() && (
                <span style={{ color: "var(--state-alert)", fontSize: "11px", fontWeight: "bold" }}>
                  * Requerido
                </span>
              )}
            </label>

            <textarea
              placeholder="Escribe aquí si deseas agregar más detalles..."
              value={formObservacion}
              onChange={(e) => setFormObservacion(e.target.value)}
              style={{
                width: "100%",
                flex: 1,
                minHeight: "100px",
                background: "var(--bg-input)",
                color: "#fff",
                fontSize: "14.5px",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid var(--border-subtle)",
                outline: "none",
                resize: "none"
              }}
            />
          </div>
        </div>
      </div>

      {/* BARRA LATERAL ULTRA-COMPACTA DE ACCIONES (DERECHA, 135px) */}
      <div className="stage-sidebar-actions">
        <TouchButton
          onConfirm={onNext}
          confirmText="CONFIRMAR SIGUIENTE"
          disabled={isNextDisabled}
          className="btn-control primary btn-sidebar-square"
          style={{
            opacity: isNextDisabled ? 0.5 : 1,
            cursor: isNextDisabled ? "not-allowed" : "pointer"
          }}
        >
          <ArrowRight size={24} />
          <span>Siguiente</span>
        </TouchButton>

        <TouchButton
          onConfirm={onBack}
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
