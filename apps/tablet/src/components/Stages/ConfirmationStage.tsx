import React from "react";
import TouchButton from "../TouchButton";
import { CheckCircle2, ArrowLeft, Clock, AlertTriangle, FileText, MapPin } from "lucide-react";

interface ConfirmationStageProps {
  origenName: string;
  razonName: string;
  suggestedReasonName: string;
  elapsedTime: number;
  formObservacion: string;
  formUbicacion: string;
  formatSeconds: (secs: number) => string;
  onBackToEdit: () => void;
  handleConfirmSaveStoppage: () => void;
}

export default function ConfirmationStage({
  origenName,
  razonName,
  suggestedReasonName,
  elapsedTime,
  formObservacion,
  formUbicacion,
  formatSeconds,
  onBackToEdit,
  handleConfirmSaveStoppage
}: ConfirmationStageProps) {
  const finalReasonName = suggestedReasonName ? `[Sug.] ${suggestedReasonName}` : razonName;

  return (
    <div className="stage-container" style={{ alignItems: "center" }}>
      <div className="stage-title-block" style={{ textAlign: "center" }}>
        <h2 className="stage-title" style={{ fontSize: "24px" }}>Resumen y Confirmación Final [Paso 4 de 4]</h2>
        <p className="stage-subtitle" style={{ fontSize: "15px" }}>
          Revisa el resumen de la detención antes de guardar el registro
        </p>
      </div>

      <div
        className="form-panel"
        style={{
          width: "100%",
          maxWidth: "680px",
          background: "var(--bg-card)",
          padding: "24px",
          borderRadius: "8px",
          border: "1px solid var(--border-subtle)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
        }}
      >
        {/* Tarjetas de Resumen Claras y Legibles */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
          
          {/* Categoría (Origen) */}
          <div
            style={{
              padding: "16px",
              borderRadius: "6px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-dim)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
              <AlertTriangle size={16} color="var(--brand-lumo-gold)" />
              CATEGORÍA (ORIGEN)
            </div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff" }}>
              {origenName || "NO DEFINIDO"}
            </div>
          </div>

          {/* Tiempo Muerto (Motivo) */}
          <div
            style={{
              padding: "16px",
              borderRadius: "6px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-dim)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
              <AlertTriangle size={16} color="var(--brand-lumo-gold)" />
              TIEMPO MUERTO (MOTIVO)
            </div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "var(--brand-lumo-gold)" }}>
              {finalReasonName || "NO DEFINIDO"}
            </div>
          </div>

          {/* Observación */}
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "16px",
              borderRadius: "6px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-dim)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
              <FileText size={16} color="var(--brand-lumo-gold)" />
              OBSERVACIÓN
            </div>
            <div style={{ fontSize: "16px", fontWeight: "600", color: "#fff", lineHeight: "1.4" }}>
              {formObservacion || "Sin observaciones adicionales"}
            </div>
          </div>

          {/* Ubicación (Si fue definida) */}
          {formUbicacion && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "16px",
                borderRadius: "6px",
                background: "rgba(250, 204, 21, 0.08)",
                border: "1px solid var(--brand-lumo-gold)"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--brand-lumo-gold)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", marginBottom: "6px" }}>
                <MapPin size={16} color="var(--brand-lumo-gold)" />
                UBICACIÓN EN SECADERO
              </div>
              <div style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>
                {formUbicacion}
              </div>
            </div>
          )}

          {/* Duración */}
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "16px",
              borderRadius: "6px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-dim)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>
              <Clock size={16} color="var(--brand-lumo-gold)" />
              DURACIÓN TOTAL PARADA:
            </div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--brand-lumo-gold)" }}>
              {formatSeconds(elapsedTime)}
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN: VOLVER (Mediano/Secundario) Y ACEPTAR (GIGANTE / Principal) */}
        <div style={{ display: "flex", gap: "16px", alignItems: "stretch", marginTop: "24px" }}>
          {/* Botón Volver para editar */}
          <TouchButton
            onConfirm={onBackToEdit}
            confirmText="TOCA DE NUEVO PARA VOLVER"
            className="btn-control secondary"
            style={{
              width: "160px",
              padding: "18px",
              fontSize: "15px",
              fontWeight: "bold",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <ArrowLeft size={20} /> Volver
          </TouchButton>

          {/* Botón Aceptar GIGANTE */}
          <TouchButton
            onConfirm={handleConfirmSaveStoppage}
            confirmText="¡TOCA DE NUEVO PARA GUARDAR PARADA!"
            className="btn-control primary"
            style={{
              flex: 1,
              padding: "22px",
              fontSize: "20px",
              fontWeight: 900,
              borderRadius: "8px",
              background: "var(--brand-lumo-gold)",
              color: "#000",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              boxShadow: "0 4px 20px rgba(250, 204, 21, 0.4)",
              cursor: "pointer"
            }}
          >
            <CheckCircle2 size={26} color="#000" /> ACEPTAR Y GUARDAR
          </TouchButton>
        </div>
      </div>
    </div>
  );
}
