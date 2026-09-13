import React, { useState, useMemo } from "react";
import TouchButton from "../TouchButton";
import { Plus, X, Search, HelpCircle } from "lucide-react";

interface RazonStageProps {
  allReasons: any[];
  reasonFrequencies?: Record<string, number>;
  selectedReasonId: string;
  handleSelectReason: (id: string) => void;
  onSuggestCustom: () => void;
  onCancelFlow: () => void;
}

export default function RazonStage({
  allReasons,
  reasonFrequencies = {},
  selectedReasonId,
  handleSelectReason,
  onSuggestCustom,
  onCancelFlow
}: RazonStageProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAndSortedReasons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    // Show all active reasons
    const filtered = (allReasons || []).filter((r: any) => {
      if (r.activa === false) return false;
      if (!query) return true;
      const nombreMatch = r.nombre?.toLowerCase().includes(query);
      const codigoMatch = r.codigo?.toLowerCase().includes(query);
      return nombreMatch || codigoMatch;
    });

    // Sort by frequency descending, then alphabetically by name
    return filtered.sort((a: any, b: any) => {
      const freqA = reasonFrequencies[a.razon_id] || 0;
      const freqB = reasonFrequencies[b.razon_id] || 0;
      if (freqB !== freqA) {
        return freqB - freqA;
      }
      return (a.nombre || "").localeCompare(b.nombre || "");
    });
  }, [allReasons, searchQuery, reasonFrequencies]);

  return (
    <div className="landscape-stage-wrapper">
      {/* AREA PRINCIPAL (IZQUIERDA / CENTRO) */}
      <div className="stage-main-area">
        {/* ENCABEZADO ULTRA-COMPACTO */}
        <div className="compact-stage-header">
          <div className="compact-stage-title">
            <span>TIEMPO MUERTO</span>
            <span className="required-asterisk">*</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>
            Paso 1 de 4 • Selecciona o busca el motivo
          </span>
        </div>

        {/* CONTENIDO DIVIDIDO EN 2 COLUMNAS (SPLIT VIEW) */}
        <div style={{ display: "flex", gap: "12px", flex: 1, height: "calc(100% - 48px)", overflow: "hidden" }}>
          {/* COLUMNA IZQUIERDA (~42%): BUSCADOR Y MOTIVO PERSONALIZADO */}
          <div
            style={{
              flex: "0 0 42%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
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
                gap: "6px"
              }}
            >
              <Search size={14} /> Búsqueda Predictiva
            </label>

            {/* Input del Buscador (SIN autoFocus) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "var(--bg-input)",
                border: "2px solid var(--brand-lumo-gold)",
                borderRadius: "8px",
                padding: "6px 10px",
                gap: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
              }}
            >
              <Search size={18} color="var(--brand-lumo-gold)" style={{ flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "15px",
                  fontWeight: "700"
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    borderRadius: "50%",
                    width: "22px",
                    height: "22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <p style={{ fontSize: "11.5px", color: "var(--text-muted)", lineHeight: "1.3" }}>
              💡 Escribe el código (ej: <strong>P032</strong>) o nombre para filtrar rápidamente a la derecha.
            </p>

            <div style={{ marginTop: "auto" }}>
              <TouchButton
                onConfirm={onSuggestCustom}
                confirmText="CONFIRMAR CREAR MOTIVO"
                className="btn-control secondary"
                style={{
                  width: "100%",
                  padding: "12px 10px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Plus size={15} /> Sugerir motivo personalizado (+)
              </TouchButton>
            </div>
          </div>

          {/* COLUMNA DERECHA (~58%): LISTADO COMPLETO ORDENADO POR FRECUENCIA */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              padding: "10px",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
                paddingBottom: "4px",
                borderBottom: "1px solid var(--border-subtle)"
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Todos los Tiempos Muertos ({filteredAndSortedReasons.length})
              </span>
            </div>

            {filteredAndSortedReasons.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--text-muted)" }}>
                <HelpCircle size={28} style={{ marginBottom: "6px", opacity: 0.5 }} />
                <p style={{ fontSize: "13px", fontWeight: "600" }}>Sin coincidencias para "{searchQuery}"</p>
                <button
                  onClick={onSuggestCustom}
                  style={{
                    marginTop: "8px",
                    background: "transparent",
                    border: "none",
                    color: "var(--brand-lumo-gold)",
                    fontWeight: "bold",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "12px"
                  }}
                >
                  + Sugerir motivo personalizado
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "8px",
                  overflowY: "auto",
                  paddingRight: "4px",
                  flex: 1
                }}
              >
                {filteredAndSortedReasons.map((r: any) => {
                  const isSelected = r.razon_id === selectedReasonId;

                  return (
                    <TouchButton
                      key={r.razon_id}
                      onConfirm={() => handleSelectReason(r.razon_id)}
                      confirmText="TOCA PARA SELECCIONAR"
                      className={`reason-list-item ${isSelected ? "selected" : ""}`}
                      style={{
                        padding: "10px 8px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        borderRadius: "6px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "4px",
                        border: isSelected
                          ? "2px solid var(--brand-lumo-gold)"
                          : "1px solid var(--border-subtle)",
                        background: isSelected
                          ? "rgba(250, 204, 21, 0.25)"
                          : "var(--bg-input)"
                      }}
                    >
                      {r.codigo && (
                        <span style={{ fontSize: "10.5px", color: "var(--brand-lumo-gold)", fontWeight: "800" }}>
                          {r.codigo}
                        </span>
                      )}
                      <span style={{ fontSize: "13px", color: "#fff", lineHeight: "1.2", wordBreak: "break-word" }}>
                        {r.nombre}
                      </span>
                    </TouchButton>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BARRA LATERAL ULTRA-COMPACTA DE ACCIONES (DERECHA, 135px) */}
      <div className="stage-sidebar-actions">
        <TouchButton
          onConfirm={onSuggestCustom}
          confirmText="CONFIRMAR MOTIVO"
          className="btn-control secondary btn-sidebar-square"
        >
          <Plus size={22} color="var(--brand-lumo-gold)" />
          <span>Sugerir</span>
        </TouchButton>

        <TouchButton
          onConfirm={onCancelFlow}
          confirmText="CONFIRMAR CANCELAR"
          className="btn-control danger btn-sidebar-square"
          style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--state-alert)" }}
        >
          <X size={24} />
          <span>Cancelar</span>
        </TouchButton>
      </div>
    </div>
  );
}
