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
    <div className="landscape-stage-wrapper">
      {/* AREA PRINCIPAL (IZQUIERDA / CENTRO) */}
      <div className="stage-main-area">
        {/* ENCABEZADO ULTRA-COMPACTO */}
        <div className="compact-stage-header">
          <div className="compact-stage-title">
            <span>CONFIRMACION</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
            Paso 5 de 5 • Resumen final antes de guardar
          </span>
        </div>

        {/* CONTENIDO RESUMEN COMPACTO (MODE APAISADO) */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "14px",
            overflowY: "auto"
          }}
        >
          {/* Motivo (Tiempo Muerto) */}
          <div
            style={{
              padding: "12px",
              borderRadius: "6px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--brand-lumo-gold)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", marginBottom: "3px" }}>
              <AlertTriangle size={13} color="var(--brand-lumo-gold)" />
              TIEMPO MUERTO (MOTIVO)
            </div>
            <div style={{ fontSize: "17px", fontWeight: "900", color: "var(--brand-lumo-gold)" }}>
              {finalReasonName || "NO DEFINIDO"}
            </div>
          </div>

          {/* Categoría (Origen) */}
          <div
            style={{
              padding: "12px",
              borderRadius: "6px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", marginBottom: "3px" }}>
              <AlertTriangle size={13} color="var(--text-muted)" />
              CATEGORÍA (ORIGEN)
            </div>
            <div style={{ fontSize: "17px", fontWeight: "bold", color: "#fff" }}>
              {origenName || "NO DEFINIDO"}
            </div>
          </div>

          {/* Ubicación (Si fue definida) */}
          {formUbicacion && (
            <div
              style={{
                gridColumn: "1 / -1",
                padding: "10px 12px",
                borderRadius: "6px",
                background: "rgba(250, 204, 21, 0.08)",
                border: "1px solid var(--brand-lumo-gold)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--brand-lumo-gold)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase" }}>
                <MapPin size={13} color="var(--brand-lumo-gold)" />
                UBICACIÓN:
              </div>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: "#fff" }}>
                {formUbicacion}
              </div>
            </div>
          )}

          {/* Observación */}
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "12px",
              borderRadius: "6px",
              background: "var(--bg-input)",
              border: "1px solid var(--border-subtle)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase", marginBottom: "3px" }}>
              <FileText size={13} color="var(--text-muted)" />
              OBSERVACIÓN
            </div>
            <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#fff", lineHeight: "1.3" }}>
              {formObservacion || "Sin observaciones adicionales"}
            </div>
          </div>

          {/* Duración */}
          <div
            style={{
              gridColumn: "1 / -1",
              padding: "12px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)", fontSize: "10.5px", fontWeight: 800, textTransform: "uppercase" }}>
              <Clock size={13} color="var(--brand-lumo-gold)" />
              DURACIÓN TOTAL:
            </div>
            <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--brand-lumo-gold)" }}>
              {formatSeconds(elapsedTime)}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA LATERAL ULTRA-COMPACTA DE ACCIONES (DERECHA, 135px) */}
      <div className="stage-sidebar-actions">
        <TouchButton
          onConfirm={handleConfirmSaveStoppage}
          confirmText="¡TOCA PARA GUARDAR!"
          className="btn-control primary btn-sidebar-square"
          style={{
            background: "var(--brand-lumo-gold)",
            color: "#000",
            boxShadow: "0 4px 16px rgba(250, 204, 21, 0.4)"
          }}
        >
          <CheckCircle2 size={26} color="#000" />
          <span>Guardar</span>
        </TouchButton>

        <TouchButton
          onConfirm={onBackToEdit}
          confirmText="TOCA PARA EDITAR"
          className="btn-control secondary btn-sidebar-square"
        >
          <ArrowLeft size={24} />
          <span>Volver</span>
        </TouchButton>
      </div>
    </div>
  );
}
